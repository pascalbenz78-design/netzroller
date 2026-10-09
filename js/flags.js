// Flaggen, mit Canvas gezeichnet (Flaggen-Emojis fehlen unter Windows). Vereinfachte Formen.
// "NR" ist das neutrale Zeichen für den Computer: ein Tennisball.

const H3 = (a, b, c) => ({ t: "h3", c: [a, b, c] });   // drei waagrechte Streifen
const V3 = (a, b, c) => ({ t: "v3", c: [a, b, c] });   // drei senkrechte Streifen
const NORDIC = (bg, cross, inner) => ({ t: "nordic", bg, cross, inner });

const DEF = {
  CH: { t: "swiss" },
  DE: H3("#000000", "#dd0000", "#ffce00"),
  AT: H3("#ed2939", "#ffffff", "#ed2939"),
  FR: V3("#002395", "#ffffff", "#ed2939"),
  IT: V3("#009246", "#ffffff", "#ce2b37"),
  BE: V3("#000000", "#fae042", "#ed2939"),
  IE: V3("#169b62", "#ffffff", "#ff883e"),
  NL: H3("#ae1c28", "#ffffff", "#21468b"),
  LU: H3("#ed2939", "#ffffff", "#00a1de"),
  HU: H3("#ce2939", "#ffffff", "#477050"),
  RU: H3("#ffffff", "#0039a6", "#d52b1e"),
  BG: H3("#ffffff", "#00966e", "#d62612"),
  HR: H3("#ff0000", "#ffffff", "#171796"),
  RS: H3("#c6363c", "#0c4076", "#ffffff"),
  ES: { t: "h3w", c: ["#aa151b", "#f1bf00", "#aa151b"] },
  CO: { t: "h3w", c: ["#fcd116", "#003893", "#ce1126"] },
  AR: H3("#74acdf", "#ffffff", "#74acdf"),
  PL: { t: "h2", c: ["#ffffff", "#dc143c"] },
  UA: { t: "h2", c: ["#0057b7", "#ffd700"] },
  MC: { t: "h2", c: ["#ce1126", "#ffffff"] },
  SE: NORDIC("#006aa7", "#fecc00"),
  NO: NORDIC("#ba0c2f", "#ffffff", "#00205b"),
  DK: NORDIC("#c8102e", "#ffffff"),
  FI: NORDIC("#ffffff", "#002f6c"),
  JP: { t: "circle", bg: "#ffffff", fg: "#bc002d" },
  KR: { t: "circle", bg: "#ffffff", fg: "#cd2e3a" },
  CZ: { t: "cz" },
  GB: { t: "gb" },
  US: { t: "us" },
  CA: { t: "ca" },
  AU: { t: "au" },
  BR: { t: "br" },
  NR: { t: "ball" },
};

export const COUNTRIES = [
  ["CH", "Schweiz"], ["DE", "Deutschland"], ["AT", "Österreich"], ["FR", "Frankreich"], ["IT", "Italien"],
  ["ES", "Spanien"], ["GB", "Grossbritannien"], ["NL", "Niederlande"], ["BE", "Belgien"], ["LU", "Luxemburg"],
  ["IE", "Irland"], ["SE", "Schweden"], ["NO", "Norwegen"], ["DK", "Dänemark"], ["FI", "Finnland"],
  ["PL", "Polen"], ["CZ", "Tschechien"], ["HU", "Ungarn"], ["HR", "Kroatien"], ["RS", "Serbien"],
  ["BG", "Bulgarien"], ["UA", "Ukraine"], ["RU", "Russland"], ["MC", "Monaco"], ["US", "USA"],
  ["CA", "Kanada"], ["BR", "Brasilien"], ["AR", "Argentinien"], ["CO", "Kolumbien"], ["AU", "Australien"],
  ["JP", "Japan"], ["KR", "Südkorea"],
].map(([code, name]) => ({ code, name }));

export function countryName(code) {
  const c = COUNTRIES.find(x => x.code === code);
  return c ? c.name : "";
}

