# Mini-Verarbeitungsverzeichnis

Eine kleine Web-App, mit der Unternehmen ihr **Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 DSGVO** einfach führen können.

Statt einer unübersichtlichen Excel-Tabelle gibt es eine zentrale Datenbank, ein Formular, eine durchsuchbare Liste und einen Status pro Eintrag. So ist auf einen Blick sichtbar, was noch Entwurf ist und welche Einträge geprüft werden müssen.

> Entstanden als Vorbereitung auf meine Bewerbung als studentischer Mitarbeiter Softwareentwicklung. Alle Daten im Projekt sind ausgedacht.

## Funktionen

- Verarbeitungstätigkeiten **anlegen, bearbeiten und löschen** (mit Sicherheitsabfrage)
- **Live-Suche** über alle Textfelder und **Filter nach Status** (Entwurf / aktiv / geprüft)
- **Übersicht** mit der Anzahl der Einträge pro Status
- **Hinweis**, wenn die letzte Prüfung länger als 12 Monate zurückliegt
- **CSV-Export** für Excel (Semikolon, UTF-8 mit BOM)
- **Login** mit PocketBase-Benutzern
- Funktioniert auf **Desktop und Handy** (responsives Layout, Mobile First)

## Technik

| Bereich | Technik |
|---|---|
| Oberfläche | HTML, CSS, JavaScript (ohne Framework) |
| Backend und Datenbank | [PocketBase](https://pocketbase.io) (REST-API, SQLite) |
| Verbindung | PocketBase JavaScript SDK über CDN |
| Versionsverwaltung | git und GitHub |

## Datenmodell

Collection `verarbeitungen` in PocketBase:

| Feld | Typ | Pflicht |
|---|---|---|
| `bezeichnung` | Text | ja |
| `zweck` | Text | ja |
| `rechtsgrundlage` | Select (a–f, Art. 6 Abs. 1 DSGVO) | ja |
| `betroffene_personen` | Text | |
| `datenkategorien` | Text | |
| `empfaenger` | Text | |
| `drittland` | Bool | |
| `loeschfrist` | Text | |
| `abteilung` | Text | |
| `status` | Select (entwurf, aktiv, geprueft) | ja |
| `letzte_pruefung` | Datum | |

Das Schema liegt als Migration im Ordner `pb_migrations` und wird beim Start von PocketBase automatisch angelegt.

## Sicherheit und Datenschutz

- **API-Regeln:** Alle Aktionen auf `verarbeitungen` erfordern einen angemeldeten Benutzer (`@request.auth.id != ""`).
- **Keine Selbst-Registrierung:** Benutzer werden nur von Administratoren angelegt.
- **Schutz vor XSS:** Benutzereingaben werden vor der Anzeige maskiert und nie als HTML ausgeführt.
- **Schutz vor CSV-Injection:** Werte, die mit `=`, `+`, `-` oder `@` beginnen, werden beim Export entschärft.
- **Pflichtfelder** werden im Browser und zusätzlich auf dem Server geprüft.
- **Neutrale Login-Fehlermeldung**, die nicht verrät, ob eine E-Mail-Adresse existiert.
- Die **Datenbank (`pb_data`) ist nicht im Repository** (siehe `.gitignore`).

## Starten

1. **PocketBase herunterladen** von [pocketbase.io](https://pocketbase.io/docs/) und die Datei `pocketbase.exe` in den Projektordner legen.
2. **PocketBase starten:**
   ```
   .\pocketbase.exe serve
   ```
   Die Collection `verarbeitungen` wird dabei automatisch aus `pb_migrations` angelegt.
3. **Superuser anlegen** über den Link, den PocketBase im Terminal anzeigt.
4. Im Dashboard (`http://127.0.0.1:8090/_/`) in der Collection **`users`** einen **Benutzer anlegen**.
5. **`index.html` über einen lokalen Webserver öffnen**, z. B. mit der VS-Code-Erweiterung *Live Server*.
6. Mit dem Benutzer aus Schritt 4 **anmelden**.

## Projektstruktur

```
├── index.html        Aufbau der Seite
├── style.css         Gestaltung (Mobile First)
├── app.js            Logik: Login, Laden, Speichern, Suche, Export
├── pb_migrations/    Datenbank-Schema und API-Regeln
└── .gitignore        hält Datenbank und Programmdatei aus dem Repository
```

## Vorgehen und Einsatz von KI

Ich bin in drei Phasen vorgegangen: **Problem verstehen → Lösung konzipieren → implementieren.**

1. **Problem verstehen:** Was verlangt Art. 30 DSGVO? Welche Schwierigkeiten gibt es mit Excel-Listen (keine Statusübersicht, vergessene Prüfungen, verstreute Versionen)?
2. **Lösung konzipieren:** Bevor ich Code geschrieben habe, habe ich das Datenmodell (Felder und Feldtypen), den Aufbau der Seite und die Architektur (Browser ↔ REST-API ↔ PocketBase) festgelegt.
3. **Implementieren:** in kleinen Schritten. Nach jedem Schritt habe ich getestet und einen Commit gemacht. Die Commit-Historie zeigt diesen Ablauf.

**Eingesetztes KI-Tool:** Claude (Anthropic) als Lern- und Programmierpartner im Chat.

- **Wofür:** Konzept besprechen, Anleitung für die Einrichtung (PocketBase, git, GitHub), Code-Vorschläge mit Erklärung, Fehlersuche anhand von Screenshots.
- **Wie:** Ich habe immer nur einen Schritt auf einmal angefordert, den Code selbst eingefügt, getestet und mir jede Zeile erklären lassen, bevor es weiterging.
- **Was ich dabei gelernt habe:** KI-Vorschläge müssen geprüft werden. Beim Testen sind mir z. B. aufgefallen:
  - doppelt eingefügter Code, der die Daten zweimal geladen hätte,
  - dass das CSV-Trennzeichen von der Spracheinstellung von Excel abhängt,
  - dass Einträge aus dem Dashboard nicht getrimmt werden, Einträge aus meinem Formular schon.

## Was ich als Nächstes verbessern würde

- **Technische und organisatorische Maßnahmen (TOMs)** als Feld ergänzen, da sie nach Art. 30 Pflicht sind
- **Rollen:** Nur Datenschutzbeauftragte dürfen den Status auf „geprüft" setzen
- **Änderungsprotokoll:** Wer hat wann was geändert?
- **Mehrfachauswahl** statt Freitext für Personen- und Datenkategorien
- Hinweis auch für Einträge, die **noch nie geprüft** wurden
- **Excel-Export (.xlsx)**, unabhängig von der Spracheinstellung
- Version des SDK im CDN-Link **fest angeben**
- Umsetzung mit **Vue.js**, wenn die App größer wird