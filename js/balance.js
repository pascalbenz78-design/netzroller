// Alle Zahlenwerte des Spiels an einem Ort. Anpassen, neu laden, fertig.
//
// Koordinaten (siehe docs/GAME_DESIGN.md, «Entscheide»):
//   x  quer über den Platz in Platzbreiten, 0 = linker Rand, 1 = rechter Rand.
//   v  längs, normiert: -1 = Schlägerlinie oben (Gegner), 0 = Netz, +1 = eigene Schlägerlinie.
//   d  Fortschritt eines Schlags: 0 = Schläger des Schlagenden, 1 = Netz, 2 = Schläger des Empfängers.
// Tempo wird in d pro Sekunde gemessen (2 = einmal von Schläger zu Schläger in 1 s).

export const BALANCE = {
  court: {
    doublesL: 0.04, doublesR: 0.96,     // Doppel-Seitenlinien (Gassen sind Aus)
    singlesL: 0.155, singlesR: 0.845,   // Einzel-Seitenlinien
    baseline: 0.88,                     // Grundlinie, Abstand vom Netz (v)
    serviceLine: 0.475,                 // Aufschlaglinie, Abstand vom Netz (v)
    ballR: 0.032,                       // Ballradius quer (Platzbreiten)
    ballRV: 0.035,                      // Ballradius längs (v); Linie berührt = drin
    bounceMax: 0.98,                    // tiefster Aufsprung (v), immer vor der Schlägerlinie
  },

  levels: [
    {
      name: "Leicht", base: 0.85, max: 1.9, up: 1.05, hw: 0.17, minReaction: 0.40,
      ai: { speed: 0.60, reaction: 0.26, err: 0.55, angleRate: 0.15, superRate: 0.00,
            serve: { perfect: 0.10, fault1: 0.40, fault2: 0.17 } },
    },
    {
      name: "Mittel", base: 1.15, max: 2.5, up: 1.07, hw: 0.15, minReaction: 0.32,
      ai: { speed: 0.80, reaction: 0.22, err: 0.50, angleRate: 0.24, superRate: 0.12,
            serve: { perfect: 0.25, fault1: 0.35, fault2: 0.14 } },
    },
    {
      name: "Schwer", base: 1.6, max: 3.2, up: 1.08, hw: 0.13, minReaction: 0.26,
      ai: { speed: 1.10, reaction: 0.18, err: 0.36, angleRate: 0.38, superRate: 0.25,
            serve: { perfect: 0.40, fault1: 0.30, fault2: 0.10 } },
    },
  ],

  // Schlägerzonen, gemessen als Abstand Ball–Schlägermitte im Verhältnis zur halben Schlägerbreite.
  zones: {
    center: 0.60,          // bis hier: sicher, moderater Winkel
    outer: 0.92,           // bis hier: scharfer Winkel; dahinter Rahmen
    centerAim: 0.55,       // Mitte zielt höchstens so weit nach aussen (Anteil der halben Einzelbreite)
    outerAimMax: 1.12,     // Aussenzone ganz aussen: über die Linie hinaus = Aus (ab Trefferabstand ≈ 0,90)
    aimNoise: 0.05,        // Streuung des Zielpunkts quer
    paddleInfluence: 0.10, // Schlägerbewegung verstärkt den Winkel …
    paddleAimMax: 0.15,    // … aber höchstens so viel
  },

  // Rahmentreffer: was mit dem Ball passiert (Rest = harmloser, langsamer Ball ins Feld)
  frame: { net: 0.25, out: 0.22, weakSpeed: 0.55 },

  // Tiefe des Aufsprungs: 0 = Aufschlaglinie, 1 = Grundlinie, > 1 = lang (Aus)
  depth: {
    normal: [0.30, 0.90],
    superCenter: [0.70, 0.98],
    superOuter: [0.80, 1.18],
    frameLong: [1.06, 1.25],
    frameWeak: [-0.6, 0.2],
  },

  superMult: 2.2,          // Super-Schlag = normales Tempo × 2,2 (begrenzt durch minReaction)
  supersPerRally: 2,

  netcord: {
    chance: 0.04,          // pro Ball, der das Netz überquert
    slow: 0.5,             // Tempo nach dem Netzroller
    deflect: 0.06,         // seitliche Ablenkung (Platzbreiten)
    bounce: [0.10, 0.32],  // Aufsprung kurz hinter dem Netz (v)
  },

  serve: {
    tossTime: 1.1,                              // Ball hoch und wieder unten (s)
    first: { perfect: 0.10, good: 0.30 },        // Zeitfenster als Abweichung vom höchsten Punkt (0..1)
    ace: 0.05,                                  // erster Aufschlag noch genauer getroffen: darf unerreichbar sein (Ass)
    second: { perfect: 0.12, good: 0.55 },
    speed: { perfect: 1.8, good: 1.35, second: 0.95 },  // × Grundtempo der Stufe
    zoneInner: 0.53, zoneOuter: 0.80,           // Aufschlagposition: nahe Mitte = «Mitte», aussen = «nach aussen»
    depthPerfect: [0.86, 0.97],                 // × Aufschlaglinie
    depthGood: [0.50, 0.85],
    long: [0.08, 0.22],                         // zu spät: so weit hinter der Aufschlaglinie
    goodPull: 0.4,                              // normaler Aufschlag wird zur Feldmitte gezogen
    height: 0.16,                               // Wurfhöhe (Darstellung)
  },

  // Jeder Ball im Feld muss erreichbar sein: An der Schlägerlinie des Empfängers kommt er innerhalb dieses Bands an
  // (Anteil der Breite). Wer weit laufen muss, bekommt dafür etwas mehr Zeit (lateral: Platzbreiten pro Sekunde).
  reach: { band: [0.07, 0.93], lateral: 2.4 },

  flight: { arc: 0.10, arcSuper: 0.05, arcAfter: 0.06, afterBounce: 0.92 },

  keyboard: { start: 0.8, max: 2.8, accel: 6.0 },     // Platzbreiten/s, Beschleunigung pro s
  touch: { swipeMin: 70, swipeRatio: 2.5, swipeTime: 300 },

  // Hawk-Eye: knapp = Aufsprung näher an der Linie als gap × Ballradius (2 = ein Balldurchmesser)
  hawk: { gap: 2, dur: 1.7, durReduced: 0.8 },
  crowd: { applauseFrom: 8 },      // Applaus ab so vielen Schlägen im Ballwechsel

  // Ballmaschine (Endlos-Modus): wird mit jedem Rückschlag schneller, ohne Obergrenze
  machine: {
    lives: 3,
    startSpeed: 1.0,          // × Grundtempo der Stufe
    growth: 1.025,             // pro zurückgespieltem Ball
    afterError: 0.9,          // nach einem verlorenen Leben wird die Maschine etwas langsamer
    firstDelay: 1.4,          // s bis zum ersten Ball (und nach einem verlorenen Leben)
    nextDelay: 0.3,           // s nach dem Aufsprung deines Rückschlags bis zum nächsten Ball
    spread: { start: 0.35, perReturn: 0.012, max: 1.0 },          // Winkel: zuerst mittig, dann bis an die Linie
    spin: { from: 12, chance: 0.45, amount: [0.04, 0.11] },        // Effekt ab dem 12. Rückschlag
    moveRange: [0.3, 0.7],    // die Maschine verschiebt sich zwischen den Bällen
    supersPerLife: 2,
    pointsPerReturn: 1,
    combo: [[50, 4], [25, 3], [10, 2]],                            // ab so vielen Rückschlägen ohne Fehler: × Punkte
    targets: { count: 2, r: 0.08, rMin: 0.05, shrinkPer: 0.0006, ttl: 9, bonus: 5, superMult: 2, area: [0.18, 0.84] },
    kmhPerSpeed: 47,          // Anzeige: Tempo (d/s) in km/h, Platz ≈ 13 m pro d
    topCount: 10,
  },

  // Beläge: Tempo (× Grundtempo), Netzroller (× Wahrscheinlichkeit), Effekt (seitliche Kurve), Farben
  surfaces: {
    hard:   { speed: 1.0,  netcord: 1.0, spin: 0,    court: "#2456a0", surround: "#2c6a52" },
    clay:   { speed: 0.84, netcord: 1.0, spin: 0.02, court: "#b8582f", surround: "#8f4526" },
    clay2:  { speed: 0.82, netcord: 1.0, spin: 0.05, court: "#b8582f", surround: "#8f4526" },   // Sand mit mehr Effekt
    indoor: { speed: 1.12, netcord: 0.5, spin: 0,    court: "#3a3d8f", surround: "#22244f" },
    grass:  { speed: 1.1,  netcord: 2.0, spin: 0,    court: "#4f9a46", surround: "#3b7a35" },
  },

  // Karriere: Tour mit 63 Computerspielern und dir
  career: {
    // Stufen der Karriere: Aargau → Schweiz → Europa → Welt. Spieler in tiers.js, Turniernamen in texts.js (tierTournaments).
    // pools: wer mitspielt (Ranglistenbereich der Computerspieler), entry: Mindest-Rangierung (sonst Wildcard),
    // promoteTop: ab diesem Rang ist der Aufstieg in die nächste Stufe möglich, frühestens nach minPlay Turnieren in der Stufe.
    tiers: [
      { id: "AG", promoteTop: 5, minPlay: 4,
        tournaments: [
          { cat: "club", size: 8, surface: "clay" }, { cat: "club", size: 8, surface: "hard" },
          { cat: "club", size: 8, surface: "indoor" }, { cat: "region", size: 16, surface: "clay" },
        ],
        pools: { club: [1, 16], region: [1, 16] }, entry: {} },
      { id: "CH", promoteTop: 5, minPlay: 6,
        tournaments: [
          { cat: "250", size: 16, surface: "hard" }, { cat: "250", size: 16, surface: "clay" },
          { cat: "500", size: 16, surface: "indoor" }, { cat: "250", size: 16, surface: "grass" },
          { cat: "500", size: 16, surface: "hard" }, { cat: "national", size: 16, surface: "clay" },
        ],
        pools: { "250": [9, 32], "500": [3, 30], national: [1, 20] }, entry: {} },
      { id: "EU", promoteTop: 8, minPlay: 7,
        tournaments: [
          { cat: "250", size: 16, surface: "indoor" }, { cat: "250", size: 16, surface: "clay" },
          { cat: "500", size: 16, surface: "clay2" }, { cat: "500", size: 16, surface: "hard" },
          { cat: "1000", size: 32, surface: "hard", stronger: 25 }, { cat: "500", size: 16, surface: "grass" },
          { cat: "final", size: 8, surface: "indoor" },
        ],
        pools: { "250": [13, 48], "500": [5, 44], "1000": [1, 34], final: [1, 8] }, entry: { "1000": 24 } },
      { id: "WORLD", promoteTop: 0,
        tournaments: [
          { cat: "250", size: 16, surface: "hard" }, { cat: "250", size: 16, surface: "clay" },
          { cat: "250", size: 16, surface: "indoor" }, { cat: "500", size: 16, surface: "clay2" },
          { cat: "1000", size: 32, surface: "hard", stronger: 40 }, { cat: "500", size: 16, surface: "grass" },
          { cat: "GS", size: 32, surface: "grass", finalSets: 2 }, { cat: "final", size: 8, surface: "indoor" },
        ],
        pools: { "250": [17, 64], "500": [8, 56], "1000": [1, 40], GS: [1, 40], final: [1, 8] }, entry: { "1000": 32, GS: 32 } },
    ],
    // Ranglistenpunkte: W Sieger, F Final, SF Halbfinal, QF Viertelfinal, R16 Achtelfinal, R32 1. Runde
    points: {
      GS:     { W: 2000, F: 1200, SF: 720, QF: 360, R16: 180, R32: 10 },
      "1000": { W: 1000, F: 600,  SF: 360, QF: 180, R16: 90,  R32: 10 },
      "500":  { W: 500,  F: 300,  SF: 180, QF: 90,  R16: 0 },
      "250":  { W: 250,  F: 150,  SF: 90,  QF: 45,  R16: 0 },
      national: { W: 500, F: 300,  SF: 180, QF: 90,  R16: 10 },    // Schweizer Meisterschaft
      region: { W: 150,  F: 90,   SF: 50,  QF: 25,  R16: 5 },      // Aargauer Meisterschaft
      club:   { W: 60,   F: 36,   SF: 20,  QF: 5 },                // Clubturnier (8er-Feld)
      final:  { group: 200, SF: 400, F: 500 },       // pro Gruppensieg, Halbfinal gewonnen, Final gewonnen
    },
    // Rangliste: Es zählen die Punkte so vieler Turniere, wie die Stufe pro Saison hat (rollend)
    roundBoost: 22,                                  // Gegner spielen pro Runde stärker (Rating-Punkte)
    elo: 320,                                        // Hintergrund-Simulation: Rating-Unterschied für 10:1
    ratingRange: [850, 2000],                        // Rating → Spielstärke 0 … 1 (Aargau ≈ 0 … 0,3, Welt ≈ 0,65 … 1)
    // Spielstärke 0 → 1 (schwach → stark), daraus die Werte des Computergegners
    ai: {
      err: [0.70, 0.32], speed: [0.55, 1.25], reaction: [0.27, 0.16], angleRate: [0.12, 0.32], superRate: [0.02, 0.2],
      servePerfect: [0.1, 0.4], fault1: [0.42, 0.28], fault2: [0.2, 0.08],
    },
    // Spielstile verändern die Werte (× bzw. +)
    styles: {
      wall:     { hw: 0.03, speed: 0.85, err: 0.75, angleRate: 0.4, superRate: 0.2, fault1: 0.8, fault2: 0.6 },
      cannon:   { superRate: 3.0, servePerfect: 1.6, fault1: 1.35, fault2: 1.5, err: 1.12, up: 0.01 },
      angle:    { angleRate: 2.2, err: 1.05 },
      counter:  { up: 0.045, err: 0.95 },                                  // nimmt dein Tempo auf und spielt schneller zurück
      allround: {},
    },
    format: { normal: { gw: 3, sw: 2 }, final: { gw: 3, sw: 3 } },   // zwei Gewinnsätze, im Final drei; jeder Satz bis 3 Spiele
    colors: [                                        // Schlägerfarben (nur Optik) und wann sie freigeschaltet werden
      { id: "classic", color: "#dff23c" },
      { id: "red",     color: "#e5484d", wins: 1 },
      { id: "blue",    color: "#4aa8ff", wins: 10 },
      { id: "gold",    color: "#f2c94c", titles: 1 },
      { id: "violet",  color: "#b38cff", tier: "CH" },   // Aufstieg in die Schweiz
      { id: "white",   color: "#f4f7f2", tier: "EU" },    // Aufstieg nach Europa
      { id: "platin",  color: "#9fe7ff", tier: "WORLD" }, // Aufstieg auf die Welt-Tour
    ],
  },

  // Turnier zu zweit: Feldgrösse, Kategorie (Anzeige), mögliche Beläge
  duoTour: { size: 16, cat: "250", surfaces: ["hard", "clay", "indoor", "grass"] },   // Gegner aus der Stufe der Karriere des eröffnenden Handys

  match: { gamesToWin: 3 },
  timing: { pointPause: 0.9, faultPause: 0.8, holdMax: 1.2, aiServeDelay: [0.6, 1.0] },
};
