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
- `MoggedScreen.tsx` imports `mogged.png` straight from the project root. The zoom target (the small kid's eyes) is set by `--fx`, `--fy`, and `--s` on `.mog__frame` in `End.css`.

## Notes

- Numbers use Inter (the `.num` class), not Bangers, because Bangers draws 7 almost like 1.
- Division must come out even, and intermediate results may be negative.
- Dependencies are pinned to exact versions that were at least 7 days old when installed.
