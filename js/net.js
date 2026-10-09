// Verbindung zu zweit. Zwei Wege mit denselben Aufrufen (presence / onPeers / leave):
//   - auf claude.ai: der Live-Raum der Plattform (claude.use("room")); er verbindet sich selbst neu
//   - überall sonst (GitHub Pages): direkte WebRTC-Verbindung über PeerJS
// Jedes Handy veröffentlicht ein «Präsenz»-Objekt (Name, Schlägerposition, Spielstand, letzter Schlag,
// Herzschlag). Das andere Handy liest es und reagiert auf Änderungen. Alles ist absoluter Zustand.
//
// Wiederverbinden (PeerJS): Hört das beitretende Handy länger als STALE_MS nichts mehr, baut es die
// Verbindung neu auf. Das eröffnende Handy nimmt eine neue Verbindung jederzeit an und ersetzt die alte.

import { T } from "./texts.js";
import { STUN, TURN } from "./config.js";

const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
const STALE_MS = 3500, RETRY_MS = 3000, HOST_ID_RETRIES = 6;

/** Für Tests: bis zu diesem Zeitpunkt (performance.now) gehen keine Daten hin und her, wie bei WLAN aus. */
export const netTest = { dropUntil: 0 };
const dropping = () => performance.now() < netTest.dropUntil;

/** Liefert { room, p2p } oder room = null, wenn zu zweit nicht möglich ist. */
export async function connectRoomProvider() {
  const inClaude = !!(window.claude && window.claude.use);
  if (inClaude) {
    try { return { room: await window.claude.use("room"), p2p: false }; } catch (e) { return { room: null, p2p: false }; }
  }
  return { room: makeP2P(), p2p: true };
}

function loadPeerJs() {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const sc = document.createElement("script");
    sc.src = PEERJS_URL;
    sc.onload = () => res(); sc.onerror = () => rej(new Error(T.p2pLoadFailed));
    document.head.appendChild(sc);
  });
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function makeP2P() {
  return {
    async join(name, asHost) {
      await loadPeerJs();
      const hostId = "netzroller-v1-" + name;
      let mine = {}, theirs = null, theirId = null, conn = null, closed = false, sendT = 0, retryT = 0;
      let myId = "", failJoin = null, lastData = performance.now(), lastAttempt = 0;
      const listeners = new Set();
      const snapshot = () => {
        const list = [{ peer: myId, sameTab: true, isMe: true, presence: mine }];
        if (theirs && conn && conn.open) list.push({ peer: theirId, sameTab: false, isMe: false, presence: theirs });
        return list;
      };
      // wie beim Raum von claude.ai: Änderungen gebündelt und nie mitten in einem Aufruf melden
      let emitT = 0;
      const emitPeers = () => {
        if (emitT) return;
        emitT = setTimeout(() => { emitT = 0; const peers = snapshot(); listeners.forEach(fn => { try { fn({ peers }); } catch (e) { console.error(e); } }); }, 0);
      };
      const flush = () => { sendT = 0; if (conn && conn.open && !dropping()) { try { conn.send(mine); } catch (e) {} } };
      const attach = c => {
        const old = conn;
        conn = c;
        if (old && old !== c) { try { old.close(); } catch (e) {} }
        c.on("open", () => { if (conn !== c) return; theirId = c.peer; lastData = performance.now(); flush(); });
        c.on("data", d => {
          if (conn !== c || dropping()) return;
          if (d && typeof d === "object" && !Array.isArray(d)) { lastData = performance.now(); theirs = Object.freeze({ ...d }); emitPeers(); }
        });
        c.on("close", () => { if (conn === c) { conn = null; theirs = null; emitPeers(); if (!asHost && !closed) retry(); } });
        c.on("error", () => {});
      };
      const opts = { debug: 0, config: { iceServers: [...STUN, ...TURN] } };

      // Eröffnendes Handy: Nach einem Neuladen ist die alte Kennung beim Vermittlungsserver manchmal
      // noch ein paar Sekunden belegt. Dann mehrmals nachfragen.
      const open = () => new Promise((res, rej) => {
        const pr = asHost ? new window.Peer(hostId, opts) : new window.Peer(opts);
        const t = setTimeout(() => { pr.destroy(); rej(new Error(T.p2pNoBroker)); }, 12000);
        pr.on("open", id => { clearTimeout(t); myId = id; res(pr); });
        pr.on("error", e => {
          clearTimeout(t);
          if (e.type === "unavailable-id") { pr.destroy(); rej(Object.assign(new Error(T.p2pIdTaken), { taken: true })); }
          else if (e.type === "peer-unavailable") { if (!asHost && !theirs && failJoin) failJoin(new Error(T.p2pNotFound)); }
          else if (e.type === "network" || e.type === "disconnected" || e.type === "socket-error" || e.type === "server-error") { /* wird unten neu verbunden */ }
          else rej(new Error(T.p2pFailed(e.type)));
        });
      });
      let peer = null;
      for (let i = 0; ; i++) {
        try { peer = await open(); break; }
        catch (e) { if (!e.taken || i >= HOST_ID_RETRIES) throw e; await wait(2500); }
      }

      const reconnectBroker = () => { if (peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} } };
      const connectToHost = () => { lastAttempt = performance.now(); reconnectBroker(); try { attach(peer.connect(hostId, { reliable: true })); } catch (e) {} };
      const retry = () => { clearTimeout(retryT); retryT = setTimeout(() => { if (!closed && !conn) connectToHost(); }, 1500); };

      if (asHost) {
        peer.on("connection", c => attach(c));   // ein neuer Versuch des Gegners ersetzt die alte Verbindung
      } else {
        await new Promise((res, rej) => {
          failJoin = e => { peer.destroy(); rej(e); };
          const c = peer.connect(hostId, { reliable: true });
          const t = setTimeout(() => failJoin(new Error(T.p2pNoAnswer)), 12000);
          c.on("open", () => { clearTimeout(t); failJoin = null; res(); });
          attach(c);
        });
      }
      peer.on("disconnected", () => { if (!closed) setTimeout(reconnectBroker, 1000); });

      // Wächter: hört das beitretende Handy zu lange nichts, verbindet es sich neu
      const watch = setInterval(() => {
        if (closed) return;
        reconnectBroker();
        const now = performance.now();
        if (!asHost && now - lastData > STALE_MS && now - lastAttempt > RETRY_MS && !dropping()) {
          if (conn) { const c = conn; conn = null; theirs = null; try { c.close(); } catch (e) {} emitPeers(); }
          connectToHost();
        }
      }, 1000);

      return {
        presence(patch) {
          mine = { ...mine };
          for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
          if (!sendT) sendT = setTimeout(flush, 30);
          emitPeers();
          return Promise.resolve();
        },
        onPeers(fn) { listeners.add(fn); setTimeout(() => fn({ peers: snapshot() }), 0); return () => listeners.delete(fn); },
        async leave() {
          closed = true; clearTimeout(retryT); clearInterval(watch); listeners.clear();
          try { conn && conn.close(); } catch (e) {} try { peer.destroy(); } catch (e) {}
        },
      };
    },
  };
}
