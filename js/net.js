// Verbindung zu zweit. Zwei Wege mit denselben Aufrufen (presence / onPeers / leave):
//   - auf claude.ai: der Live-Raum der Plattform (claude.use("room"))
//   - überall sonst (GitHub Pages): direkte WebRTC-Verbindung über PeerJS
// Jedes Handy veröffentlicht ein «Präsenz»-Objekt (Name, Schlägerposition, Spielstand, letzter Schlag).
// Das andere Handy liest es und reagiert auf Änderungen. Alles ist absoluter Zustand, nie Differenzen.

import { T } from "./texts.js";

const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

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

function makeP2P() {
  return {
    async join(name, asHost) {
      await loadPeerJs();
      const hostId = "netzroller-v1-" + name;
      let mine = {}, theirs = null, theirId = null, conn = null, closed = false, sendT = 0, retryT = 0;
      let myId = "", failJoin = null;
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
      const flush = () => { sendT = 0; if (conn && conn.open) { try { conn.send(mine); } catch (e) {} } };
      const attach = c => {
        conn = c;
        c.on("open", () => { theirId = c.peer; flush(); });
        c.on("data", d => { if (d && typeof d === "object" && !Array.isArray(d)) { theirs = Object.freeze({ ...d }); emitPeers(); } });
        c.on("close", () => { if (conn === c) { conn = null; theirs = null; emitPeers(); if (!asHost && !closed) retry(); } });
        c.on("error", () => {});
      };
      const opts = { debug: 0, config: { iceServers: ICE } };
      const peer = await new Promise((res, rej) => {
        const pr = asHost ? new window.Peer(hostId, opts) : new window.Peer(opts);
        const t = setTimeout(() => { pr.destroy(); rej(new Error(T.p2pNoBroker)); }, 12000);
        pr.on("open", id => { clearTimeout(t); myId = id; res(pr); });
        pr.on("error", e => {
          clearTimeout(t);
          if (e.type === "unavailable-id") rej(new Error(T.p2pIdTaken));
          else if (e.type === "peer-unavailable") { if (!asHost && !theirs && failJoin) failJoin(new Error(T.p2pNotFound)); }
          else rej(new Error(T.p2pFailed(e.type)));
        });
      });
      const retry = () => { clearTimeout(retryT); retryT = setTimeout(() => { if (!closed && !conn) attach(peer.connect(hostId, { reliable: true })); }, 2000); };
      if (asHost) {
        peer.on("connection", c => {
          if (conn && conn.open) { c.on("open", () => c.close()); return; }   // ein Gegner pro Spiel
          attach(c);
        });
      } else {
        await new Promise((res, rej) => {
          failJoin = e => { peer.destroy(); rej(e); };
          const c = peer.connect(hostId, { reliable: true });
          const t = setTimeout(() => failJoin(new Error(T.p2pNoAnswer)), 12000);
          c.on("open", () => { clearTimeout(t); failJoin = null; res(); });
          attach(c);
        });
      }
      peer.on("disconnected", () => { if (!closed) { try { peer.reconnect(); } catch (e) {} } });
      return {
        presence(patch) {
          mine = { ...mine };
          for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
          if (!sendT) sendT = setTimeout(flush, 30);
          emitPeers();
          return Promise.resolve();
        },
        onPeers(fn) { listeners.add(fn); setTimeout(() => fn({ peers: snapshot() }), 0); return () => listeners.delete(fn); },
        async leave() { closed = true; clearTimeout(retryT); listeners.clear(); try { conn && conn.close(); } catch (e) {} try { peer.destroy(); } catch (e) {} },
      };
    },
  };
}
