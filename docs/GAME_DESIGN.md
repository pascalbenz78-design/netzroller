# Netzroller: Spielkonzept

Dieses Dokument ist das verbindliche Spielkonzept. Der Auftrag vom 9.10.2026 steht unten unverändert (nur die Überschriften sind eine Ebene tiefer gesetzt). Entscheide, die vom Auftrag abweichen oder ihn genauer fassen, stehen im Abschnitt [Entscheide](#entscheide). Der Stand der Phasen steht in [`CLAUDE.md`](../CLAUDE.md).

---

## Deine Rolle und der Auftrag

Du bist Game-Designer und Entwickler in einem. Dieses Repository enthält **«Netzroller»**: ein Tennisspiel für den Browser in Draufsicht. Zwei Handys spielen gegeneinander (WebRTC über PeerJS), oder man spielt allein gegen den Computer. Alles steckt heute in `index.html` (HTML, CSS, JavaScript, kein Build-Schritt), gehostet auf GitHub Pages.

Das Spiel ist ein privates Familienprojekt: keine Werbung, kein Tracking, keine Käufe. Lies zuerst `index.html` und `README.md` vollständig.

Heute ist Netzroller im Kern Pong mit Tennisoptik: Der Ball prallt seitlich an die Bande, es gibt kein Aus, kein Netz, keinen echten Aufschlag. Dein Auftrag ist, daraus ein Spiel zu machen, das sich **nach Tennis anfühlt**, eine **Karriere mit Turnieren und Weltrangliste** bietet und auch **zu zweit im Turnier** funktioniert, ohne die Stärken zu verlieren: sofort spielbar, ein Finger genügt, ein Satz dauert drei bis fünf Minuten.

**Arbeitsweise:**

1. Lege zuerst `docs/GAME_DESIGN.md` an und übernimm diesen gesamten Auftrag dort als Spielkonzept. Lege zusätzlich eine `CLAUDE.md` an mit Projektregeln, Befehlen und dem Stand der Phasen. Halte beide Dateien laufend aktuell.
2. Erstelle dann einen kurzen Plan für Phase 1 und beginne sofort.
3. Arbeite **strikt in den Phasen unten**. Jede Phase endet mit einem spielbaren Stand, der auf GitHub Pages läuft. Am Ende jeder Phase: Git-Commit, kurze Zusammenfassung, Anleitung zum Testen (PC und Handy), dann auf mein OK warten.
4. Ist etwas unklar oder nicht wie beschrieben machbar, triff eine vernünftige Entscheidung, halte sie in `docs/GAME_DESIGN.md` unter «Entscheide» fest und sag es mir.
5. Alle Zahlenwerte (Tempo, Winkel, Wahrscheinlichkeiten, Punkte) gehören in **ein zentrales Objekt `BALANCE`** in einer eigenen Datei, damit ich sie später einfach anpassen kann.
6. Was heute funktioniert, muss weiter funktionieren: Spiel zu zweit über Code und Link, Spiel gegen den Computer, Betrieb als Artifact auf claude.ai (dort der Live-Raum statt PeerJS).

---

## Design-Säulen

Jede Entscheidung muss sich an diesen vier Punkten messen:

1. **Ein Finger, sofort spielbar.** Schläger ziehen, tippen, fertig. Neues (Aufschlag-Timing, Zielen) muss man ohne Anleitung in einem Ballwechsel verstehen.
2. **Risiko gegen Sicherheit.** Wer mit der Schlägerkante spielt, bekommt scharfe Winkel, riskiert aber das Aus. Wer den Super-Schlag zündet, riskiert mehr. Das ist der Kern, der aus Pong Tennis macht.
3. **Lesbar und fair.** Jeder Punkt muss erklärbar sein: Man sieht, wo der Ball aufkommt, und bei knappen Bällen entscheidet ein Hawk-Eye. Nie unhaltbare Bälle, ausser im Endlos-Modus gegen die Ballmaschine.
4. **Etwas zum Weiterspielen.** Highscore, Turniere, Rangliste, Pokale. Der nächste Match soll immer einen Grund haben.

---

## Technik

- Weiterhin **statische Website ohne Build-Schritt**, gehostet auf GitHub Pages. Weil der Code stark wächst, darfst du ihn in mehrere Dateien aufteilen (native ES-Module, z. B. `js/game.js`, `js/net.js`, `js/ai.js`, `js/tour.js`, `js/ui.js`, `js/audio.js`, `js/balance.js`). Keine Frameworks nötig.
- **Spiel-Logik getrennt von Darstellung und Eingabe.** Jeder Schlag ist ein Datensatz (Position, Richtung, Tempo, Aufsprungpunkt, Super, Aus/Netz). So berechnen beide Handys aus denselben Daten dasselbe Ergebnis, und der Computergegner nutzt dieselbe Schnittstelle wie ein Mensch.
- **Speichern** lokal im Browser (`localStorage`, immer in `try/catch`): Profil, Einstellungen, Highscores, Karriere. Dazu Export/Import des Profils als kurzer Text-Code, damit man den Spielstand auf ein anderes Gerät mitnehmen kann.
- **Online-Rangliste** erst in Phase 6, siehe dort.
- **Sprache:** Deutsch mit Schweizer Schreibweise («ss» statt «ß»). Alle Texte zentral in einer Datei.
- **Leistung:** 60 fps auf einem durchschnittlichen Handy. Canvas wie heute.
- **Barrierefreiheit:** `prefers-reduced-motion` respektieren (Intro und Hawk-Eye verkürzt), Farben nie als einzige Information.

---

## 1. Aus

Der Ball prallt **nicht mehr an der Bande** ab. Jeder Schlag hat einen **Aufsprungpunkt** in der gegnerischen Hälfte, der beim Schlag berechnet wird.

- **Aus seitlich:** Der Aufsprungpunkt liegt ausserhalb der Einzel-Seitenlinien (die inneren Linien auf dem Platz). Die Doppelgassen sind Aus.
- **Aus hinten:** Der Aufsprungpunkt liegt hinter der Grundlinie. Normale Schläge landen zwischen Aufschlaglinie und Grundlinie; Super-Schläge landen tiefer und können lang gehen.
- **Die Schlägerzonen bestimmen das Risiko:**
  - Mitte (ca. 60 % der Schlägerbreite): sicher, moderater Winkel.
  - Aussenzone (ca. 30 %): scharfer Winkel, je weiter aussen, desto näher an der Linie. Der äusserste Teil geht ins Aus.
  - Rahmen (äusserste ca. 10 %): «Rahmentreffer». Der Ball fliegt unkontrolliert: zufällig ins Netz, ins Aus oder als harmloser, langsamer Ball ins Feld.
  - Die Bewegung des Schlägers im Moment des Treffers verstärkt den Winkel (wie heute), aber begrenzt.
  - Super-Schlag: Aufsprungpunkt tiefer, Aus-Risiko höher. Wer ihn mittig trifft, ist sicher.
- **Sichtbar machen:** Beim Aufsprung ein kurzer Ballabdruck auf dem Platz. Bei Aus: Ruf «Aus!» (Banner und Stimme, siehe Präsentation), der Punkt geht an den Gegner.
- **Hawk-Eye:** Liegt der Aufsprung knapp an der Linie (weniger als ein Balldurchmesser), kurze Zoom-Wiederholung (ca. 1,5 s, antippen überspringt) mit Ballabdruck und Entscheid «IN» oder «AUS».
- Nach dem Aufsprung fliegt der Ball weiter zum gegnerischen Schläger. Volleys gibt es nicht; ein Ball im Aus ist entschieden, sobald er aufspringt.
- **Mehrspieler:** Das schlagende Handy berechnet Aufsprungpunkt und Aus-Entscheid und schickt sie mit dem Schlag. Das empfangende Handy zeigt Aufsprung und vergibt den Punkt. So können sich die Geräte nicht widersprechen.

## 2. Aufschlag, zweiter Aufschlag, Netz und Netzroller

**Aufschlag wie im Tennis, aber mit einem Finger:**

- Aufgeschlagen wird abwechselnd von rechts und links der Mitte (Einstand-Seite, Vorteil-Seite) **diagonal in das Aufschlagfeld**. Das Zielfeld leuchtet dezent.
- **Timing:** Antippen wirft den Ball hoch (Schatten wird kleiner, Ball grösser). Ein zweites Tippen schlägt. Ein Ring um den Ball zeigt den idealen Moment am höchsten Punkt.
  - Perfekt getroffen: schneller Aufschlag, der Aufsprung liegt nahe an der Linie, die man durch die Schlägerposition beim Tippen wählt.
  - Gut: normaler Aufschlag ins Feld.
  - Zu früh: **Netz**. Zu spät: **Aus** (lang).
- **Erster Aufschlag** schnell und riskant, enges Zeitfenster. Bei Fehler: **zweiter Aufschlag** mit deutlich grösserem Zeitfenster und langsamerem Ball. Zwei Fehler: **Doppelfehler**, Punkt für den Gegner.
- Zielen: Die Position des Schlägers beim zweiten Tippen bestimmt, ob der Aufschlag nach aussen, in die Mitte oder auf den Körper geht.
- Der Computergegner schlägt ebenfalls mit erstem und zweitem Aufschlag auf und macht je nach Stärke auch Doppelfehler.

**Netz im Ballwechsel:** Rahmentreffer können im Netz landen. Der Ball fällt sichtbar ans Netz, Ruf «Netz!».

**Netzroller (das Markenzeichen des Spiels):**

- Bei jedem Ball, der das Netz überquert, mit kleiner Wahrscheinlichkeit (Startwert ca. 4 %) ein Netzroller: Der Ball streift die Netzkante, kurzer «Tock»-Ton, das Netz wackelt, der Ball wird deutlich langsamer und leicht abgelenkt, Banner **«Netzroller!»**.
- **Beim Aufschlag** zählt ein Netzroller, der im Feld landet, als **«Let»**: Der Aufschlag wird wiederholt, ohne Fehler.
- Im Mehrspieler entscheidet das schlagende Handy über den Netzroller und schickt ihn mit dem Schlag.

## 3. Balance und Schwierigkeit

**Gegen einen Menschen und gegen den Computer** (Spiel, Turnier):

- **Kein unhaltbarer Ball.** Es gilt eine Untergrenze für die Reaktionszeit: Ein Ball braucht vom Schlag bis zum gegnerischen Schläger mindestens ca. 0,40 s auf Leicht, 0,32 s auf Mittel, 0,26 s auf Schwer. Das gilt auch für den Super-Schlag: Sein Tempo ist `min(normal × 2,2, Obergrenze)`. Bei hohem Grundtempo fällt der Super-Schlag damit weniger stark aus; dafür landet er tiefer (siehe Aus).
- **Tastatur:** Der Schläger beschleunigt bei gedrückter Pfeiltaste bis auf etwa doppeltes heutiges Tempo, damit man auch auf Schwer mithalten kann.
- Prüfe die Balance mit einer automatischen Simulation (Computer gegen Computer, z. B. 500 Ballwechsel pro Stufe) und dokumentiere: durchschnittliche Länge eines Ballwechsels, Anteil Punkte durch Aus, Netz und Doppelfehler. Richtwerte für Mittel: Ballwechsel im Mittel 5 bis 8 Schläge, 10 bis 20 % der Punkte durch Aus, 3 bis 8 % durch Doppelfehler.

**Allein gegen die Ballmaschine** (neuer Endlos-Modus, Phase 3): Hier darf es **ohne Obergrenze** immer schneller werden. Einzelheiten unten.

## 4. Steuerung am Handy

- **Super-Knopf** aus dem Spielfeld nehmen: unterhalb der eigenen Grundlinie, im grünen Bereich, rechts unten (in den Einstellungen umstellbar auf links, für Linkshänder). Mindestens 64 × 64 px.
- **Mehrfingerbedienung:** Während ein Finger auf dem Super-Knopf liegt, steuert ein anderer Finger den Schläger weiter. Der Schläger folgt immer dem Finger, der zuletzt auf dem Platz aufgesetzt hat.
- **Wischen nach oben** löst Super nur aus, wenn die Bewegung eindeutig senkrecht ist (deutlich mehr vertikal als horizontal, mindestens ca. 70 px, unter 300 ms). In den Einstellungen abschaltbar.
- Kurze Vibration beim Laden des Super-Schlags, wie heute.

## 5. Verbindung zu zweit (verbessern, soweit sinnvoll)

- **Herzschlag:** Beide Handys senden etwa jede Sekunde ein Lebenszeichen. Fehlt es länger als ca. 3 s: Spiel pausieren, Anzeige «Verbindung unterbrochen … warte», der laufende Punkt wird wiederholt.
- **Wiederverbinden** mit demselben Code, ohne dass der Spielstand verloren geht. Der Spielstand des eröffnenden Handys gilt; nach dem Wiederverbinden gleichen beide ab.
- **Kein Hängenbleiben:** Wartet ein Handy auf den Punkt vom anderen und kommt nach ca. 2 s nichts, fragt es aktiv nach dem Spielstand.
- **Netze ohne direkte Verbindung:** STUN-Server angeben. Einen TURN-Server nur einbauen, wenn es dafür einen kostenlosen Dienst gibt, den ich selbst einrichten kann; dann mit Anleitung in der README. Wenn nicht, ist es in Ordnung: Ein klarer Hinweis «Wechselt ins selbe WLAN» reicht.
- Was sich nicht verbessern lässt, in `docs/GAME_DESIGN.md` unter «Entscheide» begründen.

---

## Präsentation

**Intro beim Start** (ca. 6 bis 8 s, jederzeit mit Antippen überspringbar, höchstens einmal pro Tag automatisch, im Menü «Intro ansehen»):

1. Dunkles Stadion. Flutlichter gehen nacheinander an, jedes mit einem satten «Klack».
2. In Zeitlupe rollt ein Tennisball auf der Netzkante entlang, wackelt, zögert …
3. … und fällt auf die Seite des Zuschauers. Publikum jubelt kurz auf.
4. Die Buchstaben NETZROLLER springen wie Bälle nacheinander ins Bild, «ROLLER» in Ballgelb.
5. Übergang ins Hauptmenü.

Alles mit Canvas und Web Audio erzeugt, keine fremden Bilder oder Videos. Keine Marken, Logos oder echten Turniere nachbilden.

**Match-Intro** (ca. 3 s, überspringbar): Beide Spieler mit Namen und Flagge, Turnier und Runde («Viertelfinal»), Münzwurf um den Aufschlag.

**Schiedsrichter-Stimme** (Web Speech API, deutsche Stimme, in den Einstellungen abschaltbar): «Aus!», «Netz!», «Let», «Doppelfehler», «Einstand», «Vorteil Pascal», «Spiel, Satz und Sieg». Fehlt eine Stimme auf dem Gerät, nur Banner.

**Publikum** mit Web Audio: Raunen bei knappen Bällen, Applaus nach langen Ballwechseln (ab 8 Schlägen), Jubel bei Spiel- und Matchgewinn.

**Einstellungen** (neues Menü): Ton, Stimme, Vibration, Linkshänder, Super per Wischen, Intro, Profil exportieren/importieren.

---

## Spielmodi

Hauptmenü nach dem Intro:

| Modus | Beschreibung |
|---|---|
| Schnelles Spiel | Wie heute: Kurzsatz gegen den Computer, Stufe wählbar |
| Zu zweit | Wie heute: Spiel eröffnen oder mit Code beitreten |
| Ballmaschine | Endlos-Modus mit Highscore |
| Karriere | Turniere gegen den Computer, Tour-Rangliste |
| Turnier zu zweit | Gemeinsames Turnier auf zwei Handys (Phase 6) |
| Rangliste | Highscores und Weltrangliste |

### Ballmaschine (Endlos-Modus mit Highscore)

- Oben steht eine Ballmaschine statt eines Gegners. Sie schiesst Bälle, und **jeder zurückgespielte Ball macht den nächsten etwas schneller, ohne Obergrenze.** Mit der Zeit kommen schärfere Winkel und Bälle mit Effekt (leichte Kurve) dazu.
- **3 Leben.** Verpasst oder ins Aus gespielt kostet ein Leben.
- **Zielscheiben** erscheinen in der gegnerischen Hälfte. Treffer geben Bonuspunkte; ein Super-Schlag ins Ziel zählt doppelt.
- **Punkte:** 1 pro Rückschlag, Kombo-Multiplikator für Rückschläge ohne Fehler (×2 ab 10, ×3 ab 25, ×4 ab 50), Zielbonus.
- **Highscore:** lokale Top 10 mit Name, Punkten, Datum und höchstem erreichten Tempo. Neuer Rekord: Feuerwerk und Banner. In Phase 6 zusätzlich online.

### Karriere (Turniere gegen den Computer)

**Die Tour:** 63 erfundene Computerspieler plus du. Jeder hat Namen, Land (Flagge), Stärke (Rating) und einen **Spielstil**, der sich spürbar unterscheidet:

| Stil | Verhalten |
|---|---|
| Wand | Breiter Schläger, langsam, macht fast keine Fehler |
| Kanone | Viele Super-Schläge, schneller Aufschlag, aber mehr Aus und Doppelfehler |
| Winkelspieler | Spielt scharf an die Seitenlinien |
| Konterspieler | Nimmt dein Tempo auf und spielt es schneller zurück |
| Allrounder | Ausgewogen |

Keine echten Tennisspieler, keine echten Turniernamen. Die Namen dürfen witzig sein, aber nicht albern.

**Turniere einer Saison** (8 Turniere, Belag ändert das Spielgefühl):

| Turnier (Beispielnamen) | Kategorie | Feld | Belag | Wirkung |
|---|---|---|---|---|
| Aargau Open | 250 | 16 | Hartplatz | normal |
| Reuss Cup | 250 | 16 | Sand | Ball langsamer, längere Ballwechsel |
| Seetal Indoor | 250 | 16 | Halle | schnell, keine Netzroller-Häufung |
| Alpen Classic | 500 | 16 | Sand | langsamer, mehr Effekt |
| Rhein Masters | 1000 | 32 | Hartplatz | Gegner stärker |
| Limmat Trophy | 500 | 16 | Rasen | schnell, flacher, mehr Netzroller |
| Grand Slam Netzroller | Grand Slam | 32 | Rasen | Final über zwei Gewinnsätze |
| Saisonfinale | Finale | 8 | Halle | nur die Top 8 der Rangliste, Gruppenphase und Final |

- Ab Turnieren der Kategorie 1000 und Grand Slam braucht man eine Mindest-Rangierung oder eine Wildcard (eine Wildcard pro Saison).
- **Steigerung von Runde zu Runde:** Die Gegner werden nach Setzliste und Rating stärker. Gesetzte Spieler treffen erst spät aufeinander. Der Final ist spürbar schwerer als die erste Runde.
- **Matchformat:** frühe Runden Kurzsatz bis 3, ab Halbfinal Satz bis 4, Grand-Slam-Final zwei Gewinnsätze bis 3.
- **Ranglistenpunkte** je erreichter Runde:

| Kategorie | Sieger | Final | Halbfinal | Viertelfinal | Achtelfinal | 1. Runde |
|---|---|---|---|---|---|---|
| Grand Slam | 2000 | 1200 | 720 | 360 | 180 | 10 |
| 1000 | 1000 | 600 | 360 | 180 | 90 | 10 |
| 500 | 500 | 300 | 180 | 90 | 0 | – |
| 250 | 250 | 150 | 90 | 45 | 0 | – |
| Saisonfinale | bis 1500 (200 pro Gruppensieg, 400 Halbfinal, 500 Final) | | | | | |

- **Tour-Rangliste:** Es zählen die Punkte der letzten 8 Turniere (rollend, wie eine 52-Wochen-Wertung). Die Computerspieler spielen ihre Matches im Hintergrund (Simulation nach Rating mit Zufall), damit sich die Rangliste auch ohne dich bewegt. Du startest auf Rang 64.
- **Belohnungen:** Pokal-Vitrine mit jedem gewonnenen Turnier, Karriere-Statistik (Siege, Niederlagen, Asse, Doppelfehler, längster Ballwechsel, beste Rangierung), Schlägerfarben als Belohnung für Meilensteine (nur Optik, kein Spielvorteil).
- **Darstellung:** Turnierbaum mit Runden, Rangliste mit Pfeilen für Auf- und Abstieg, Siegerehrung nach jedem Turniersieg.

### Turnier zu zweit (zwei Handys, später erweiterbar auf bis zu 4)

- Ein Handy eröffnet ein Turnier und bekommt einen Code, das zweite tritt bei (wie heute beim Spiel zu zweit).
- Beide Spieler kommen ins selbe Turnierfeld, **in verschiedene Hälften**, sodass sie sich frühestens im Final treffen.
- In jeder Runde spielt jeder **gleichzeitig auf seinem Handy gegen seinen Computergegner**. Der Turnierbaum wartet, bis beide fertig sind, und zeigt live den Spielstand des anderen.
- Erreichen beide den Final, spielen sie **gegeneinander** über die bestehende Verbindung.
- Wer ausscheidet, kann den anderen weiter verfolgen (Spielstand live) und anfeuern (Knopf, der beim anderen kurz Jubel abspielt).
- Punkte für die Tour-Rangliste bekommt jeder auf seinem eigenen Profil.
- Den Code so bauen, dass später 4 Spieler möglich sind (Viertel statt Hälften).

### Weltrangliste und Online-Highscore (Phase 6)

Zwei Ranglisten, klar getrennt:

1. **Tour-Rangliste** (lokal, Karriere): du gegen 63 erfundene Spieler.
2. **Weltrangliste** (online): alle echten Netzroller-Spieler, z. B. Familie und Freunde, mit Karrierepunkten, Turniersiegen und Ballmaschinen-Highscore.

- **Umsetzung mit Supabase** (kostenloser Tarif, Region EU). Ich kenne Supabase bereits von einem anderen Projekt. Führe mich Schritt für Schritt durch die Einrichtung: Projekt, Tabellen per SQL, Row Level Security, Project URL und Anon Key. Der Anon Key darf im Code stehen; die Schutzregeln liegen in der Datenbank.
- Tabellen-Vorschlag: `players` (id, name, land, erstellt), `scores` (player_id, modus, punkte, tempo, datum), `career` (player_id, ranglistenpunkte, turniersiege, beste_rangierung, aktualisiert).
- Jedes Profil bekommt beim ersten Start eine zufällige ID und einen geheimen Schlüssel (lokal gespeichert); nur wer den Schlüssel hat, kann seine eigenen Einträge ändern.
- Einfache Plausibilitätsprüfungen in der Datenbank (Höchstwerte, höchstens ein Eintrag pro Minute). Schummeln ist bei einem Familienspiel kein grosses Thema; ein perfekter Schutz ist nicht nötig.
- **Ohne Internet oder ohne Supabase** läuft alles lokal weiter. Online ist eine Ergänzung, keine Voraussetzung.
- Keine weiteren persönlichen Daten als der selbst gewählte Name und das Land.

---

## Phasen

### Phase 1: Tennisgefühl
- Aus mit Schlägerzonen, Aufsprungpunkt, Ballabdruck, Bande entfernt.
- Aufschlag mit Timing, Aufschlagfeldern, erstem und zweitem Aufschlag, Doppelfehler, Let.
- Netz bei Rahmentreffern, Netzroller.
- Balance: Untergrenze der Reaktionszeit, Super-Schlag mit Obergrenze, Tastatur, Simulation mit Auswertung.
- Steuerung: Super-Knopf versetzt, Mehrfingerbedienung, Wischen entschärft.
- Mehrspieler zu zweit funktioniert mit allen neuen Regeln.
- **Abnahme:** Ein Satz gegen den Computer auf Mittel fühlt sich wie Tennis an; die Simulation liegt in den Richtwerten; zu zweit läuft ein Satz ohne Unstimmigkeiten beim Spielstand.

### Phase 2: Präsentation
- Intro, Match-Intro, Hawk-Eye, Schiedsrichter-Stimme, Publikum.
- Neues Hauptmenü und Einstellungen.
- **Abnahme:** Intro läuft flüssig am Handy und lässt sich überspringen; alle Rufe kommen zur richtigen Zeit.

### Phase 3: Ballmaschine
- Endlos-Modus, Leben, Zielscheiben, Kombo, lokale Top 10.
- **Abnahme:** Ein Durchgang dauert für einen geübten Spieler 2 bis 5 Minuten; der Highscore bleibt nach Neuladen erhalten.

### Phase 4: Stabile Verbindung
- Herzschlag, Pause, Wiederverbinden, Abgleich des Spielstands, kein Hängenbleiben, STUN/TURN wie oben.
- **Abnahme:** WLAN an einem Handy kurz aus- und wieder einschalten: Das Spiel pausiert und läuft mit korrektem Spielstand weiter.

### Phase 5: Karriere
- Tour mit 63 Computerspielern und Spielstilen, 8 Turniere mit Belägen, Turnierbaum, Matchformate, Ranglistenpunkte, Tour-Rangliste, Hintergrundsimulation, Pokal-Vitrine, Statistik, Profil-Export.
- **Abnahme:** Eine ganze Saison ist spielbar; die Rangliste verändert sich nachvollziehbar; die Gegner werden von Runde zu Runde spürbar stärker.

### Phase 6: Zusammen und online
- Turnier zu zweit.
- Weltrangliste und Online-Highscore mit Supabase (mit Einrichtungsanleitung für mich).
- README vollständig nachführen.
- **Abnahme:** Zwei Handys spielen ein Turnier bis zum gemeinsamen Final; Highscore und Karrierepunkte erscheinen in der Weltrangliste auf beiden Geräten.

---

## Qualitätsregeln

- Nach jeder Phase selbst testen: Spiel im Browser starten (Playwright, Handy-Bildschirmgrösse), einen Satz automatisiert durchspielen lassen, Konsole auf Fehler prüfen. Für das Spiel zu zweit zwei Browser-Instanzen verbinden.
- Keine Platzhalter-Funktionen, die so tun, als wären sie fertig. Was fehlt, steht im Stand der Phasen in `CLAUDE.md`.
- Code verständlich gliedern und kurz kommentieren.
- `README.md` nach jeder Phase nachführen (Steuerung, Regeln, Modi), verständlich für jemanden ohne Profi-Kenntnisse.
- Alle Texte im Spiel auf Deutsch mit «ss».

---

## Entscheide

Laufend nachgeführt. Jeder Eintrag: was entschieden wurde und warum.

### Phase 1

1. **Koordinaten unabhängig vom Bildschirm.** Quer misst das Spiel in Platzbreiten (`x`), längs normiert (`v`: -1 Gegner, 0 Netz, +1 du). Grundlinie, Aufschlaglinie und alle Linienentscheide sind in diesen Einheiten festgelegt (`BALANCE.court`). Ein Handy und ein PC berechnen deshalb aus demselben Schlag-Datensatz exakt dasselbe, auch wenn der Platz verschieden gross gezeichnet wird.
2. **Ein Schlag ist ein Datensatz.** `rules.js` erzeugt beim Schlag einen Datensatz mit Startpunkt, Punkt über dem Netz, Aufsprungpunkt, Tempo vor und nach dem Netz, Entscheid (`in`, `out`, `net`, `fault`, `let`), Netzroller und Super. Flugbahn, Aufsprung und Ballhöhe sind reine Funktionen dieses Datensatzes und der Zeit. Mensch, Computer und das andere Handy nutzen dieselben Funktionen.
3. **Wer den Ball bekommt, entscheidet den Punkt.** Aus, Netz und «verpasst» vergibt das empfangende Handy (bzw. bei Aus und Netz: es übernimmt den vom Schlagenden mitgeschickten Entscheid). Fehler beim ersten Aufschlag und Let verwaltet der Aufschläger, denn er schlägt danach nochmals auf. Einen Doppelfehler vergibt wieder der Empfänger. So ist bei jedem Ereignis genau ein Handy zuständig.
4. **Keine Volleys, deshalb springt jeder Ball vor dem Schläger auf.** Der tiefste mögliche Aufsprung liegt bei `v = 0,98`, also hinter der Grundlinie (0,88), aber vor der Schlägerlinie (1,0). Ein langer Ball ist damit entschieden, bevor er den Schläger erreicht.
5. **Linie berührt = drin.** Massgebend ist der Ballrand: Ein Aufsprung gilt als drin, wenn der Ball die Linie berührt (Toleranz = Ballradius, `ballR` quer, `ballRV` längs).
6. **Schlägerzonen** gemessen als Abstand Ball–Schlägermitte im Verhältnis zur halben Schlägerbreite plus Ballradius: Mitte bis 0,60, Aussenzone bis 0,92, Rahmen bis 1,0. Die Aussenzone zielt bis 1,12 × halbe Einzelbreite; ab etwa 0,90 Trefferabstand geht der Ball ins Seiten-Aus. Der Rahmen beginnt damit etwas weiter aussen als im Auftrag (0,92 statt 0,90), weil sonst zu viele Punkte durch Aus enden (Simulation).
7. **Aufschlag-Zielen über die Position.** Beim Aufschlag ist der Schläger auf die Aufschlagzone hinter der Grundlinie beschränkt (Einstand-Seite rechts, Vorteil-Seite links). Nahe der Mitte zielt der Aufschlag auf die Mitte des Felds («T»), ganz aussen nach aussen, dazwischen auf den Körper. Der hochgeworfene Ball folgt dem Schläger, damit man beim Werfen noch zielen kann.
8. **Ball nicht geschlagen = nochmals werfen.** Wer nach dem Hochwerfen nicht tippt, lässt den Ball fallen und wirft ohne Fehler nochmals. Wie im Tennis: Fangen ist erlaubt.
9. **Zeitfenster Aufschlag:** Abweichung vom höchsten Punkt (0 = perfekt, 1 = ganz am Anfang oder Ende des Wurfs). Erster Aufschlag: perfekt bis 0,10, gut bis 0,30. Zweiter Aufschlag: perfekt bis 0,12, gut bis 0,55. Zu früh = Netz, zu spät = lang.
10. **Reaktionszeit-Untergrenze** wird beim Erzeugen jedes Schlags durchgesetzt: Ist die Flugzeit bis zum gegnerischen Schläger kürzer als die Untergrenze der Stufe, wird der Schlag entsprechend verlangsamt. Das gilt auch für Super-Schläge und Aufschläge. Für die Ballmaschine (Phase 3) lässt sich die Grenze mit `noFloor` abschalten.
11. **Computergegner zielt mit Streuung.** Die KI plant, wo auf dem Schläger sie den Ball treffen will, und verfehlt diesen Punkt normalverteilt (`ai.err`). Daraus entstehen Gewinnschläge (verpasst), Rahmentreffer und Aus von selbst, ohne gewürfelte Ergebnisse. Die Simulation zeigte: Die Bewegungsgeschwindigkeit der KI bestimmt kaum etwas, weil sie bei den heutigen Tempi fast jeden Ball erreicht. Entscheidend ist die Zielgenauigkeit.
12. **Der Ballwechsel zählt alle Schläge ab dem gültigen Aufschlag.** Doppelfehler sind in der Länge nicht enthalten.
13. **Remote-Aufschlag:** Wirft das andere Handy den Ball hoch, sieht man das über ein Feld `toss` in der Präsenz (Anteil des Wurfs). Den Timing-Ring sieht nur der Aufschläger selbst.
14. **Mehrere Dateien als ES-Module** (`js/*.js`), kein Build-Schritt. Lokal braucht es deshalb einen kleinen Webserver (`node tools/serve.mjs`), weil Browser Module nicht von `file://` laden. `package.json` dient nur den Werkzeugen.
15. **Tests im Browser** liefen über den eingebauten Browser von Claude statt über Playwright (in dieser Umgebung nicht installiert). Für automatische Durchläufe gibt es einen Autopiloten und einen Schnelllauf über die Konsole (`__netzroller.test`, `__netzroller.runFor(sek)`). Die Spieluhr der internen Verzögerungen läuft dafür in Spielzeit statt mit `setTimeout`.
16. **Direktverbindung:** PeerJS meldet eigene Änderungen jetzt gebündelt und nie mitten in einem Aufruf, wie der Live-Raum von claude.ai. Vorher konnte ein Spielstand-Abgleich sich selbst endlos auslösen.
17. **Super-Knopf** sitzt unten rechts im grünen Bereich unter der Grundlinie (66 × 66 px). Die Umstellung auf links (Klasse `lefty`) ist vorbereitet; der Schalter dafür kommt mit dem Einstellungsmenü in Phase 2.
18. **Netzroller-Wahrscheinlichkeit** ist pro Ball, der das Netz überquert, 4 %. Ein Netzroller landet kurz hinter dem Netz (v 0,10 bis 0,32) mit halbem Tempo. Beim Aufschlag ergibt er im Feld ein Let.

### Phase 2

19. **Intro und Ton:** Browser spielen Töne erst nach einem Antippen ab. Ist der Ton beim Start noch gesperrt, zeigt das Intro das dunkle Stadion mit «Antippen». Der erste Tipp startet das Intro mit Ton, jeder weitere Tipp überspringt es. «Überspringen» oben rechts beendet es sofort. Aus dem Menü gestartet (nach einem Klick) läuft es sofort mit Ton.
20. **Intro höchstens einmal pro Tag automatisch:** Das Datum wird im Profil gespeichert (`introSeen`), sobald das Intro fertig ist oder übersprungen wurde. In den Einstellungen lässt sich das automatische Intro ganz abschalten.
21. **Hawk-Eye nur bei knappen Bällen, die einen Punkt entscheiden:** bei Aus, Fehlern beim Aufschlag und bei Bällen, die knapp drin waren und nicht mehr erreicht wurden. Ein knapper Ball mitten im Ballwechsel erzeugt nur ein Raunen im Publikum; das Spiel anzuhalten, würde den Ballwechsel zerstören (und zu zweit beide Handys auseinanderbringen). Knapp heisst: Aufsprung näher als ein Balldurchmesser an der Linie (`BALANCE.hawk.gap`). Beim Aufschlag zählt auch die Mittellinie des Aufschlagfelds.
22. **Hawk-Eye hält das Spiel an:** Während der Wiederholung (1,7 s, bei reduzierter Bewegung 0,8 s) laufen keine Spielschritte und keine Verzögerungen weiter. Antippen springt zum Ende. Zu zweit zeigen beide Handys die Wiederholung; vergeben wird der Punkt weiterhin nur vom zuständigen Handy (siehe Entscheid 3). Kommt der Punkt vom anderen Handy, während die Wiederholung noch läuft, wird sie nur noch zu Ende gezeigt.
23. **Münzwurf um den Aufschlag:** Das Spielstand-Objekt hat neu ein Feld `fs` (wer im ersten Spiel aufschlägt). Allein würfelt das eigene Handy, zu zweit das eröffnende. Das beitretende Handy übernimmt den Wurf, solange noch kein Punkt gespielt ist. Bei einer Revanche schlägt der andere zuerst auf.
24. **Match-Intro und erster Schlag zu zweit:** Wer das Match-Intro schneller überspringt, kann schon aufschlagen. Kommt beim anderen Handy ein Schlag an, schliesst sich dessen Intro sofort.
25. **Schiedsrichter-Stimme** ruft auch den Spielstand aus («Fünfzehn null», «Dreissig beide», «Vorteil Pascal»), Punkte des Aufschlägers zuerst. Eine Schweizer Stimme (`de-CH`) wird bevorzugt, sonst eine deutsche. Ohne deutsche Stimme bleiben nur die Banner, die Einstellungen zeigen dann einen Hinweis.
26. **Publikum:** Raunen bei knappen Bällen und Netzroller-Momenten im Intro, Applaus ab 8 Schlägen (`BALANCE.crowd.applauseFrom`), Jubel bei jedem Spielgewinn und stärker beim Satzgewinn. Alles mit gefiltertem Rauschen erzeugt.
27. **Profil:** Name, Land, Stufe und Einstellungen liegen in einem Objekt (`localStorage` «nr-profile»). Name und Stufe aus Phase 1 werden beim ersten Start übernommen. Der Export-Code («NR1.» + Base64) enthält Name, Land, Stufe und Einstellungen; ab Phase 3 kommen Highscores und Karriere dazu.
28. **Flaggen werden gezeichnet** (32 Länder, vereinfachte Formen), weil Flaggen-Emojis unter Windows fehlen. Der Computer im schnellen Spiel hat statt einer Flagge einen Tennisball.
29. **Noch nicht verfügbare Modi** stehen im Hauptmenü ausgegraut mit «bald». Sie tun nicht so, als wären sie fertig, zeigen aber, was kommt.
30. **Linkshänder und Wischen** sind jetzt in den Einstellungen umstellbar (aus Phase 1 vorbereitet).

### Phase 3

31. **Die Maschine schlägt nicht zurück wie ein Gegner.** Sobald dein Rückschlag in ihrer Hälfte aufspringt, zählt er, und 0,3 s später kommt der nächste Ball. So bleibt der Rhythmus flüssig.
32. **Ein Rückschlag zählt, wenn er im Feld aufspringt.** Aus und Netz kosten ein Leben, genauso wie ein verpasster Ball. Ein langsamer Ball nach einem Rahmentreffer zählt, solange er im Feld landet.
33. **Ohne Obergrenze** heisst: Die Reaktionszeit-Untergrenze aus Phase 1 gilt für die Maschine nicht. Dein eigener Rückschlag bleibt beim Höchsttempo der Stufe, denn die Maschine muss ihn nicht erreichen.
34. **Nach einem verlorenen Leben wird die Maschine 10 % langsamer** (`machine.afterError`). Sonst wären die restlichen Leben bei hohem Tempo in Sekunden weg, ohne echte Chance.
35. **Effekt (Kurve)** ab dem 12. Rückschlag in 45 % der Bälle. Die Kurve ist so gebaut, dass der Aufsprungpunkt exakt bleibt; nach dem Aufsprung springt der Ball zur Seite weg.
36. **Zielscheiben:** zwei gleichzeitig, ohne sich zu überdecken. Sie wandern nach 9 s weiter und werden mit der Zeit kleiner. Getroffen ist eine Scheibe, wenn der Ball sie beim Aufsprung berührt. Bonus 5 Punkte, mit Super-Schlag 10, jeweils mal Kombo-Multiplikator.
37. **Super-Schläge:** zwei pro Leben, weil ein Durchgang kein Ballwechsel im üblichen Sinn ist.
38. **Stufe:** Die gewählte Stufe bestimmt das Starttempo und die Schlägerbreite.
39. **Highscore** steht im Profil (lokale Top 10 mit Name, Punkten, Datum, Höchsttempo) und reist mit dem Export-Code mit. Aufgeben zählt als beendeter Durchgang. Die Rangliste im Menü zeigt diese Top 10; die Weltrangliste folgt in Phase 6.
40. **Tempo-Anzeige in km/h** ist eine Umrechnung des Spieltempos (1 Platzhälfte ≈ 13 m). Ohne Obergrenze können die Zahlen unrealistisch hoch werden, das ist gewollt.
41. **Dauer eines Durchgangs** wurde mit zwei Spielermodellen simuliert (siehe unten). Das Modell «geübter Spieler» zielt meist sicher in die Mitte, wie man es gegen eine Maschine tut.


### Phase 4

42. **Herzschlag über das Präsenz-Objekt:** Jedes Handy erhöht etwa jede Sekunde einen Zähler `hb`. Ändert er sich beim anderen Handy länger als 3 s nicht, pausiert das Spiel. Weil dabei jedes Mal das ganze Präsenz-Objekt neu geschickt wird, kommen auch verlorene Schläge oder Spielstände nach einem kurzen Aussetzer von selbst nochmals an.
43. **Pause:** Das Spiel friert ein («Verbindung unterbrochen … warte»), nach 8 s kommt der Hinweis, ins selbe WLAN zu wechseln. Man kann jederzeit zum Menü zurück.
44. **Weiter nach der Pause:** Der laufende Punkt wird wiederholt. Das eröffnende Handy startet dafür eine neue «Epoche» (`ep`); Schläge aus einer alten Epoche werden ignoriert, damit kein verspäteter Schlag in den neuen Punkt platzt. Das beitretende Handy bittet nur dann um eine Wiederholung (`rq`), wenn nach 1,5 s noch keine neue Epoche da ist.
45. **Spielstand nach dem Wiederverbinden:** Das beitretende Handy übernimmt einmalig den Stand des eröffnenden, auch wenn er kleiner ist. Ein Punkt, den es während des Aussetzers vergeben hat, verfällt; der Punkt wird ja wiederholt.
46. **Kein Hängenbleiben:** Wartet ein Handy länger als 2 s auf den Entscheid des anderen (Ball verpasst oder im Aus), fragt es nach (`ask`); das andere schickt seinen Stand nochmals. Kommt nach 6 s immer noch nichts, wird der Punkt wiederholt.
47. **Neu verbinden (PeerJS):** Das beitretende Handy baut die Verbindung selbst neu auf, wenn es 3,5 s nichts mehr hört. Das eröffnende Handy nimmt eine neue Verbindung jederzeit an und ersetzt damit die alte. Folge: Wer den Code kennt, könnte sich während eines Spiels dazwischenschalten. Für ein Familienspiel ist das in Ordnung.
48. **Fortsetzen nach dem Neuladen:** Das letzte Spiel zu zweit (Code, Rolle, Stand, Stufe) wird 30 Minuten lang lokal gemerkt. Unter «Zu zweit» erscheint dann «Spiel xxxx fortsetzen». Ist die Kennung des eröffnenden Handys beim Vermittlungsserver noch belegt, versucht es das Spiel bis zu sechsmal im Abstand von 2,5 s. Ein fortgesetztes Spiel überspringt das Match-Intro.
49. **STUN und TURN:** Drei öffentliche STUN-Server (Google, Cloudflare) sind fest eingetragen. TURN-Dienste mit Gratis-Kontingent gibt es (z. B. Metered, ExpressTURN, Cloudflare), sie verlangen aber ein eigenes Konto und Zugangsdaten. Deshalb ist TURN vorbereitet, aber leer: `js/config.js`, Anleitung in der README. Ohne TURN gilt: Klappt die Verbindung nicht, ins selbe WLAN wechseln.
50. **Auf claude.ai** verbindet der Live-Raum der Plattform selbst neu. Herzschlag, Pause, Epoche und Nachfragen funktionieren dort gleich, weil sie nur das Präsenz-Objekt nutzen.
51. **Getestet** wurde mit zwei Browser-Tabs und einem Test-Schalter, der alle Daten eines Tabs für einige Sekunden verwirft (wie WLAN aus). Ein echter Netzwechsel am Handy ist damit nicht abgedeckt.

---

## Balance-Auswertung

Erzeugt mit `node tools/simulate.mjs 500` (Computer gegen Computer, 500 Punkte pro Stufe, fester Startwert). «Gewinnschlag» heisst: Der Empfänger hat den Ball nicht erreicht.


| Stufe | Schläge Ø | Median | Aus | Netz | Doppelfehler | Gewinnschlag | davon Ass | 1. Aufschlag Fehler | Netzroller | Let | kürzeste Flugzeit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Leicht | 7.7 | 6 | 10.0 % | 6.8 % | 7.4 % | 75.8 % | 10.2 % | 43.8 % | 161 | 30 | 1.06 s (min. 0.4) |
| Mittel | 7.5 | 6 | 12.0 % | 6.8 % | 5.8 % | 75.4 % | 11.2 % | 33.8 % | 146 | 24 | 0.37 s (min. 0.32) |
| Schwer | 7.9 | 5 | 18.4 % | 6.0 % | 3.0 % | 72.6 % | 9.2 % | 28.8 % | 183 | 26 | 0.29 s (min. 0.26) |

Gegenprobe mit 3000 Punkten pro Stufe (`node tools/simulate.mjs 3000`):

| Stufe | Schläge Ø | Median | Aus | Netz | Doppelfehler | Gewinnschlag | davon Ass | 1. Aufschlag Fehler | Netzroller | Let | kürzeste Flugzeit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Leicht | 7.8 | 6 | 9.0 % | 5.6 % | 7.2 % | 78.2 % | 12.1 % | 41.2 % | 936 | 162 | 1.06 s (min. 0.4) |
| Mittel | 7.3 | 5 | 13.1 % | 5.6 % | 5.1 % | 76.3 % | 12.0 % | 34.8 % | 862 | 147 | 0.37 s (min. 0.32) |
| Schwer | 8.3 | 6 | 18.7 % | 6.3 % | 3.0 % | 72.0 % | 10.6 % | 30.0 % | 954 | 137 | 0.29 s (min. 0.26) |

**Bewertung (Mittel):** Ballwechsel im Mittel 7 bis 8 Schläge, Aus 13 bis 15 %, Doppelfehler 4 bis 6 %: alle drei Richtwerte erfüllt. Die kürzeste Flugzeit liegt auf jeder Stufe über der Untergrenze. Netzroller kommen in etwa jedem 25. Ball vor, der das Netz überquert.

### Ballmaschine

Erzeugt mit `node tools/simulate.mjs machine 300`. Der Computergegner spielt als Ersatz für einen Menschen; «geübter Spieler»: schneller Schläger, zielt genauer, kaum Winkel.

| Spieler | Dauer Ø | Dauer Median | Punkte Ø | Rückschläge Ø | beste Kombo Ø | Höchsttempo Ø |
|---|---|---|---|---|---|---|
| Gelegenheitsspieler | 2:05 | 2:14 | 149 | 55 | 36 | 190 km/h |
| geübter Spieler | 2:25 | 2:28 | 231 | 77 | 53 | 309 km/h |

**Bewertung:** Ein geübter Spieler kommt im Mittel auf knapp 2½ Minuten pro Durchgang, ein Gelegenheitsspieler auf gut 2 Minuten. Der Richtwert «2 bis 5 Minuten» ist erfüllt. Stellschrauben: `machine.growth` (Tempozuwachs pro Rückschlag), `machine.lives`, `machine.afterError`.

**Hinweis:** Die Simulation misst den Computer gegen sich selbst. Wie sich ein Satz für einen Menschen anfühlt, entscheidet der Test am Handy. Die wichtigsten Stellschrauben dafür: `levels[].ai.err` (Treffsicherheit des Computers), `zones` (Risiko der Schlägerkante), `serve.first/second` (Zeitfenster beim Aufschlag).
