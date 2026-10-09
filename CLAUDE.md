# Netzroller – Projektregeln

Tennisspiel für den Browser (Draufsicht), zwei Handys gegeneinander oder allein gegen den Computer. Privates Familienprojekt: keine Werbung, kein Tracking, keine Käufe.

- Spielkonzept, Auftrag und alle **Entscheide**: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md). Neue Entscheide dort unter «Entscheide» nachtragen und dem Auftraggeber (Pascal) sagen.
- Gespielt: https://pascalbenz78-design.github.io/netzroller/ · Code: https://github.com/pascalbenz78-design/netzroller

## Regeln für die Arbeit

- **Strikt in Phasen** (siehe unten). Jede Phase endet spielbar auf GitHub Pages, mit Commit, Zusammenfassung, Testanleitung (PC und Handy). Dann auf OK warten.
- **Statische Website, kein Build-Schritt, keine Frameworks.** ES-Module unter `js/`. `package.json` nur für Werkzeuge.
- **Logik getrennt von Darstellung und Eingabe:** `rules.js` und `ai.js` kennen kein DOM und laufen auch in Node. Jeder Schlag ist ein Datensatz (`rules.js`, Kopfkommentar).
- **Alle Zahlen in `js/balance.js`** (`BALANCE`). Keine Zahlenwerte für Tempo, Winkel, Wahrscheinlichkeiten oder Punkte im übrigen Code.
- **Alle Texte in `js/texts.js`.** Im HTML mit `data-t="schlüssel"` (bzw. `data-tp` für Platzhalter). Deutsch, Schweizer Schreibweise: «ss», nie «ß».
- **Speichern** nur über `localStorage`, immer in `try/catch`.
- **Was heute läuft, muss weiterlaufen:** Spiel zu zweit über Code und Link (PeerJS ausserhalb von claude.ai, Live-Raum auf claude.ai), Spiel gegen den Computer, Artifact auf claude.ai.
- **Barrierefreiheit:** `prefers-reduced-motion` respektieren, Farbe nie als einzige Information (z. B. Aus-Abdruck zusätzlich beschriftet).
- **Keine Platzhalter**, die so tun, als wären sie fertig. Was fehlt, steht unten im Stand.
- README nach jeder Phase nachführen, verständlich ohne Profi-Kenntnisse.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Markup und CSS, lädt `js/main.js` |
| `js/balance.js` | alle Zahlenwerte (`BALANCE`) |
| `js/rules.js` | Regeln: Schlag-Datensatz, Flugbahn, Aus/Netz/Let, Aufschlag, Zählweise |
| `js/ai.js` | Computergegner (gleiche Schnittstelle wie ein Mensch) |
| `js/machine.js` | Ballmaschine: Leben, Kombo, Zielscheiben, Tempo, Highscore |
| `js/main.js` | Spielablauf, Eingabe, Zeichnen, Hawk-Eye, Spiel zu zweit |
| `js/ui.js` | Hauptmenü, Zu zweit, Einstellungen, Match-Intro mit Münzwurf |
| `js/intro.js` | Stadion-Intro (Canvas und Web Audio) |
| `js/storage.js` | Profil, Einstellungen, Export/Import-Code |
| `js/flags.js` | gezeichnete Flaggen und Länderliste |
| `js/voice.js` | Schiedsrichter-Stimme (Web Speech API) |
| `js/net.js` | Verbindung: Live-Raum von claude.ai oder PeerJS, Neuverbinden |
| `js/config.js` | STUN-Server und optionaler TURN-Server |
| `js/audio.js` | Töne, Publikum (Web Audio) und Vibration |
| `js/texts.js` | alle Texte |
| `tools/simulate.mjs` | Balance-Simulation Computer gegen Computer |
| `tools/serve.mjs` | lokaler Webserver |

## Befehle

```bash
node tools/serve.mjs 8080          # lokal starten: http://localhost:8080 (Module brauchen http://)
node tools/simulate.mjs 500        # Balance prüfen (Punkte pro Stufe, optional Startwert)
node tools/simulate.mjs machine 300  # Ballmaschine: Dauer eines Durchgangs
```

**Automatischer Test im Browser** (Konsole der laufenden Seite):

```js
__netzroller.test.auto = true;     // Autopilot spielt die eigene Seite
__netzroller.test.spread = 1.15;   // Treffpunkt-Streuung (> 1: verpasst manchmal)
document.getElementById("soloBtn").click();
document.getElementById("matchIntro").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));  // Match-Intro überspringen
await new Promise(r => setTimeout(r, 50));
__netzroller.runFor(300);          // 300 s Spielzeit sofort durchrechnen
__netzroller.test.pause = true;    // Spiel anhalten (Bild bleibt), z. B. für Bildschirmfotos
__netzroller.state;                // mode, phase, score, serveNo, hawk, run (Ballmaschine), …
document.getElementById("machineBtn").click();   // Ballmaschine (der Autopilot spielt auch hier)
```

Verbindungsausfall simulieren (nur Direktverbindung): `__netzroller.test.drop(6)` verwirft 6 s lang alle Daten dieses Tabs. Für zwei Tabs mit getrenntem Speicher (z. B. «Spiel fortsetzen» nach dem Neuladen) einen Tab über `localhost`, den anderen über `127.0.0.1` öffnen.

Für zwei Spieler: zwei Tabs, einer eröffnet, einer tritt mit dem Code bei, in beiden den Autopiloten einschalten und mit `setInterval(() => __netzroller.runFor(0.1), 30)` antreiben. Am Ende müssen beide denselben Spielstand haben.

