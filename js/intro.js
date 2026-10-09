// Intro beim Start: dunkles Stadion, Flutlichter gehen an, ein Ball rollt in Zeitlupe auf der Netzkante,
// zögert, fällt auf unsere Seite, das Publikum jubelt, die Buchstaben NETZROLLER springen ins Bild.
// Alles mit Canvas und Web Audio erzeugt. Antippen überspringt.

import { sfx, crowd, pock, audioInit, audioRunning } from "./audio.js";

const LIGHTS = [0.5, 1.0, 1.5, 2.0];          // Flutlichter gehen nacheinander an (s)
const ROLL = [2.3, 4.0], WOBBLE = [4.0, 4.65], FALL = [4.65, 5.05], LAND_BOUNCE = 0.3;
const LETTERS_AT = 5.15, LETTER_GAP = 0.09, LETTER_DUR = 0.55, END = 7.0, FADE = 0.45;
const WORD = "NETZROLLER";

// reproduzierbare «Zufalls»-Zuschauer
function seeded(n) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/**
 * @param o.root    Überlagerung (#intro), wird ein- und ausgeblendet
 * @param o.canvas  Zeichenfläche
 * @param o.skip    Knopf «Überspringen»
 * @param o.tapHint Hinweis «Antippen», solange Töne noch gesperrt sind
 * @param o.reduced true bei prefers-reduced-motion: kurze, ruhige Fassung
 * @returns Promise, erfüllt wenn das Intro fertig oder übersprungen ist
 */
