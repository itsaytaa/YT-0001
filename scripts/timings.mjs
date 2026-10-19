// Step 6: measure the final line files and lay out the timeline (audio.json -> timing).
import { join } from "node:path";
import { root, scenes, audio, duration, writeJson } from "./lib.mjs";

const FPS = scenes.meta.fps;
const LEAD_IN = audio.timing.leadInSec;
const END_HOLD = scenes.meta.endCard.holdSec;
const MIN_SEC = 4 * 60 + 45;
const MAX_SEC = 5 * 60 + 30;
const TARGET_SEC = 5 * 60; // aim for the middle of the window when scaling is needed

const lines = scenes.lines.map((l) => ({ ...l, audioSec: duration(join(root, `video/public/lines/${l.id}.wav`)) }));
const speech = lines.reduce((s, l) => s + l.audioSec, 0);
const pauses = lines.reduce((s, l) => s + l.pauseAfter, 0);
const runtime = (k) => LEAD_IN + speech + k * pauses + END_HOLD;

let scale = 1;
if (runtime(1) < MIN_SEC || runtime(1) > MAX_SEC) scale = (TARGET_SEC - LEAD_IN - speech - END_HOLD) / pauses;

// Frames are rounded once on the absolute timeline so rounding never accumulates.
const toFrame = (sec) => Math.round(sec * FPS);
let t = LEAD_IN;
const out = lines.map((l) => {
  const startSec = t;
  t += l.audioSec + l.pauseAfter * scale;
  return { id: l.id, startSec: +startSec.toFixed(4), audioSec: +l.audioSec.toFixed(4), pauseSec: +(l.pauseAfter * scale).toFixed(4), endSec: +t.toFixed(4) };
});
out.forEach((e, i) => {
  e.startFrame = toFrame(e.startSec);
  e.endFrame = i + 1 < out.length ? toFrame(out[i + 1].startSec) : toFrame(e.endSec);
  e.audioFrames = Math.ceil(e.audioSec * FPS);
});
const endCard = { id: "END", startSec: +t.toFixed(4), startFrame: toFrame(t), durationFrames: Math.round(END_HOLD * FPS) };
const totalFrames = endCard.startFrame + endCard.durationFrames;

writeJson("video/src/data/timings.json", { fps: FPS, pauseScale: +scale.toFixed(4), totalFrames, totalSec: +(totalFrames / FPS).toFixed(3), lines: out, endCard });
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
console.log(`speech ${speech.toFixed(2)}s, pauses ${pauses.toFixed(2)}s, unscaled runtime ${fmt(runtime(1))}`);
console.log(`pauseAfter scale factor: ${scale.toFixed(4)}`);
console.log(`final runtime ${fmt(totalFrames / FPS)} (${totalFrames} frames)`);
