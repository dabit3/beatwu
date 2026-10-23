# Scott Wu vs. You

A card arithmetic race against Scott Wu's real times from the two source videos in this folder.
The player combines every card with + − × ÷ to hit the goal before Scott's time runs out.

## Commands

- `npm run dev` starts the Vite dev server at http://localhost:5173.
- `npm test` runs the Vitest suite for the game logic, solver, and Scott's runs.
- `npm run typecheck` runs TypeScript 7 (`tsc --noEmit`).
- `npm run build` typechecks, then builds to `dist/`.

## Layout

- `src/game/` holds pure game logic: board state, arithmetic, solver, clock, and saved best times. Tests live in `src/game/game.test.ts`.
- `src/game/puzzles.ts` holds Scott's two deals, goals, and per-move timestamps, transcribed from the videos (8 cards: 2025 in 13.2s; 9 cards: 6843 in 20.8s).
- `src/components/` holds the screens: `Menu`, `Game`, `Intro`, `WinScreen`, and `MoggedScreen`.
- `src/fx/` holds the comic effects: starbursts, particles, flash, and screen shake.
- `src/audio/sfx.ts` synthesizes every sound with Web Audio. There are no audio files.
- `src/audio/music.ts` is the background music: an original 60s surf-spy tune (a 12-bar minor blues in E at 132 BPM), synthesized the same way. It shares the sound effects' context and master volume, so mute silences it too. Screens set its scene with `music.setScene(...)`: `menu`, `intro` (muffled under the VS splash and countdown), `play` (restarts from bar 1 on "GO!"), `tension` (muffled in Scott's final 3 seconds), `end` (stops for the win and lose stingers), and `results` (comes back on the end screens). It pauses in background tabs. `LEVEL` sets its loudness: 0.1 measures about −34 LUFS, roughly 9 dB under a card hit. Tests in `src/audio/music.test.ts` check the song data.
- The floating sound button cycles through music and effects, effects only, and muted. Both settings are saved in localStorage.
- `src/components/copy.ts` holds all burst text (aura points, slang, math puns), Scott's quotes, `CLIP_URL` (swyx's post with the original clip, linked from the menu and end screens via `ClipLink` in `Chrome.tsx`), and `MOG_QUIPS`, the kid's lines on the losing screen. Each loss shows the next quip; the position is saved in localStorage. `\n` sets a burst's line break.
- The menu footer has a "Built by Devin" credit linking to https://devin.ai/. The logo, `src/assets/devin-lockup.svg`, is the official horizontal lockup, made white and cropped to the artwork.
- `MoggedScreen.tsx` imports `mogged.png` straight from the project root. The zoom target (the small kid's eyes) is set by `--fx`, `--fy`, and `--s` on `.mog__frame` in `End.css`.

## Share image and tags

- `index.html` holds the OpenGraph and Twitter tags. `%SITE_URL%` is replaced at build time by a small plugin in `vite.config.ts`, using `SITE_URL` or the host's production URL (Vercel, Netlify, Cloudflare Pages). On any other host, build with `SITE_URL=https://your.domain npm run build`, or previews won't show the image.
- `public/og.jpg` (1200×630) and `public/apple-touch-icon.png` (180×180) are screenshots of `og.html`, a dev-only page built from `src/og/`. To change them, edit `src/og/`, run the dev server, and capture http://localhost:5173/og.html at 1200×630 (and `og.html#icon` at 180×180). Keep `og.jpg` under about 300 KB so WhatsApp shows it.
- `public/favicon.svg` (a tilted card with a red heart) is the icon source. `public/favicon-32.png` is a 32×32 capture of it for browsers without SVG icons, and the home-screen icon places it on a starburst. Recapture both after editing the SVG.

## Mobile

- Phones get extra layouts in the CSS, all inside media queries, so desktop is unaffected: `max-width: 760px` (stacked HUD), `max-width: 760px and max-height: 740px` (short phones: compact HUD, Undo/Reset become icons beside the operators), and `orientation: landscape and max-height: 500px` (sideways phones: one row of cards, two-column menu and end screens).
- Heights use `var(--vh)`, which is `1svh` where supported, so sizes respect mobile browser toolbars.
- Hover effects sit behind `@media (hover: hover)` so they don't stick after a tap. Keyboard hints (`kbd`) are hidden on touch screens.

## Notes

- Numbers use Inter (the `.num` class), not Bangers, because Bangers draws 7 almost like 1.
- Division must come out even, and intermediate results may be negative.
- Dependencies are pinned to exact versions that were at least 7 days old when installed.
- When automating the game in a browser, launch Chrome with `--mute-audio`, or the test run plays the music out loud.
