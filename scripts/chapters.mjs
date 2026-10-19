// Step 9: fill the CHAPTERS block in metadata.md from timings.json (first line of each beat).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, scenes, readJson } from "./lib.mjs";

const timings = readJson("video/src/data/timings.json");
const startOf = (beat) => timings.lines[scenes.lines.findIndex((l) => l.beat === beat)].startSec;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const chapters = [
  ["Advisory 0001", 0],
  ...scenes.beats.filter((b) => b.id.startsWith("directive_")).map((b) => [b.label, startOf(b.id)]),
  ["Addendum", startOf("addendum")],
];
const block = chapters.map(([label, s]) => `${fmt(s)} ${label}`).join("\n");

const path = join(root, "metadata.md");
const md = readFileSync(path, "utf8");
const updated = md.replace(/CHAPTERS\n(?:<!--.*?-->\n)?(?:\d+:\d\d .*\n)+/, `CHAPTERS\n${block}\n`);
if (updated === md) throw new Error("CHAPTERS block not found");
writeFileSync(path, updated);
console.log(block);
