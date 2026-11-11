// ===== Verbindung zu PocketBase =====
// Adresse unseres lokalen PocketBase-Servers
const pb = new PocketBase('http://127.0.0.1:8090');

// Name der Collection, in der die Einträge liegen
const COLLECTION = 'verarbeitungen';

// ===== Übersetzungen: gespeicherter Wert -> lesbarer Text =====
const RECHTSGRUNDLAGEN = {
  a: 'Art. 6 Abs. 1 lit. a – Einwilligung',
  b: 'Art. 6 Abs. 1 lit. b – Vertrag',
  c: 'Art. 6 Abs. 1 lit. c – Rechtliche Verpflichtung',
  d: 'Art. 6 Abs. 1 lit. d – Lebenswichtige Interessen',
  e: 'Art. 6 Abs. 1 lit. e – Öffentliche Aufgabe',
  f: 'Art. 6 Abs. 1 lit. f – Berechtigtes Interesse'
};

const STATUS_TEXTE = {
  entwurf: 'Entwurf',
  aktiv: 'Aktiv',
  geprueft: 'Geprüft'
};

// ===== Elemente aus dem HTML holen =====
const liste = document.getElementById('liste');
const formular = document.getElementById('formular');
const formularTitel = document.getElementById('formular-titel');
const abbrechenButton = document.getElementById('abbrechen-button');
const suchfeld = document.getElementById('suche');
const statusFilter = document.getElementById('status-filter');

// Text- und Auswahlfelder: Name in PocketBase = id im HTML
const FELDER = [
  'bezeichnung', 'zweck', 'rechtsgrundlage', 'betroffene_personen',
  'datenkategorien', 'empfaenger', 'loeschfrist', 'abteilung', 'status'
];

// Alle geladenen Einträge merken wir uns hier (für Bearbeiten, Suche und Filter)
let alleEintraege = [];

// id des Eintrags, der gerade bearbeitet wird (null = neuer Eintrag)
let bearbeiteteId = null;


// ===== Hilfsfunktionen =====

