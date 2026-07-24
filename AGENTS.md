# AGENTS.md

## Repo Reality
- There is no `package.json`, lockfile, CI workflow, lint config, formatter config, or test runner in this repo. Do not invent `npm`/`pnpm` commands.
- The app is a plain static site rooted at `src/`. Main entrypoint: `src/index.html`.
- If you need to run it locally, use any simple static server with `src/` as the web root, or open `src/index.html` directly in a browser.

## Code Shape
- JS is split across `src/js/maze.js`, `game.js`, `render.js`, and `main.js`, loaded by plain `<script>` tags in that order.
- This codebase uses browser globals, not ES modules: `maze.js` exports constants onto `window`, `game.js` exports `createGame`/`update`/`DIRS`, and `render.js` exports `draw`.
- Script order is part of the architecture. If you rename, move, or add files, keep `src/index.html` load order valid or the game will break at runtime.

## Gameplay Constraints
- `MAZE` in `src/js/maze.js` is the pristine level definition. Runtime mutation happens on `game.grid`, which is copied from `MAZE` in `createGame()`. Preserve that separation.
- Canvas sizing is hard-wired: `TILE = 20` in `src/js/render.js`, maze is `28x31`, and `src/index.html` uses a `560x620` canvas. Keep those values in sync.
- Tunnel wrap logic depends on `TUNNEL_ROW = 14` and open maze edges on that row. Maze edits can silently break wrapping.
- Movement logic depends on fractional cell positions plus `aligned()` snapping in `src/js/game.js`. Be careful changing speeds, collision thresholds, or turn logic.

## Workflow Notes
- `README.md` is minimal; trust the source files for behavior.
- Repo-local spec workflow skills exist under `.agents/skills/` (`spec` and `spec-impl`). Use them for larger scoped features; there is currently no `specs/` directory yet.
