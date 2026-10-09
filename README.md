# Netzroller

Tennis für zwei Handys. Beide sehen den ganzen Platz von oben, jedes Handy steuert den eigenen Schläger. Allein spielst du gegen den Computer.

**Jetzt spielen:** https://pascalbenz78-design.github.io/netzroller/

## Start und Menü

Beim ersten Start am Tag läuft ein kurzes Intro im Stadion (antippen überspringt es). Danach kommt das Hauptmenü:

- **Schnelles Spiel:** ein Kurzsatz gegen den Computer, Stufe darüber wählbar.
- **Zu zweit:** zwei Handys, ein Code (siehe unten).
- **Einstellungen:** Name und Land (für die Flagge), Ton, Schiedsrichter-Stimme, Vibration, Linkshänder (Super-Knopf links), Super-Schlag per Wischen, Intro beim Start. Mit **Profil mitnehmen** bekommst du einen Code, den du auf einem anderen Gerät wieder einfügst.
- Ballmaschine, Karriere, Turnier zu zweit und Rangliste kommen später dazu.

Vor jedem Match stellt ein kurzes Intro beide Spieler mit Flagge vor, eine Münze entscheidet, wer zuerst aufschlägt.

## So spielt ihr zu zweit

1. Beide öffnen die Seite auf dem Handy und tippen auf **Zu zweit**.
2. Handy 1 tippt auf **Spiel eröffnen** und bekommt einen vierstelligen Code. Mit **Link teilen** kannst du den Link mit dem Code direkt verschicken.
3. Handy 2 gibt den Code ein und tippt auf **Los**.

Am besten seid ihr im selben WLAN. Über das Mobilfunknetz klappt die Verbindung meistens auch, aber nicht in jedem Netz (siehe unten).

## Steuerung

| | Handy | PC |
|---|---|---|
| Schläger bewegen | Finger nach links und rechts ziehen | Maus oder Pfeiltasten (wird schneller, je länger du drückst) |
| Aufschlag: Ball hochwerfen | Tippen | Klick oder Leertaste |
| Aufschlag: schlagen | Nochmals tippen, wenn der Ring am kleinsten ist | Klick oder Leertaste |
| Super-Schlag laden | Knopf «Super» unten rechts oder schnell senkrecht nach oben wischen | Pfeil nach oben oder S |

Du kannst mit zwei Fingern spielen: Ein Finger liegt auf «Super», der andere steuert weiter den Schläger.

## Regeln

### Der Ballwechsel

- Der Ball prallt nicht mehr an einer Bande ab. Jeder Schlag springt irgendwo auf, und dort bleibt kurz ein **Ballabdruck**.
- **Aus** ist ein Aufsprung neben den inneren Seitenlinien (die dunkleren Gassen am Rand sind Aus) oder hinter der Grundlinie. Berührt der Ball die Linie, ist er drin.
- **Wo der Ball den Schläger trifft, ist entscheidend:**
  - Mitte: sicher, der Ball fliegt in die Feldmitte.
  - Aussen: scharfer Winkel Richtung Seitenlinie. Ganz aussen geht er ins Aus.
  - Rahmen (der äusserste Rand): Der Ball fliegt unkontrolliert ins Netz, ins Aus oder langsam ins Feld.
- Mit jedem Schlag wird der Ball etwas schneller.
- **Netzroller:** Ab und zu streift ein Ball die Netzkante. Er wird langsamer und fällt kurz hinter das Netz.

### Aufschlag

- Aufgeschlagen wird abwechselnd von rechts (Einstand-Seite) und links (Vorteil-Seite) der Mitte, **diagonal ins Aufschlagfeld**. Das Zielfeld leuchtet.
- Erst tippen: Der Ball fliegt hoch, ein Ring zieht sich um ihn zusammen. Tippst du, wenn der Ring am kleinsten ist (gelb), wird der Aufschlag schnell und genau. Zu früh: Netz. Zu spät: zu lang.
- Wo dein Schläger beim Schlagen steht, bestimmt die Richtung: nahe der Mitte zielt in die Feldmitte, ganz aussen nach aussen.
- Geht der erste Aufschlag daneben, gibt es einen **zweiten Aufschlag**: langsamer, mit mehr Zeit. Zwei Fehler sind ein **Doppelfehler**, der Punkt geht an den Gegner.
- Streift der Aufschlag das Netz und landet im Feld, ist das ein **Let**: Der Aufschlag wird wiederholt.