// Schützt vor XSS: Sonderzeichen wie < und > werden unschädlich gemacht,
// damit eingegebener Text nie als HTML-Code ausgeführt wird
function sicher(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Wandelt das PocketBase-Datum (z. B. "2026-11-11 20:09:13.000Z") in "11.11.2026" um
function datumFormatieren(datum) {
  if (!datum) return '–';
  return new Date(datum.replace(' ', 'T')).toLocaleDateString('de-DE');
}

// Prüft, ob die letzte Prüfung länger als 12 Monate zurückliegt
function pruefungUeberfaellig(datum) {
  // Ohne Datum gibt es nichts zu vergleichen
  if (!datum) return false;

  // Grenze berechnen: heute vor genau einem Jahr
  const grenze = new Date();
  grenze.setFullYear(grenze.getFullYear() - 1);

  // Liegt die letzte Prüfung vor dieser Grenze?
  return new Date(datum.replace(' ', 'T')) < grenze;
}

// Erzeugt eine Zeile "Titel: Wert" für die Detailansicht einer Karte
function zeile(titel, wert) {
  return `<div><strong>${titel}:</strong> ${sicher(wert) || '–'}</div>`;
}


// ===== Einträge von PocketBase laden =====
async function eintraegeLaden() {
  try {
    // Alle Einträge holen, alphabetisch nach Bezeichnung sortiert
    alleEintraege = await pb.collection(COLLECTION).getFullList({
      sort: 'bezeichnung'
    });
    statistikAktualisieren();
    filterAnwenden();
  } catch (fehler) {
    // Falls z. B. PocketBase nicht läuft
    console.error('Fehler beim Laden:', fehler);
    liste.innerHTML = '<p class="leer">Einträge konnten nicht geladen werden. Läuft PocketBase?</p>';
  }
}


// ===== Einträge als Karten in die Seite schreiben =====
function listeAnzeigen(eintraege) {
  // Sonderfall: keine Einträge
  if (eintraege.length === 0) {
    liste.innerHTML = '<p class="leer">Keine Einträge gefunden.</p>';
    return;
  }

  // Aus jedem Eintrag ein Stück HTML machen und alles zusammenfügen
  liste.innerHTML = eintraege.map(eintrag => `
    <article class="eintrag">
      <div class="eintrag-kopf">
        <h3>${sicher(eintrag.bezeichnung)}</h3>
        <span class="badge badge-${eintrag.status}">${STATUS_TEXTE[eintrag.status]}</span>
      </div>

      ${pruefungUeberfaellig(eintrag.letzte_pruefung)
        ? '<p class="hinweis">⚠️ Letzte Prüfung liegt über 12 Monate zurück</p>'
        : ''}

      <div class="eintrag-details">
        ${zeile('Zweck', eintrag.zweck)}
        ${zeile('Rechtsgrundlage', RECHTSGRUNDLAGEN[eintrag.rechtsgrundlage])}
        ${zeile('Betroffene Personen', eintrag.betroffene_personen)}
        ${zeile('Datenkategorien', eintrag.datenkategorien)}
        ${zeile('Empfänger', eintrag.empfaenger)}
        ${zeile('Drittlandübermittlung', eintrag.drittland ? 'Ja' : 'Nein')}
        ${zeile('Löschfrist', eintrag.loeschfrist)}
        ${zeile('Abteilung', eintrag.abteilung)}
        ${zeile('Letzte Prüfung', datumFormatieren(eintrag.letzte_pruefung))}
      </div>

      <div class="eintrag-aktionen">
        <button type="button" class="button-sekundaer" data-aktion="bearbeiten" data-id="${eintrag.id}">Bearbeiten</button>
        <button type="button" class="button-gefahr" data-aktion="loeschen" data-id="${eintrag.id}">Löschen</button>
      </div>
    </article>
  `).join('');
}


// ===== Formular-Hilfsfunktionen =====

// Liest alle Eingaben aus dem Formular und gibt sie als Objekt zurück
function formularAuslesen() {
  const daten = {};

  for (const feld of FELDER) {
    daten[feld] = document.getElementById(feld).value.trim();
  }

  // Checkbox: entscheidend ist "checked" (true/false), nicht "value"
  daten.drittland = document.getElementById('drittland').checked;

  // Datum: Das Feld liefert "2026-11-11", PocketBase speichert Datum mit Uhrzeit
  const datum = document.getElementById('letzte_pruefung').value;
  daten.letzte_pruefung = datum ? datum + ' 00:00:00.000Z' : '';

  return daten;
}

// Schreibt einen vorhandenen Eintrag ins Formular (zum Bearbeiten)
function formularFuellen(eintrag) {
  for (const feld of FELDER) {
    document.getElementById(feld).value = eintrag[feld];
  }
  document.getElementById('drittland').checked = eintrag.drittland;

  // Aus "2026-11-11 20:09:13.000Z" nur die ersten 10 Zeichen nehmen: "2026-11-11"
  document.getElementById('letzte_pruefung').value = eintrag.letzte_pruefung.slice(0, 10);
}

// Leert das Formular und wechselt zurück in den Modus "Neu anlegen"
function formularZuruecksetzen() {
  formular.reset();
  bearbeiteteId = null;
  formularTitel.textContent = 'Neue Verarbeitungstätigkeit';
  abbrechenButton.hidden = true;
}


// ===== Speichern: neu anlegen oder bestehenden Eintrag ändern =====
formular.addEventListener('submit', async (event) => {
  // Verhindert, dass der Browser die Seite neu lädt
  event.preventDefault();

  const daten = formularAuslesen();

  try {
    if (bearbeiteteId) {
      await pb.collection(COLLECTION).update(bearbeiteteId, daten);
    } else {
      await pb.collection(COLLECTION).create(daten);
    }
    formularZuruecksetzen();
    await eintraegeLaden();
  } catch (fehler) {
    console.error('Fehler beim Speichern:', fehler);
    alert('Speichern fehlgeschlagen. Bitte Eingaben prüfen.');
  }
});


// ===== Klicks auf "Bearbeiten" und "Löschen" in der Liste =====
liste.addEventListener('click', async (event) => {
  // Wurde ein Button angeklickt? Wenn nicht: nichts tun
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  const eintrag = alleEintraege.find(e => e.id === id);

  // --- Bearbeiten: Eintrag ins Formular laden ---
  if (button.dataset.aktion === 'bearbeiten') {
    formularFuellen(eintrag);
    bearbeiteteId = id;
    formularTitel.textContent = 'Verarbeitungstätigkeit bearbeiten';
    abbrechenButton.hidden = false;
    formular.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Löschen: erst nachfragen, dann löschen ---
  if (button.dataset.aktion === 'loeschen') {
    if (!confirm(`„${eintrag.bezeichnung}" wirklich löschen?`)) return;

    try {
      await pb.collection(COLLECTION).delete(id);
      // Falls genau dieser Eintrag gerade bearbeitet wurde: Formular leeren
      if (bearbeiteteId === id) formularZuruecksetzen();
      await eintraegeLaden();
    } catch (fehler) {
      console.error('Fehler beim Löschen:', fehler);
      alert('Löschen fehlgeschlagen.');
    }
  }
});


// ===== Abbrechen: Bearbeiten beenden =====
abbrechenButton.addEventListener('click', formularZuruecksetzen);


// ===== Übersicht: Einträge pro Status zählen =====
function statistikAktualisieren() {
  // Kleine Hilfsfunktion: Wie viele Einträge haben diesen Status?
  const anzahl = (status) => alleEintraege.filter(e => e.status === status).length;

  document.getElementById('anzahl-gesamt').textContent = alleEintraege.length;
  document.getElementById('anzahl-entwurf').textContent = anzahl('entwurf');
  document.getElementById('anzahl-aktiv').textContent = anzahl('aktiv');
  document.getElementById('anzahl-geprueft').textContent = anzahl('geprueft');
}


// ===== Suche und Statusfilter =====
// Zeigt nur die Einträge an, die zu Suchbegriff und Status passen
function filterAnwenden() {
  const suchbegriff = suchfeld.value.trim().toLowerCase();
  const status = statusFilter.value;

  const gefiltert = alleEintraege.filter(eintrag => {
    // Passt der Status? Leerer Wert bedeutet "Alle Status"
    const statusPasst = status === '' || eintrag.status === status;

    // Alle durchsuchbaren Texte zu einem langen Text zusammenfügen
    const text = [
      eintrag.bezeichnung,
      eintrag.zweck,
      eintrag.betroffene_personen,
      eintrag.datenkategorien,
      eintrag.empfaenger,
      eintrag.abteilung
    ].join(' ').toLowerCase();

    // Kommt der Suchbegriff darin vor?
    const suchePasst = text.includes(suchbegriff);

    // Nur behalten, wenn beides passt
    return statusPasst && suchePasst;
  });

  listeAnzeigen(gefiltert);
}

// Bei jedem getippten Zeichen und bei jeder Filteränderung neu filtern
suchfeld.addEventListener('input', filterAnwenden);
statusFilter.addEventListener('change', filterAnwenden);


// ===== Start: beim Öffnen der Seite sofort laden =====
eintraegeLaden();