**Veröffentlichen:** `git push` auf `main`; GitHub Pages baut in etwa einer Minute. Das Artifact auf claude.ai (https://claude.ai/artifact/2tdxcXJJbr1tnNrKHUKBXS) wird mit `index.html` und den Dateien unter `js/` als Zusatzdateien veröffentlicht.

## Stand der Phasen

| Phase | Inhalt | Stand |
|---|---|---|
| 1 | Tennisgefühl: Aus, Aufschlag, Netz, Netzroller, Balance, Steuerung | abgenommen |
| 2 | Präsentation: Intro, Match-Intro, Hawk-Eye, Stimme, Publikum, Hauptmenü, Einstellungen | abgenommen |
| 3 | Ballmaschine (Endlos-Modus, Highscore) | abgenommen |
| 4 | Stabile Verbindung (Herzschlag, Pause, Wiederverbinden) | **fertig, wartet auf Abnahme** |
| 5 | Karriere (Tour, Turniere, Rangliste) | offen |
| 6 | Turnier zu zweit, Weltrangliste mit Supabase | offen |

### Phase 1 im Detail

Erledigt:
- Bande entfernt; jeder Schlag hat einen Aufsprungpunkt, Ballabdruck, Aus seitlich und hinten.
- Schlägerzonen Mitte / Aussen / Rahmen; Rahmentreffer ins Netz, ins Aus oder als langsamer Ball.
- Super-Schlag tiefer und riskanter, Tempo begrenzt durch die Reaktionszeit-Untergrenze.
- Aufschlag mit Hochwerfen und Timing-Ring, Einstand-/Vorteil-Seite, Aufschlagfeld leuchtet, Zielen über die Position, erster und zweiter Aufschlag, Doppelfehler, Let.
- Netz bei Rahmentreffern und zu frühem Aufschlag; Netzroller (4 %) mit Ton, wackelndem Netz und Banner.
- Computer schlägt mit erstem und zweitem Aufschlag auf, macht Doppelfehler.
- Tastatur beschleunigt bis 2,8 Platzbreiten/s.
- Super-Knopf unter der Grundlinie, Mehrfingerbedienung, Wischen nur senkrecht (≥ 70 px, < 300 ms).
- Spiel zu zweit mit allen Regeln (Schlag-Datensatz wird übertragen); Satz über zwei Tabs ohne Abweichung getestet.
- Simulation mit Auswertung in `docs/GAME_DESIGN.md`.

### Phase 2 im Detail

Erledigt:
- Intro (Flutlichter mit «Klack», Ball auf der Netzkante, Publikum, springende Buchstaben), überspringbar, höchstens einmal pro Tag automatisch, «Intro ansehen» im Menü und in den Einstellungen, kurze Fassung bei reduzierter Bewegung.
- Match-Intro mit Namen, Flaggen, Anlass und Münzwurf um den ersten Aufschlag (auch zu zweit).
- Hawk-Eye bei knappen Bällen, die einen Punkt entscheiden: Zoom, Ball in Zeitlupe, Abdruck, «IN» oder «AUS».
- Schiedsrichter-Stimme (Aus, Netz, Let, Fehler, Doppelfehler, Spielstand, Einstand, Vorteil, Spiel, «Spiel, Satz und Sieg»).
- Publikum: Raunen, Applaus ab 8 Schlägen, Jubel bei Spiel- und Satzgewinn.
- Hauptmenü mit allen Modi (noch nicht verfügbare ausgegraut), Einstellungen mit Profil (Name, Land), Ton, Stimme, Vibration, Linkshänder, Wischen, Intro, Export/Import.
- Getestet: Einstellungen, Export/Import, Linkshänder, ein Satz gegen den Computer mit Stimme und Hawk-Eye, ein Satz zu zweit über zwei Tabs mit gleichem Münzwurf, gleichem Spielstand und Revanche.

### Phase 3 im Detail

Erledigt:
- Ballmaschine: wird mit jedem Rückschlag 2,5 % schneller, ohne Obergrenze; Winkel werden schärfer, ab dem 12. Rückschlag Bälle mit Effekt.
- 3 Leben (verpasst, Aus, Netz), nach einem verlorenen Leben 10 % langsamer.
- Zielscheiben (Bonus 5, mit Super 10), Kombo ×2 ab 10, ×3 ab 25, ×4 ab 50.
- Eigene Anzeige (Punkte, Kombo, Leben, km/h), Endbildschirm mit Top 10, Feuerwerk bei neuem Rekord.
- Rangliste im Menü (lokale Top 10), Highscores im Profil und im Export-Code.
- Simulation der Durchgangsdauer: geübt ≈ 2½ min, Gelegenheit ≈ 2 min.
- Getestet: ganzer Durchgang mit Autopilot bis «Neuer Rekord!», Highscore nach Neuladen in der Rangliste, Satz gegen den Computer und Spiel zu zweit weiterhin fehlerfrei.

### Phase 4 im Detail

Erledigt:
- Herzschlag etwa jede Sekunde; nach 3 s Stille Pause mit «Verbindung unterbrochen … warte», nach 8 s Hinweis aufs WLAN.
- Weiter nach der Pause: laufender Punkt wird wiederholt (Epoche), Stand des eröffnenden Handys gilt.
- Nachfragen nach 2 s ohne Entscheid, Wiederholung nach 6 s.
- PeerJS: beitretendes Handy verbindet sich selbst neu, eröffnendes Handy nimmt die neue Verbindung an.
- «Spiel fortsetzen» nach dem Neuladen (30 Minuten), für beide Rollen.
- STUN fest, TURN optional in `js/config.js` (Anleitung in der README).
- Getestet: Ausfall beim beitretenden und beim eröffnenden Tab (Pause, Weiterspielen, gleicher Stand), Neuladen beider Tabs mit «Spiel fortsetzen».

Nicht getestet: echter Netzwechsel am Handy (WLAN aus/an), Mobilfunk, TURN (kein Konto vorhanden).
