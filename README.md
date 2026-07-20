# Rage Room

First-person 3D physics rage room in the browser. Smash a room full of junk to 100%.
Built with Three.js + React-Three-Fiber + Rapier.

See [`docs/PRD.md`](docs/PRD.md) (product) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
(the version-pinned, Codex-reviewed technical plan).

## Run

```bash
nvm use          # Node 22.12 (see .nvmrc)
pnpm install
pnpm dev         # http://localhost:5173
```

Click to lock the pointer, `WASD` to move, mouse to look, `Esc` to release.

## Status

**Scaffold (v0.1):** toolchain + first-person character controller + physics room +
placeholder smashable boxes + HUD. Fracture pipeline, real props, juice, and audio are next
(tracked against `docs/ARCHITECTURE.md`).

## Scripts

- `pnpm dev` — dev server
- `pnpm build` — typecheck + production build
- `pnpm typecheck` — types only