### Schiedsrichter, Hawk-Eye und Publikum

- Ein Schiedsrichter ruft Aus, Netz, Let, Fehler und den Spielstand aus («Dreissig beide», «Vorteil Pascal»). Hat das Gerät keine deutsche Stimme, erscheinen die Rufe nur als Banner. Die Stimme lässt sich in den Einstellungen abschalten.
- **Hawk-Eye:** Entscheidet ein knapper Ball den Punkt (weniger als ein Balldurchmesser von der Linie), zeigt eine Zoom-Wiederholung den Aufsprung und den Entscheid «IN» oder «AUS». Antippen überspringt sie.
- Das Publikum raunt bei knappen Bällen, klatscht nach langen Ballwechseln und jubelt bei Spiel- und Satzgewinn.

### Super-Schlag

Jeder hat pro Ballwechsel zwei davon. Der geladene Schlag fliegt deutlich schneller und tiefer. Mit der Schlägermitte getroffen ist er sicher, mit der Kante geht er leicht ins Aus. Damit kein Ball unhaltbar wird, gibt es pro Stufe ein Höchsttempo.

### Zählweise

Wie im Tennis: 15, 30, 40, Einstand, Vorteil. Wer zuerst **3 Spiele** gewinnt, holt den Satz. Der Aufschlag wechselt nach jedem Spiel.

### Schwierigkeitsstufen

| Stufe | Tempo | Schläger | Computer |
|---|---|---|---|
| Leicht | langsamer Start, wird langsam schneller | breit | macht viele Fehler |
| Mittel | normales Tempo | normal | ausgeglichen |
| Schwer | startet schnell und wird rasch schneller | schmal | trifft genauer, spielt mehr Winkel und Super-Schläge |

Zu zweit gilt die Stufe von der Person, die das Spiel eröffnet.

## Technik

- Statische Website ohne Build-Schritt: [`index.html`](index.html) und die Module unter [`js/`](js). Alle Zahlenwerte stehen in [`js/balance.js`](js/balance.js), alle Texte in [`js/texts.js`](js/texts.js).
- Spielkonzept, Entscheide und Balance-Auswertung: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
- Die Handys verbinden sich direkt über WebRTC. Dafür wird [PeerJS](https://peerjs.com) 1.5.5 von jsDelivr geladen. Der öffentliche PeerJS-Server vermittelt nur den Verbindungsaufbau, die Spieldaten gehen direkt von Handy zu Handy.
- Jeder Schlag wird als kleiner Datensatz verschickt (Startpunkt, Aufsprungpunkt, Tempo, Aus/Netz, Netzroller). Beide Handys berechnen daraus denselben Flug. Den Punkt vergibt das Handy, das den Ball bekommt.
- In manchen Netzen (z. B. Firmen-WLAN oder einige Mobilfunkanbieter) lässt sich keine direkte Verbindung aufbauen. Dann hilft es, ins selbe WLAN zu wechseln.
- Läuft die Seite als Artifact auf claude.ai, nutzt sie dort stattdessen den Live-Raum von claude.ai.
- Profil und Einstellungen merkt sich der Browser lokal (`localStorage`). Es gibt kein Konto und kein Tracking.
- Intro, Töne, Publikum, Flaggen und Stimme werden im Browser erzeugt (Canvas, Web Audio, Web Speech). Es werden keine Bilder, Videos oder Tondateien geladen.

## Lokal starten

Die Seite besteht aus mehreren Dateien (JavaScript-Module) und braucht deshalb einen kleinen Webserver. Mit [Node.js](https://nodejs.org):

```bash
node tools/serve.mjs 8080
```

Danach `http://localhost:8080` öffnen. Für den Test mit zwei Geräten im selben WLAN die IP-Adresse des PCs statt `localhost` verwenden.

Die Balance lässt sich ohne Browser prüfen. Der Befehl lässt den Computer 500 Punkte pro Stufe gegen sich selbst spielen und zeigt, wie die Punkte enden:

```bash
node tools/simulate.mjs 500
```