/** Zeichnet eine Flagge in das Rechteck (x, y, w, h). */
export function drawFlag(ctx, code, x, y, w, h) {
  const f = DEF[code] || DEF.NR;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const rect = (c, a, b, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(a, b, ww, hh); };
  switch (f.t) {
    case "h3": f.c.forEach((c, i) => rect(c, x, y + (h / 3) * i, w, h / 3 + 0.5)); break;
    case "h3w": rect(f.c[0], x, y, w, h); rect(f.c[1], x, y + h / 4, w, h / 2); if (f.c[2] !== f.c[0]) rect(f.c[2], x, y + h * 3 / 4, w, h / 4); break;
    case "v3": f.c.forEach((c, i) => rect(c, x + (w / 3) * i, y, w / 3 + 0.5, h)); break;
    case "h2": rect(f.c[0], x, y, w, h / 2 + 0.5); rect(f.c[1], x, y + h / 2, w, h / 2); break;
    case "nordic": {
      rect(f.bg, x, y, w, h);
      const cx = x + w * 0.36, t = h * 0.24;
      rect(f.cross, cx - t / 2, y, t, h); rect(f.cross, x, y + h / 2 - t / 2, w, t);
      if (f.inner) { const ti = t * 0.5; rect(f.inner, cx - ti / 2, y, ti, h); rect(f.inner, x, y + h / 2 - ti / 2, w, ti); }
      break;
    }
    case "swiss": {
      rect("#da291c", x, y, w, h);
      const s = Math.min(w, h), cx = x + w / 2, cy = y + h / 2, a = s * 0.6, b = s * 0.2;
      rect("#ffffff", cx - b / 2, cy - a / 2, b, a); rect("#ffffff", cx - a / 2, cy - b / 2, a, b);
      break;
    }
    case "circle": rect(f.bg, x, y, w, h); ctx.fillStyle = f.fg; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill(); break;
    case "cz":
      rect("#ffffff", x, y, w, h / 2); rect("#d7141a", x, y + h / 2, w, h / 2);
      ctx.fillStyle = "#11457e"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y + h / 2); ctx.lineTo(x, y + h); ctx.fill(); break;
    case "gb": {
      rect("#012169", x, y, w, h);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = h * 0.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
      ctx.strokeStyle = "#c8102e"; ctx.lineWidth = h * 0.07; ctx.stroke();
      rect("#ffffff", x + w / 2 - h * 0.17, y, h * 0.34, h); rect("#ffffff", x, y + h / 2 - h * 0.17, w, h * 0.34);
      rect("#c8102e", x + w / 2 - h * 0.1, y, h * 0.2, h); rect("#c8102e", x, y + h / 2 - h * 0.1, w, h * 0.2);
      break;
    }
    case "us":
      for (let i = 0; i < 7; i++) rect(i % 2 ? "#ffffff" : "#b22234", x, y + (h / 7) * i, w, h / 7 + 0.5);
      rect("#3c3b6e", x, y, w * 0.42, h * 4 / 7);
      ctx.fillStyle = "#ffffff";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { ctx.beginPath(); ctx.arc(x + w * (0.06 + c * 0.1), y + h * (0.1 + r * 0.17), h * 0.03, 0, 7); ctx.fill(); }
      break;
    case "ca":
      rect("#ffffff", x, y, w, h); rect("#d52b1e", x, y, w * 0.25, h); rect("#d52b1e", x + w * 0.75, y, w * 0.25, h);
      ctx.fillStyle = "#d52b1e"; ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h * 0.18); ctx.lineTo(x + w * 0.62, y + h * 0.5); ctx.lineTo(x + w / 2, y + h * 0.72); ctx.lineTo(x + w * 0.38, y + h * 0.5); ctx.fill();
      rect("#d52b1e", x + w / 2 - h * 0.03, y + h * 0.6, h * 0.06, h * 0.22);
      break;
    case "au":
      rect("#012169", x, y, w, h);
      ctx.fillStyle = "#ffffff";
      [[0.7, 0.3], [0.82, 0.5], [0.7, 0.75], [0.58, 0.5], [0.25, 0.75]].forEach(([a, b], i) => { ctx.beginPath(); ctx.arc(x + w * a, y + h * b, h * (i === 4 ? 0.09 : 0.05), 0, 7); ctx.fill(); });
      rect("#ffffff", x, y, w * 0.45, h * 0.5); rect("#c8102e", x, y + h * 0.2, w * 0.45, h * 0.1); rect("#c8102e", x + w * 0.2, y, w * 0.06, h * 0.5);
      break;
    case "br":
      rect("#009c3b", x, y, w, h);
      ctx.fillStyle = "#ffdf00"; ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h * 0.1); ctx.lineTo(x + w * 0.92, y + h / 2); ctx.lineTo(x + w / 2, y + h * 0.9); ctx.lineTo(x + w * 0.08, y + h / 2); ctx.fill();
      ctx.fillStyle = "#002776"; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.22, 0, 7); ctx.fill();
      break;
    default: // Tennisball
      rect("#183d31", x, y, w, h);
      ctx.fillStyle = "#dff23c"; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.36, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, h * 0.05);
      ctx.beginPath(); ctx.arc(x + w / 2 - h * 0.42, y + h / 2, h * 0.32, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2 + h * 0.42, y + h / 2, h * 0.32, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Zeichnet eine Flagge in ein vorhandenes <canvas> (passt die Auflösung an). */
export function paintFlag(canvas, code) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawFlag(ctx, code, 0, 0, w, h);
}
