# Netzroller

Tennis für zwei Handys. Beide sehen den ganzen Platz von oben, jedes Handy steuert den eigenen Schläger. Allein spielst du gegen den Computer.

**Jetzt spielen:** https://pascalbenz78-design.github.io/netzroller/

## So spielt ihr zu zweit

1. Beide öffnen die Seite auf dem Handy.
2. Handy 1 tippt auf **Spiel eröffnen** und bekommt einen vierstelligen Code. Mit **Link teilen** kannst du den Link mit dem Code direkt verschicken.
3. Handy 2 gibt den Code ein und tippt auf **Los**.

Am besten seid ihr im selben WLAN. Über das Mobilfunknetz klappt die Verbindung meistens auch, aber nicht in jedem Netz (siehe unten).

## Steuerung

| | Handy | PC |
|---|---|---|
| Schläger bewegen | Finger nach links und rechts ziehen | Maus oder Pfeiltasten |
| Aufschlagen | Tippen | Klick oder Leertaste |
| Super-Schlag laden | Knopf «Super» oder schnell nach oben wischen | Pfeil nach oben oder S |

Wo der Ball den Schläger trifft, bestimmt den Winkel. Mit jedem Schlag wird der Ball etwas schneller.

## Regeln

- Gezählt wird wie im Tennis: 15, 30, 40, Einstand, Vorteil.
- Wer zuerst **3 Spiele** gewinnt, holt den Satz. Der Aufschlag wechselt nach jedem Spiel.
- **Super-Schlag:** Jeder hat pro Ballwechsel zwei davon. Der geladene Schlag fliegt 2,2-mal so schnell. Der Rückschlag hat wieder normales Tempo.

### Schwierigkeitsstufen

| Stufe | Tempo | Schläger |
|---|---|---|
| Leicht | langsamer Start, wird kaum schneller | breit |
| Mittel | normales Tempo | normal |
| Schwer | startet schnell und wird rasch schneller | schmal |

Zu zweit gilt die Stufe von der Person, die das Spiel eröffnet.

## Technik

- Eine einzige Datei: [`index.html`](index.html) mit HTML, CSS und JavaScript. Kein Build-Schritt, keine Installation.
- Die Handys verbinden sich direkt über WebRTC. Dafür wird [PeerJS](https://peerjs.com) 1.5.5 von jsDelivr geladen. Der öffentliche PeerJS-Server vermittelt nur den Verbindungsaufbau, die Spieldaten gehen direkt von Handy zu Handy.
- In manchen Netzen (z. B. Firmen-WLAN oder einige Mobilfunkanbieter) lässt sich keine direkte Verbindung aufbauen. Dann hilft es, ins selbe WLAN zu wechseln.
- Läuft die Seite als Artifact auf claude.ai, nutzt sie dort stattdessen den Live-Raum von claude.ai.
- Name und gewählte Stufe merkt sich der Browser lokal (`localStorage`).

## Lokal starten

Die Seite braucht einen Webserver, damit die Verbindung zwischen zwei Geräten klappt. Zum Beispiel:

```bash
npx serve .
```

Danach `http://localhost:3000` öffnen. Für den Test mit zwei Geräten im selben WLAN die IP-Adresse des PCs statt `localhost` verwenden.
