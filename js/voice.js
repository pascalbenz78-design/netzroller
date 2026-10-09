// Schiedsrichter-Stimme über die Web Speech API. Fehlt eine deutsche Stimme, bleibt es still (nur Banner).

let enabled = true, voice = null, ready = false;
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

function pickVoice() {
  if (!synth) return;
  const vs = synth.getVoices();
  if (!vs.length) return;
  ready = true;
  // Schweizer Stimme bevorzugt, sonst Deutsch
  voice = vs.find(v => /^de[-_]CH/i.test(v.lang)) || vs.find(v => /^de[-_]DE/i.test(v.lang)) || vs.find(v => /^de/i.test(v.lang)) || null;
}
if (synth) {
  pickVoice();
  try { synth.addEventListener("voiceschanged", pickVoice); } catch (e) {}
}

export function setVoice(on) { enabled = !!on; if (!on && synth) synth.cancel(); }
export function hasVoice() { if (!ready) pickVoice(); return !!voice; }

/** Ruft einen Text aus. Ein neuer Ruf unterbricht den vorherigen. */
export function say(text) {
  if (!enabled || !synth || !text) return;
  if (!ready) pickVoice();
  if (!voice) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.lang = voice.lang; u.rate = 1.05; u.pitch = 0.95; u.volume = 0.9;
    synth.speak(u);
  } catch (e) {}
}
