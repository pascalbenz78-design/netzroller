// Alle Texte des Spiels. Schweizer Schreibweise: «ss», nie «ß».
// Im HTML tragen Elemente data-t="schlüssel"; main.js setzt beim Start den Text von hier ein.

export const T = {
  brandA: "Netz", brandB: "roller",
  lede: "Tennis für zwei Handys. Beide sehen den ganzen Platz, jedes Handy steuert den eigenen Schläger.",
  nameLabel: "Dein Name", namePlaceholder: "z. B. Pascal",
  levelLabel: "Schwierigkeit",
  levelHints: [
    "Langsamer Ball, breiter Schläger.",
    "Normales Tempo.",
    "Der Ball startet schon schnell und wird rasch schneller, der Schläger ist schmaler.",
  ],
  host: "Spiel eröffnen", orJoin: "oder beitreten", join: "Los", codePlaceholder: "code", codeLabel: "Spielcode",
  solo: "Allein gegen den Computer",
  helpServeLabel: "Aufschlag:",
  helpServe: "Einmal tippen wirft den Ball hoch, nochmals tippen schlägt. Am besten, wenn der Ring am kleinsten ist. Wo dein Schläger steht, bestimmt die Richtung.",
  helpSuperLabel: "Super-Schlag:",
  helpSuper: "Zweimal pro Ballwechsel. Tippe auf «Super» unten rechts oder wische schnell senkrecht nach oben. Der nächste Schlag fliegt schneller und tiefer, mit der Schlägerkante getroffen aber leicht ins Aus.",
  helpPcLabel: "Am PC:",
  helpPc: "Maus oder Pfeiltasten bewegen den Schläger, Klick oder Leertaste schlägt auf, Pfeil nach oben oder S lädt den Super-Schlag.",
  connecting: "Verbinde …",
  needClaude: "Zu zweit spielen klappt nur, wenn du die Seite angemeldet auf claude.ai öffnest. Gegen den Computer geht es immer.",
  codeFormat: "Der Code hat 4 Zeichen.",
  joinFailed: "Beitreten hat nicht geklappt. Versuch es nochmals.",
  waitingText: "Öffne diese Seite auf dem zweiten Handy und gib dort den Code ein. Sobald beide drin sind, geht es los.",
  share: "Link teilen", shareCopied: "Link kopiert", shareText: "Spiel Netzroller mit mir",
  cancel: "Abbrechen", again: "Revanche", backMenu: "Zurück zum Menü",
  fullscreen: "Vollbild", windowed: "Fenster", giveUp: "Aufgeben",
  turnPhone: "Handy hochkant halten", turnPhoneText: "Netzroller spielt man im Hochformat.",
  superBtn: "Super",
  you: "Du", opponent: "Gegner", computer: "Computer",

  // Hauptmenü
  hello: name => `Hallo, ${name}`, helloAnon: "Hallo! Deinen Namen setzt du in den Einstellungen.",
  modeQuick: "Schnelles Spiel", modeQuickSub: "Kurzsatz gegen den Computer",
  modeDuo: "Zu zweit", modeDuoSub: "Zwei Handys, ein Code",
  modeMachine: "Ballmaschine", modeCareer: "Karriere", modeDuoTour: "Turnier zu zweit", modeRanking: "Rangliste",
  soon: "bald",
  settings: "Einstellungen", introWatch: "Intro ansehen", back: "Zurück",
  duoTitle: "Zu zweit",

  modeMachineSub: "Endlos, mit Highscore", modeRankingSub: "Deine Top 10",

  // Ballmaschine
  machine: "Ballmaschine", machineStart: "Ballmaschine läuft",
  machineStatus: (lv, n) => `Ballmaschine · ${lv} · ${n} Rückschläge`,
  mPoints: "Punkte", mCombo: "Kombo", mLives: "Leben", mSpeed: "km/h",
  livesAria: (n, m) => `${n} von ${m} Leben`,
  targetHit: n => `Ziel! +${n}`, comboUp: m => `Kombo ×${m}`,
  lifeLost: n => (n === 1 ? "Noch 1 Leben" : `Noch ${n} Leben`),
  runOver: "Durchgang vorbei", newRecord: "Neuer Rekord!", againMachine: "Nochmal",
  runText: (p, c, k) => `${p} Punkte · beste Kombo ${c} · bis ${k} km/h`,
  ranking: "Rangliste", rankingSub: "Ballmaschine · deine Top 10 auf diesem Gerät",
  rankingEmpty: "Noch keine Einträge. Spiel eine Runde gegen die Ballmaschine.",
  rankingWorld: "Die Weltrangliste mit Familie und Freunden kommt in einer späteren Version.",
  rankPoints: n => `${n} P.`, rankKmh: k => `${k} km/h`,

  // Einstellungen
  profile: "Profil", landLabel: "Land",
  setSound: "Ton", setVoice: "Schiedsrichter-Stimme", setVibration: "Vibration",
  setLefty: "Linkshänder (Super-Knopf links)", setSwipe: "Super-Schlag per Wischen", setIntro: "Intro beim Start (höchstens einmal pro Tag)",
  transfer: "Profil mitnehmen", transferHelp: "Mit dem Code nimmst du Name, Land und Einstellungen auf ein anderes Gerät mit.",
  exportBtn: "Code anzeigen", copy: "Kopieren", copied: "Code kopiert.", copyManual: "Kopieren ging nicht. Der Code ist markiert, kopiere ihn von Hand.",
  importPlaceholder: "Code hier einfügen", importBtn: "Profil laden",
  imported: "Profil geladen.", importBad: "Dieser Code passt nicht. Er beginnt mit «NR1.».",
  noVoice: "Auf diesem Gerät gibt es keine deutsche Stimme. Die Rufe erscheinen nur als Banner.",

  // Intro
  introTap: "Antippen", introSkip: "Überspringen",

  // Match-Intro
  vs: "gegen", quickEvent: lv => `Schnelles Spiel · ${lv}`, duoEvent: lv => `Zu zweit · ${lv}`,
  firstServe: (who, you) => (you ? "Du schlägst auf" : `${who} schlägt auf`), tapSkip: "Antippen zum Überspringen",

  // Hawk-Eye
  hawk: "Hawk-Eye", hawkIn: "IN", hawkOut: "AUS",

  // Schiedsrichter (gesprochen)
  sayOut: "Aus!", sayNet: "Netz!", sayLet: "Let", sayFault: "Fehler", sayDoubleFault: "Doppelfehler",
  sayDeuce: "Einstand", sayAdv: who => `Vorteil ${who}`,
  sayGame: who => `Spiel ${who}`, sayMatch: who => `Spiel, Satz und Sieg ${who}`,
  sayNumbers: ["null", "fünfzehn", "dreissig", "vierzig"],
  sayAll: n => `${n} beide`,

  // Spielverlauf
  start: "Spiel beginnt",
  status: (lv, games) => `${lv} · Kurzsatz bis ${games} Spiele`,
  deuce: "Einstand", adv: who => `Vorteil ${who}`, advYou: "Vorteil du",
  gameYou: "Spiel für dich", gameOpp: who => `Spiel ${who}`,
  setYou: "Satz für dich", setOpp: who => `Satz ${who}`,
  won: "Gewonnen", lost: "Verloren",
  overText: (me, op, who, lv) => `Satz ${me} : ${op} gegen ${who} · ${lv}`,
  out: "Aus!", net: "Netz!", netcord: "Netzroller!", let: "Let",
  fault: "Fehler", doubleFault: "Doppelfehler", ace: "Ass!",
  superShot: "Super-Schlag",
  serve1: "1. Aufschlag", serve2: "2. Aufschlag",
  hintServe: "Tippen: Ball hochwerfen",
  hintToss: "Nochmals tippen, wenn der Ring am kleinsten ist",
  hintOppServe: who => `${who} schlägt auf`,
  hintWait: "Warte auf Gegner",
  sideDeuce: "Einstand-Seite", sideAd: "Vorteil-Seite",

  // Verbindung (Phase 4)
  netPaused: "Verbindung unterbrochen", netWaiting: who => `Warte auf ${who} …`,
  netHint: "Klappt es nicht? Wechselt beide ins selbe WLAN. Das Spiel geht danach mit demselben Spielstand weiter.",
  replay: "Punkt wird wiederholt", resumed: "Weiter geht's", resume: code => `Spiel ${code} fortsetzen`,

  // Direktverbindung
  p2pLoadFailed: "PeerJS konnte nicht geladen werden. Bist du online?",
  p2pNoBroker: "Keine Verbindung zum Vermittlungsserver.",
  p2pIdTaken: "Diesen Code gibt es schon. Eröffne nochmals ein Spiel.",
  p2pNotFound: "Kein offenes Spiel mit diesem Code gefunden.",
  p2pNoAnswer: "Das andere Handy antwortet nicht. Seid ihr im selben WLAN?",
  p2pFailed: type => `Verbindung fehlgeschlagen (${type || "unbekannt"}).`,
};
