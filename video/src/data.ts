// Timeline: scenes.json + timings.json -> segments of lines with resolved shots.
import scenesJson from "./data/scenes.json";
import timingsJson from "./data/timings.json";

export type El = { el: string; [k: string]: any };
export type Shot = { id: string; type: string; desc?: string; elements?: El[]; camera?: any; accent?: string; style?: string; dim?: number; doc?: any; plan?: any; [k: string]: any };
export type Line = { id: string; beat: string; directive: number | null; voice: string; caption: string; shot: string; pauseAfter: number; emphasis: string[]; sfx: string | null; transitionIn: string };
export type Timing = { id: string; startSec: number; audioSec: number; endSec: number; startFrame: number; endFrame: number; audioFrames: number };

export const scenes = scenesJson as unknown as { meta: any; beats: any[]; lines: Line[]; shots: Record<string, Omit<Shot, "id">> };
export const timings = timingsJson as unknown as { fps: number; totalFrames: number; pauseScale: number; lines: Timing[]; endCard: { startFrame: number; durationFrames: number } };

// Fixes derived from each shot's `desc` (desc is the authority when structured fields
// and description disagree). Applied on top of the scenes.json spec.
const DESC_OVERRIDES: Record<string, Partial<Shot>> = {
  // "the red VIOLATED stamp on DIRECTIVE 4 pulses once" (stamp already on the page).
  S40: { doc: { stampMode: "pulse" } },
  // "The advisory memo from S06 slides down out of frame (closing)."
  S91: { doc: { anim: "slide-out" } },
  // After S28/S28b the cat sits in the hallway with every lamp on; S30 turns them off.
  S30: { plan: { anim: "lamps-off-sequence", catIn: "hall", startLit: true } },
  S28: { plan: { startLit: true } },
  S28b: { plan: { startLit: true, catIn: "hall" } },
};

// Element patches, also derived from `desc`:
// - S68b: "Window outside cycles quickly through night skies" — the sofa-wide set (S10,
//   reused in S67/S68) gets a window so that cycle has somewhere to happen.
// - S68: "camera pulls back and pans right to reveal the room corner": the corner starts
//   outside the S10 framing, and the blue line runs person -> cat -> corner.
const ELEMENT_PATCHES: Record<string, (els: El[]) => El[]> = {
  S10: (els) => [{ el: "window", x: 470, y: 300, w: 230, sky: "moon" }, ...els],
  S68: (els) =>
    els.map((e) =>
      e.el === "corner" ? { ...e, x: 2060 } : e.el === "boundary" ? { ...e, pts: [{ x: 760, y: 818 }, { x: 1262, y: 818 }, { x: 2040, y: 800 }] } : e,
    ),
  S68b: (els) => els.map((e) => (e.el === "window" ? { ...e, nightCycle: true } : e)),
  // Contact-sheet review fixes (positions are composition guides; desc is the authority).
  // S07 "a clock beside it with a counter that ticks up to 16 h".
  S07: (els) => [...els, { el: "clock", x: 1020, y: 440, r: 78, anim: ["spin-fast"] }].map((e) => (e.el === "counter" ? { ...e, x: 1330 } : e)),
  S09: (els) => els.map((e) => (e.el === "cat" ? { ...e, h: 200, y: 716 } : e.el === "box" ? { ...e, w: 280 } : e.el === "cat-bed" ? { ...e, w: 340 } : e)),
  S11: (els) => els.map((e) => (e.el === "window" ? { ...e, x: 1180 } : e)),
  S20: (els) => els.map((e) => (e.el === "bird" ? { ...e, y: 597 } : e)),
  // S33 "pushing the bookcase sideways away from the corner": the person stands on the
  // corner side and pushes it left (it slides dx -220), moving with it.
  S33: (els) => els.map((e) => (e.el === "person" ? { ...e, x: 1440, facing: "left", followSlide: true } : e)),
  // S49 continues the armchair scene of S41/S44.
  S49: (els) => [{ el: "armchair", x: 600, y: 780, w: 320 }, ...els],
  S50: (els) => els.map((e) => (e.el === "window" ? { ...e, x: 1010 } : e)),
  S84: (els) => els.map((e) => (e.el === "room-iso" ? { ...e, y: 640 } : e)),
  // S85 "Cat staring at the inspector in the corner."
  S85: (els) => [{ el: "corner", x: 1360, y: 780, w: 380, h: 560, variant: "dark" }, ...els].map((e) => (e.el === "checklist" ? { ...e, x: 1690, y: 400 } : e)),
  S87: (els) => els.map((e) => (e.el === "sofa" ? { ...e, x: 520, y: 990, w: 820 } : e.el === "cat" ? { ...e, x: 1120 } : e.el === "glow" ? { ...e, x: 560, y: 560 } : e)),
};

