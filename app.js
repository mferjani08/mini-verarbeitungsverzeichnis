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

// Alle geladenen Einträge merken wir uns hier (brauchen wir später für Suche und Filter)
let alleEintraege = [];


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
    listeAnzeigen(alleEintraege);
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

// ===== Start: beim Öffnen der Seite sofort laden =====
eintraegeLaden();