export function playIntro({ root, canvas, skip, tapHint, reduced }) {
  return new Promise(resolve => {
    const ctx = canvas.getContext("2d");
    let W = 1, H = 1, dpr = 1, t = 0, started = false, done = false, last = 0, raf = 0;
    const fired = new Set();
    const once = (key, fn) => { if (!fired.has(key)) { fired.add(key); fn(); } };
    const rnd = seeded(7);
    const fans = Array.from({ length: 420 }, () => ({ x: rnd(), y: rnd(), c: rnd(), s: 0.6 + rnd() * 0.6 }));

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function finish() {
      if (done) return;
      done = true; cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      root.removeEventListener("pointerdown", onTap);
      skip.removeEventListener("click", onSkip);
      root.hidden = true;
      resolve();
    }
    function begin() { started = true; tapHint.hidden = true; t = 0; last = performance.now(); }
    function onTap(e) {
      if (e.target === skip) return;
      audioInit();
      if (!started) begin(); else finish();
    }
    function onSkip(e) { e.stopPropagation(); audioInit(); finish(); }

    root.hidden = false;
    size();
    addEventListener("resize", size);
    root.addEventListener("pointerdown", onTap);
    skip.addEventListener("click", onSkip);

    // Töne gehen erst nach einem Antippen. Ohne Freigabe wartet das dunkle Stadion auf den ersten Tipp.
    audioInit();
    const fontReady = Promise.race([
      document.fonts ? document.fonts.load("800 64px 'Barlow Condensed'").catch(() => {}) : Promise.resolve(),
      new Promise(r => setTimeout(r, 1500)),
    ]);
    fontReady.then(() => {
      if (audioRunning() || reduced) begin(); else tapHint.hidden = false;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });

    function loop(now) {
      if (done) return;
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (started) t += dt;
      draw(started ? t : 0);
      const end = reduced ? 2.4 : END + FADE;
      if (started && t >= end) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }

    // ---------- Szene ----------
    const lerp = (a, b, k) => a + (b - a) * k;
    const mix = (c1, c2, k) => {
      const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
      const a = p(c1), b = p(c2);
      return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",")})`;
    };
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const easeOutBounce = x => {
      const n = 7.5625, d = 2.75;
      if (x < 1 / d) return n * x * x;
      if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
      if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
      return n * (x -= 2.625 / d) * x + 0.984375;
    };

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = Math.min(W, H);
      // wie viele Flutlichter brennen (mit kurzem Aufglühen)
      const lightK = reduced ? (t > 0.15 ? [1, 1, 1, 1] : [0, 0, 0, 0]) : LIGHTS.map(at => clamp01((t - at) / 0.15));
      if (!reduced) LIGHTS.forEach((at, i) => { if (t >= at) once("l" + i, () => sfx.klack()); });
      else if (t > 0.15) once("l", () => sfx.klack());
      const L = lightK.reduce((a, b) => a + b, 0) / 4;

      // Himmel und Ränge
      ctx.fillStyle = mix("#020406", "#0a1418", L); ctx.fillRect(0, 0, W, H);
      const standTop = H * 0.08, standBot = H * 0.36;
      for (let r = 0; r < 6; r++) {
        const y0 = lerp(standTop, standBot, r / 6), y1 = lerp(standTop, standBot, (r + 1) / 6);
        ctx.fillStyle = mix("#05090b", r % 2 ? "#1c2b33" : "#16242b", L);
        ctx.fillRect(0, y0, W, y1 - y0 + 1);
      }
      const fanCols = ["#e8e2d0", "#d24b3c", "#3d6fb6", "#f0c93a", "#7a8a94", "#2f7d5b"];
      ctx.globalAlpha = 0.12 + 0.75 * L;
      fans.forEach(f => {
        ctx.fillStyle = fanCols[Math.floor(f.c * fanCols.length)];
        const jump = t > FALL[1] && t < FALL[1] + 1.4 && !reduced ? Math.abs(Math.sin((t * 9) + f.x * 20)) * 2.5 : 0;
        ctx.beginPath(); ctx.arc(f.x * W, lerp(standTop + 6, standBot - 4, f.y) - jump, 1.6 * f.s * (m / 400), 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Platz in Perspektive: z = 0 hintere Grundlinie, 0.5 Netz, 1 vordere Grundlinie
      const yFar = H * 0.38, yNear = H * 0.8, wFar = W * 0.2, wNear = W * 0.62;
      const P = (xn, z) => [W / 2 + xn * lerp(wFar, wNear, z), lerp(yFar, yNear, z)];
      ctx.fillStyle = mix("#030807", "#2c6a52", L); ctx.fillRect(0, standBot, W, H - standBot);
      quad(P(-1.25, -0.08), P(1.25, -0.08), P(1.25, 1.25), P(-1.25, 1.25), mix("#030807", "#2a644d", L));
      quad(P(-1, 0), P(1, 0), P(1, 1), P(-1, 1), mix("#03060c", "#2456a0", L));
      ctx.strokeStyle = `rgba(244,247,242,${0.08 + 0.85 * L})`; ctx.lineWidth = Math.max(1, m * 0.004);
      const ln = (a, b) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
      ln(P(-1, 0), P(1, 0)); ln(P(-1, 1), P(1, 1)); ln(P(-1, 0), P(-1, 1)); ln(P(1, 0), P(1, 1));
      ln(P(-0.78, 0), P(-0.78, 1)); ln(P(0.78, 0), P(0.78, 1));
      ln(P(-0.78, 0.23), P(0.78, 0.23)); ln(P(-0.78, 0.77), P(0.78, 0.77)); ln(P(0, 0.23), P(0, 0.77));

      // Flutlichtmasten und Lichtkegel
      const masts = [[0.2, 0.05], [0.8, 0.05], [0.03, 0.12], [0.97, 0.12]];
      masts.forEach(([mx, my], i) => {
        const k = lightK[i], x = mx * W, y = my * H, lw = W * 0.08, lh = H * 0.022;
        ctx.fillStyle = "#0b1114"; ctx.fillRect(x - 2, y, 4, H * 0.3);
        if (k > 0) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, m * 0.7);
          g.addColorStop(0, `rgba(255,250,220,${0.35 * k})`); g.addColorStop(1, "rgba(255,250,220,0)");
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(255,252,235,${0.05 * k})`;
          ctx.beginPath(); ctx.moveTo(x - lw / 2, y + lh); ctx.lineTo(x + lw / 2, y + lh); ctx.lineTo(W / 2 + (mx - 0.5) * W * 0.3, yNear); ctx.lineTo(W / 2 + (mx - 0.5) * W * 0.9, yNear); ctx.fill();
        }
        ctx.fillStyle = k > 0 ? mix("#2a2f30", "#fffbe6", k) : "#1a2124";
        ctx.fillRect(x - lw / 2, y, lw, lh);
      });

      // Netz
      const [nxL, ny] = P(-1.08, 0.5), [nxR] = P(1.08, 0.5), netH = H * 0.05, tapeY = ny - netH;
      ctx.fillStyle = "rgba(8,14,14,.55)"; ctx.fillRect(nxL, tapeY, nxR - nxL, netH);
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + 0.18 * L})`; ctx.lineWidth = 1;
      const step = Math.max(5, m * 0.012);
      for (let x = nxL; x <= nxR; x += step) ln([x, tapeY], [x, ny]);
      for (let y = tapeY; y <= ny; y += step) ln([nxL, y], [nxR, y]);
      const wobble = reduced ? 0 : (t > WOBBLE[0] && t < FALL[0] ? Math.sin(t * 40) * 1.5 * (1 - (t - WOBBLE[0]) / (FALL[0] - WOBBLE[0])) : 0);
      ctx.fillStyle = mix("#2a2f30", "#f4f7f2", L); ctx.fillRect(nxL, tapeY - netH * 0.08 + wobble, nxR - nxL, netH * 0.14);
      ctx.fillStyle = "#111"; ctx.fillRect(nxL - 3, tapeY - 4, 6, netH + 4); ctx.fillRect(nxR - 3, tapeY - 4, 6, netH + 4);

      // Ball: rollt auf der Netzkante, zögert, fällt zu uns
      const r0 = Math.max(6, m * 0.024);
      let bx, by, br = r0, rot = 0, show = true, squash = 1;
      const xStart = lerp(nxL, nxR, 0.12), xStop = lerp(nxL, nxR, 0.5), yTape = tapeY - netH * 0.08 - r0 + wobble;
      if (reduced) { bx = W * 0.56; by = H * 0.9; br = r0 * 2.4; show = t > 0.15; }
      else if (t < ROLL[0]) show = false;
      else if (t < ROLL[1]) {
        const k = (t - ROLL[0]) / (ROLL[1] - ROLL[0]), e = 1 - Math.pow(1 - k, 2.2);
        bx = lerp(xStart, xStop - r0 * 0.6, e); by = yTape; rot = (bx - xStart) / r0;
        once("roll", () => pock(200, 0.6, 0.04, "sine"));
      } else if (t < FALL[0]) {
        const k = (t - WOBBLE[0]) / (WOBBLE[1] - WOBBLE[0]);
        bx = xStop - r0 * 0.6 + Math.sin(k * Math.PI * 3) * r0 * 0.35 * (1 - k) + k * r0 * 0.5; by = yTape; rot = (bx - xStart) / r0;
        once("murmur", () => crowd.murmur());
        if (k > 0.55) once("tock", () => sfx.tock());
      } else if (t < FALL[1]) {
        const k = (t - FALL[0]) / (FALL[1] - FALL[0]);
        bx = lerp(xStop, W * 0.56, k); by = lerp(yTape, H * 0.9, k * k) - Math.sin(k * Math.PI) * H * 0.03;
        br = lerp(r0, r0 * 2.4, k); rot = (bx - xStart) / r0 + k * 6;
      } else {
        const k = (t - FALL[1]) / LAND_BOUNCE;
        bx = W * 0.56 + Math.min(k, 1) * W * 0.02; br = r0 * 2.4;
        by = H * 0.9 - (k < 1 ? Math.sin(k * Math.PI) * H * 0.04 : 0);
        squash = k < 0.12 ? 0.8 : 1; rot = 8 + k;
        once("land", () => { pock(240, 0.08, 0.3, "sine"); crowd.cheer(1); });
      }
      if (show) {
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.beginPath(); ctx.ellipse(bx + br * 0.2, (t >= FALL[0] || reduced ? H * 0.9 : by) + br * 0.95, br, br * 0.3, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(bx, by); ctx.scale(1 / squash, squash);
        ctx.fillStyle = mix("#2b3311", "#dff23c", Math.max(L, 0.25));
        ctx.beginPath(); ctx.arc(0, 0, br, 0, 7); ctx.fill();
        ctx.rotate(rot);
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.6 * L})`; ctx.lineWidth = Math.max(1, br * 0.12);
        ctx.beginPath(); ctx.arc(-br * 1.15, 0, br * 0.9, -0.9, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(br * 1.15, 0, br * 0.9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
        ctx.restore();
      }

      // NETZROLLER: Buchstaben springen wie Bälle ins Bild, ROLLER in Ballgelb
      const fs = Math.min(W * 0.13, 96);
      ctx.font = `800 ${fs}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
      ctx.textBaseline = "alphabetic";
      const widths = [...WORD].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + fs * 0.04 * (WORD.length - 1);
      let lx = (W - total) / 2;
      const ty = H * 0.25;
      [...WORD].forEach((ch, i) => {
        let y = ty, alpha = 1;
        if (reduced) alpha = clamp01((t - 0.4) / 0.6);
        else {
          const k = clamp01((t - (LETTERS_AT + i * LETTER_GAP)) / LETTER_DUR);
          if (k <= 0) { lx += widths[i] + fs * 0.04; return; }
          y = ty - (1 - easeOutBounce(k)) * H * 0.45;
          if (k > 0.36) once("ltr" + i, () => pock(500 + i * 40, 0.05, 0.08, "sine"));
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillText(ch, lx + fs * 0.03, y + fs * 0.04);
        ctx.fillStyle = i < 4 ? "#f4f7f2" : "#dff23c"; ctx.fillText(ch, lx, y);
        ctx.globalAlpha = 1;
        lx += widths[i] + fs * 0.04;
      });

      // Ausblenden ins Menü
      if (!reduced && t > END) { ctx.fillStyle = `rgba(44,106,82,${clamp01((t - END) / FADE)})`; ctx.fillRect(0, 0, W, H); }
    }

    function quad(a, b, c, d, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
    }
  });
}