// Close-up corners stand on y=860, which puts the inspector's feet in the caption zone
// (y 860-1000). Lift those scenes to stand on y=815.
const liftCloseUps = (els: El[]) => els.map((e) => ((e.el === "corner" || e.el === "inspector") && e.y === 860 ? { ...e, y: 815, h: e.el === "inspector" ? Math.round(e.h * 0.94) : e.h } : e));

const merge = (a: any, b: any) => ({ ...(a ?? {}), ...(b ?? {}) });

const cache: Record<string, Shot> = {};
export function resolveShot(id: string): Shot {
  if (cache[id]) return cache[id];
  const raw = { ...(scenes.shots[id] as any), id };
  let shot: Shot = raw;
  if (raw.same_as) {
    const base = resolveShot(raw.same_as);
    shot = {
      ...base,
      ...raw,
      elements: raw.elements ?? base.elements,
      camera: raw.camera ?? base.camera,
      accent: raw.accent ?? base.accent,
      // A same_as document is the same sheet already on screen: no entry animation,
      // inherited highlights shown complete, inherited stamps already landed.
      doc: base.doc ? { ...merge(base.doc, raw.doc), anim: raw.doc?.anim, inherited: true, ownStamp: !!raw.doc?.stamp } : raw.doc,
      plan: base.plan ? merge(base.plan, raw.plan) : raw.plan,
    } as Shot;
    if (raw.add) shot.elements = [...(shot.elements ?? []), ...raw.add];
  }
  const patch = ELEMENT_PATCHES[id];
  if (patch && shot.elements) shot = { ...shot, elements: patch(shot.elements) };
  if (shot.elements) shot = { ...shot, elements: liftCloseUps(shot.elements) };
  const o = DESC_OVERRIDES[id];
  if (o) shot = { ...shot, doc: o.doc ? merge(shot.doc, o.doc) : shot.doc, plan: o.plan ? merge(shot.plan, o.plan) : shot.plan };
  cache[id] = shot;
  return shot;
}

export type SubShot = { line: Line; timing: Timing; shot: Shot; localStart: number; localEnd: number };
export type Segment = { index: number; startFrame: number; endFrame: number; subs: SubShot[]; transitionIn: string };

export function buildSegments(): Segment[] {
  const segs: Segment[] = [];
  scenes.lines.forEach((line, i) => {
    const timing = timings.lines[i];
    if (timing.id !== line.id) throw new Error(`timings out of sync at ${line.id}`);
    const shot = resolveShot(line.shot);
    if (line.transitionIn === "hold" && segs.length) {
      const seg = segs[segs.length - 1];
      seg.subs.push({ line, timing, shot, localStart: timing.startFrame - seg.startFrame, localEnd: timing.endFrame - seg.startFrame });
      seg.endFrame = timing.endFrame;
    } else {
      segs.push({ index: segs.length, startFrame: timing.startFrame, endFrame: timing.endFrame, transitionIn: line.transitionIn, subs: [{ line, timing, shot, localStart: 0, localEnd: timing.endFrame - timing.startFrame }] });
    }
  });
  const end = timings.endCard;
  segs.push({
    index: segs.length,
    startFrame: end.startFrame,
    endFrame: end.startFrame + end.durationFrames,
    transitionIn: "cut",
    subs: [{ line: { id: "END", beat: "end", directive: null, voice: "", caption: "", shot: "END", pauseAfter: 0, emphasis: [], sfx: "stamp", transitionIn: "cut" }, timing: { id: "END", startSec: 0, audioSec: 0, endSec: 0, startFrame: end.startFrame, endFrame: end.startFrame + end.durationFrames, audioFrames: 0 }, shot: resolveShot("END"), localStart: 0, localEnd: end.durationFrames }],
  });
  return segs;
}

export const SEGMENTS = buildSegments();
