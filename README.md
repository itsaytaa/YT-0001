# Not Covered: Advisory 0001 (cat corner)

"If Your Cat Ever Stares At An Empty Corner… DO NOT LOOK": a 5:00 pictogram horror video, drawn in code with Remotion (React + SVG). The only AI-generated asset is the voice-over (OpenRouter).

- `CLAUDE.md`: the 10-step build spec. Creative sources: `brief.md`, `scenes.json`, `style.json`, `scene-library.md`, `audio.json`, `script.md`.
- `reports/report.md`: build report (runtime, voice, STT results, cost, deviations).
- `metadata.md`: YouTube title, description, chapters and tags. `out/thumbnail.png`: the thumbnail.
- `out/review/contact-sheet.png`: one still per shot.

## Re-render

Requires Node 18+ and ffmpeg. The voice-over is already in the repo (`audio/lines/*.mp3` as generated, `video/public/lines/*.wav` trimmed), so no API calls are needed.

```sh
node scripts/sfx.mjs                 # rebuild sound effects + drone bed (drone.wav is not committed)
cd video && npm install
npx remotion render Video ../out/advisory-0001-cat-corner.mp4 --codec=h264 --crf=16 --audio-codec=aac --audio-bitrate=320k
cd ../out && ffmpeg -i advisory-0001-cat-corner.mp4 \
  -af "volume=enable='between(t,46.30,46.60)':volume=0.79,loudnorm=I=-14:TP=-2.0:LRA=11,aresample=48000" \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart advisory-0001-cat-corner-final.mp4
```

Other entry points:
- `npx remotion studio`: preview in the browser.
- `node scripts/review-stills.mjs`: stills plus the contact sheet.
- `npx remotion still Thumbnail ../out/thumbnail.png`: the thumbnail.

## Regenerating the voice

Put `OPENROUTER_API_KEY=...` in `.env` (gitignored).

1. Delete `audio/lines/*.mp3`.
2. Run `node scripts/tts.mjs`.
3. Run `node scripts/stt-check.mjs`.
4. Run `node scripts/timings.mjs`.

The voice model is set in `scripts/voice-config.json`. On Node 22 behind a proxy, run with `NODE_USE_ENV_PROXY=1`.
