# One way bike tours – Web-App

Interaktive Umsetzung des Figma-Prototyps „Team 10“, Startbildschirm `271:539`.

## Ohne Terminal öffnen

`index.html` im Finder doppelklicken oder in Chrome, Safari oder Firefox öffnen. Es ist keine Installation erforderlich. Die App funktioniert auch offline: Bilder und Poppins-Schriften liegen lokal in `assets/`.

## Enthaltener Ablauf

- Startbildschirm, Demo-Login und Demo-Registrierung
- Fragen zu Gelände, Dauer, Distanz, Gepäck und Begleitung
- Drei Routen und drei Fahrräder mit Karussell-Navigation
- Kalender mit Abhol- und Rückgabedatum sowie Abholzeit
- Fahrradgröße, Größenhilfe und Zubehör
- Warenkorb, persönliche Angaben, Extras und Demo-Zahlung
- Demo-Bestätigung mit herunterladbarem Reiseplan

Die Auswahl wird innerhalb des Browser-Tabs gespeichert, sofern der Browser Session Storage erlaubt. Persönliche Angaben bleiben nur im Arbeitsspeicher. Passwörter werden nicht gespeichert oder versendet.

## Umsetzung und Grenzen

HTML, CSS und JavaScript ohne Framework. Responsive Website mit breiter Startseite, Navigation, Routenkarten und mehrspaltigem Buchungsbereich auf dem Desktop. Tablet und Handy erhalten angepasste Layouts. Browser-Zurück, Tastaturbedienung, native Formularvalidierung und Touch-Wischen werden unterstützt.

Die Anwendung ist eine funktionsfähige Frontend-Demo. Für echte Konten, Buchungen, Verfügbarkeiten und Zahlungen müssen Backend und Zahlungsanbieter angebunden werden. Es werden keine E-Mails versandt und keine Zahlungen ausgelöst. Preise sind Beispieldaten; der Fahrradpreis im Warenkorb ist ein pauschaler Demo-Preis pro Buchung und wird nicht nach Tagen berechnet. Zusätzliche Ansichten und Texte ergänzen nicht ausgearbeitete Stellen des Prototyps.

Originalbilder und Grafiken wurden aus Figma exportiert. Poppins wird unter der SIL Open Font License verwendet (siehe `assets/Poppins-OFL.txt`).

## Dateien

- `index.html`: Einstiegspunkt
- `styles.css`: Layout, Typografie und responsive Darstellung
- `responsive.css`: Website-Layout für Handy, Tablet und Desktop
- `app.js`: Navigation, Auswahl, Kalender, Formulare und Preisberechnung
- `assets/`: lokale Originalgrafiken und Schriftdateien
- `tests/test_app.py`: Browser-Funktionstests mit Python und Playwright

## Optional lokal bereitstellen

Mit Python: `python3 -m http.server 8000` und `http://localhost:8000` öffnen. `python3 build.py` kopiert ausschließlich die öffentlichen Website-Dateien nach `dist/`. Die Hosting-Konfiguration für Sites liegt unter `.openai/hosting.json`. Es ist keine Server-Anwendung nötig.

Tests: `python3 tests/test_app.py` (benötigt Playwright für Python und Google Chrome, alternativ einen installierten Playwright-Chromium-Browser).
