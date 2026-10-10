// Einstellungen für die Verbindung zu zweit (ausserhalb von claude.ai).
//
// STUN-Server helfen zwei Handys, sich gegenseitig zu finden. Das reicht in den meisten WLANs.
// In manchen Netzen (Firmen-WLAN, einige Mobilfunkanbieter) braucht es zusätzlich einen TURN-Server,
// der die Daten weiterleitet. Dafür brauchst du ein eigenes Konto bei einem Anbieter mit Gratis-Kontingent
// (siehe README, Abschnitt «Verbindung in schwierigen Netzen»). Dann hier eintragen, zum Beispiel:
//
//   export const TURN = [
//     { urls: "turn:global.relay.example.com:80", username: "DEIN-NAME", credential: "DEIN-PASSWORT" },
//     { urls: "turns:global.relay.example.com:443?transport=tcp", username: "DEIN-NAME", credential: "DEIN-PASSWORT" },
//   ];
//
// Achtung: Was hier steht, ist öffentlich (GitHub). Nimm deshalb nur Zugangsdaten, die ausschliesslich
// für TURN gelten und beim Anbieter ein Datenlimit haben.

export const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export const TURN = [];

// Weltrangliste (Supabase). Anleitung: README, Abschnitt «Weltrangliste einrichten».
// Project URL und «anon public» Key aus Supabase → Project Settings → API hier eintragen.
// Der anon Key darf öffentlich sein: Die Schutzregeln liegen in der Datenbank (docs/supabase.sql).
// Leer lassen = keine Weltrangliste, alles läuft lokal.
export const SUPABASE = {
  url: "https://cyyvirqzaqqbmjpvgryw.supabase.co",           // Projekt «netzroller», Region Zürich
  anonKey: "sb_publishable_JZ4sX5C-LR5D8FUTkc5Knw_98R7wtof", // öffentlicher Schlüssel (publishable)
};
