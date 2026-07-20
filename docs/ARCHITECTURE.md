# Rage Room — Technical Architecture (v2, post-Codex-review)

> Grounded against live docs (context7 + web) on **2026-07-20**, then hardened against an
> independent Codex review that flagged the v1 runtime-fracture core as not
> implementation-ready. **v2 pivots to pre-fractured, validated shard sets** — the change
> that makes pooling, batching, and colliders all valid. Every version below is pinned exact.

## 1. Stack fact sheet (pinned)

| Library | Pin | Key APIs | Biggest gotcha |
|---|---|---|---|
| `three` | **0.185.1** (r185) | `WebGLRenderer`, `BatchedMesh`, `BufferGeometryUtils.mergeGeometries`, TSL via `three/tsl` | Legal window **r182–r185** (three.quarks floors r182, `postprocessing` caps `<r186`). |
| `@react-three/fiber` | **9.6.1** | `Canvas`, `useFrame`, `useThree`, `extend` | React ceiling `>=19 <19.3`. Never `@latest` (v10 alpha exists). |
| `@react-three/drei` | **10.7.7** | `PointerLockControls`, `Bvh`, `Instances`, `useGLTF`, `Environment files=`, `PerformanceMonitor`, `AdaptiveDpr` | `<Bvh firstHitOnly>` defaults **false**. Depends on `three-mesh-bvh ^0.8.3` → **needs an `overrides` to dedupe with 0.9.13** (P2). |
| `react` / `react-dom` | **19.2.0** | — | Don't exceed 19.2 on fiber 9. |
| `@react-three/rapier` | **2.2.0** | `<RigidBody ccd colliders='hull' onContactForce>`, `useRapier().world`, `useBeforePhysicsStep`, `useAfterPhysicsStep`, `<Physics timeStep>` | **No `contactForceEventThreshold` prop** (native setter). **R3R owns & drains its own `EventQueue`** — don't hand-drain; use `onContactForce` to activate + receive, then read the world's contact graph for the point. Main-thread sim. |
| `@dimforge/rapier3d-compat` | **exact 0.19.2** (bundled by r3r) | `ColliderDesc.convexHull`, `world.contactPair`/manifolds, `ShapeCast`, `enableCcd`, `.sleep()` | Consume the **instance R3R returns** (`useRapier().rapier`) — a direct ranged dep spawns a 2nd WASM copy (P2). |
| `@dgreenheck/three-pinata` | **2.0.1** | `DestructibleMesh`, `.fracture(...)` | **Desktop-only optional tier in v2.** Manifold input required; fragments not guaranteed convex. Not the mobile path. |
| `three-mesh-bvh` | **0.9.13** (+ `overrides`) | `computeBoundsTree`, `acceleratedRaycast` | Used only for the **intact interaction set**; shards are excluded from raycast layers. |
| `three.quarks` + `quarks.r3f` | **0.17.1** | `<QuarksProvider>`, `<QuarksEffect>` | Depends on `quarks.core: "*"` → **pin/override `quarks.core`** + verify lockfile (P2). Floors three at r182. |
| `postprocessing` | **6.39.3** | `EffectPass`, `BloomEffect`, `ChromaticAberrationEffect` | Peer `three <0.186` (caps the window). WebGL-only. |
| `@react-three/postprocessing` | **3.0.4** | `<EffectComposer>` | Ensure a single resolved `postprocessing` or white-screen. |
| `zustand` | **5.0.14** | `create`, `getState`/`setState`, transient `subscribe` | Keep per-frame values out of reactive selectors. |
| `vite` | **8.1.5** (Rolldown) | `optimizeDeps.exclude`, `?url` | **Requires Node `^20.19 || >=22.12`** → pin via `.nvmrc` + `engines` (P2). |
| `@vitejs/plugin-react` | **6.0.3** | — | peer `vite ^8`. |
| `@sentry/browser` | latest 8.x | `init` (client-only) | Scope to WebGL context-loss + `RAPIER.init`. |

**Node:** pin `.nvmrc` = `22.12` and `package.json` `engines.node`. **Renderer:** ship v1 on
`WebGLRenderer`; keep custom shaders on the **established GLSL path** for v1 (a TSL/WebGPU
swap is a *future milestone*, not a flag flip — Codex P2: "ports cleanly" is not a contract).

## 2. Reality checks (constraints, not opinions)

1. **No desktop haptics** — feel is manufactured (visual+audio+time). Designed around this.
2. **Runtime fracture is the hitch** — Voronoi + collider + BVH + normal recompute is
   synchronous main-thread work; staggering *mounts* doesn't stagger *that*. → **pre-fracture
   offline.**
3. **Unique runtime shards defeat instancing and the draw-call budget.** Pre-authored shard
   sets share geometry per prop type → valid `BatchedMesh` / instancing.
4. **three-pinata & ConvexObjectBreaker both need clean convex/manifold input** that our
   pretty outer meshes don't have → **hidden watertight fracture proxies**, validated offline.
5. **Rapier contact-force events carry force + handles, not a contact point** → derive the
   impact point from the world contact graph.
6. **Mobile thermal WebGL context-loss (~5min)** is real — explicit handler or controlled reload.

## 3. The fracture pipeline (the v2 core)

**Offline (build-time), per breakable prop:**
1. Author a **pretty outer mesh** (procedural or CC0) + a **watertight fracture proxy**
   (single manifold solid roughly matching the silhouette).
2. Run **Blender Cell Fracture** (script, headless in CI) on the proxy → N shards
   (convex props 4–8, concave heroes 8–16 mobile / up to ~30 desktop tier).
3. For each shard: compute a **simplified convex hull collider** (validated: non-degenerate,
   correct winding, mass > 0), assign **inner (raw/broken) + outer materials**.
4. **Validate** (CI gate, §11): manifoldness, self-intersection, degenerate tris, fragment
   ceiling, collider validity, **mass conservation** (Σ shard mass ≈ proxy mass).
5. Export a **shard set** per prop: merged/batched geometry + per-shard transform, collider
   points, mass. Compressed (meshopt).

**Runtime, on break:** swap the intact mesh for its **pre-authored shard set** — no Voronoi,
no runtime hull, no per-shard BVH build. Shards are known geometry → render via **`BatchedMesh`**
(one draw call per prop type) and pool/reuse across resets.

> **Runtime three-pinata Voronoi is a desktop-only optional tier** for extra break variety,
> gated behind a capability + GPU-time check. Never the mobile path.

## 4. The smash loop (data flow, corrected)

```
PointerLock look ─► aim ray (three-mesh-bvh, INTACT interaction layer only)
        ┌───────── THROW ───────┴───────── MELEE ─────────┐
  hold RMB charge                       keyboard mash (event.repeat===false + cooldown)
  sample movementX/Y ring buffer          └► Rapier SHAPE-CAST (capsule) from prev→current
  release LMB → launch vector                 weapon pose (PHYSICS transforms), ≤1 hit/target/swing
  RigidBody.setLinvel(v,true) + enableCcd      synthesize normal impulse from swing speed
        │                                         │
        └──────────────┬──────────────────────────┘
                       ▼
  Rapier step (fixed accumulator).  onContactForce activates CONTACT_FORCE events.
                       ▼
  In useAfterPhysicsStep: for each force event over the prop's native threshold →
    read world.contactPair(c1,c2) → dominant manifold point → world+local + normal  ← the impactPoint
    impactEnergy = calibrated normal-impulse/energy (single measure; suppress resting contacts)
                       ▼
  break decision via per-prop STATE MACHINE:  intact → pendingBreak → broken
    (guards against repeat/persistent-contact double-fire; one break, one score, one juice)
                       ▼
  DEFERRED world mutation (command queue applied after the step):
    remove intact body → spawn pre-authored shard set (BatchedMesh + pooled bodies)
    each shard inherits parent linear+angular velocity, divided mass, + separation impulse
                       ▼
  impactBus.emit(energy, material, point) ─► hit-stop(ms) · shake · FOV punch · bloom/CA ·
        │                                     three.quarks VFX · layered crunch SFX (PannerNode)
        ▼
  store: destruction% += destroyedMass/totalMass (over ALL props) ; rage += k·energy
        ▼
  shards sleep on settle → retire to a merged STATIC mesh / despawn under a GLOBAL shard budget
```

**Shard collision filtering:** shards are put in a collision group that **does not collide
with other shards** on mobile (avoids N² contact + audio storms) and whose events are masked
to report only meaningful prop/projectile impacts.

## 5. Physics

- `<Physics timeStep={1/60}>` fixed accumulator, main thread; shard-spawn code kept
  **worker-portable** (future ceiling raise) but no COOP/COEP in v1.
- **CCD** on in-flight throwables only (disable on settle). Throwables use `setLinvel`.
- **Break threshold** set natively per collider (`setContactForceEventThreshold`), tuned
  against the single calibrated energy measure — **not** velocity×mass×force (double-counts).
- Global **active-body budget** with sleeping + retirement; **debris accumulation, not intact
  prop count, is the cap** (Codex: zone activation was solving the wrong problem — dropped as
  the primary mechanism; distant-prop culling stays as a minor optimization only).

## 6. Player controller & grab (was missing entirely)

- **Movement:** Rapier **kinematic-velocity character controller** (`world.createCharacterController`)
  driving a capsule; WASD + PointerLock look. Player capsule excluded from thrown/shard
  collision groups except the floor/walls.
- **Grab (`E`):** short raycast reach → attach the target as a **kinematic "held" body**
  (excluded from player collision, follows a hold anchor in front of the camera). **Throw**
  transitions held→dynamic, applies the composed launch velocity, re-enables CCD.

## 7. Time / slow-mo clock (was undefined)

A single **`timeScale`** (1.0 real-time → e.g. 0.15 overdrive) is the source of truth. It
scales, together: physics stepping (accumulator dt), animation mixers, `three.quarks` update,
camera-FX tweens, and audio `playbackRate`. **Hit-stop is defined in milliseconds** (e.g.
40–90ms energy-scaled) and converted to frames per the live refresh rate — never "3–5 frames".
Real-time vs simulation-time are tracked separately so input latency stays real-time.

## 8. Rendering & juice budgets

- **WebGL2**, DPR **clamped 1–1.5** (mobile). **Per-feature GPU-time gating** (Codex P2):
  transmission, bloom, and DPR each toggle on **measured frame cost**, not one coarse device
  tier (AdaptiveDpr reacts *after* a miss — pre-gate the expensive features).
- **Draw calls via `BatchedMesh`:** each prop-type's shard set batches to ~1 draw; retired
  debris merges into one static mesh; long-tail debris is **visual-only particles**. Target
  **< 100 draws desktop / < 80 mobile** — now achievable because shards are pre-authored.
- **Transmission:** exactly one hero glass, `resolution ≤ 256`, `samples ≤ 6`, `backside`
  only for the true centerpiece; extra glass shares `transmissionSampler`. Never a 2nd FBO.
- **Shadows:** `PCF/Basic` on mobile, one light, `mapSize` 512–1024, shards never cast.
- **Post:** merged `EffectPass` bloom+CA; `mipmapBlur=false`/`resolutionScale≈0.5` mid mobile;
  composer **off** on low tier.
- **HDRI:** `<Environment files="/env.hdr">` self-hosted (never a CDN `preset=`).
- **Impact-energy bus:** one event drives hit-stop, shake, FOV punch, flash, particles, audio.
  Global **juice slider** + **`prefers-reduced-motion`** honored.

## 9. Audio (corrected)

Custom **Web Audio** layer: pool **decoded buffers + voice slots** but create a **new
`AudioBufferSourceNode` per playback** (they're single-use after `start()` — Codex P2). Use
**`PannerNode`** for world-space 3D audio (not `StereoPanner`). Per-`MaterialClass` layered
one-shots (transient+body+debris) over a shared `ConvolverNode`, round-robin + pitch/gain
jitter, hard voice cap (24–32, coalesce debris). **Tap-to-enter** unlock (iOS/Safari).

## 10. Performance budgets & the benchmark scene

| | Desktop | Mid-tier Android (Pixel 6a class) |
|---|---|---|
| Total dynamic bodies | ≤ 500 | ≤ 60 (hard) |
| Awake bodies | ≤ ~250 | ≤ 40–50 |
| Global live shards | ≤ 150 | ≤ 25–30 |
| Draw calls | < 100 | < 80 |
| JS frame budget | — | ≤ ~8ms |
| DPR | ≤ 2 | 1–1.5 |
| Time-to-first-smash (throttled) | — | ≤ ~4s |

**Success is measurable, not vibes** (Codex P1): a committed **benchmark stress scene**
(spawn the full shard census + throwables) profiled on a **named target device**, with
triangle/material/heap/WASM/GPU-memory ceilings and a repeated **full-room-reset memory
soak** (no leak across resets). These gates run before "done".

## 11. Asset pipeline, validation & memory

- **Procedural-first** outer meshes (bottles `LatheGeometry`, boxy electronics) + CC0
  (Kenney/Quaternius) for the room shell/dressing. **Author procedurally** the detailed heroes
  with no clean CC0 (CRT/TV/glass). **De-branded Telecaster:** GLB export, retopo, **watertight
  fracture proxy** + pre-authored shard set (not runtime-fractured as one object).
- **Offline fracture CI gate** (Codex P2): validate manifoldness, self-intersection, degenerate
  tris, winding, volume, fragment ceiling, convex-collider validity, **mass conservation**.
  A prop that fails the gate can't ship.
- **Memory/disposal budget** (Codex P2): explicit ownership + ref-counting for shared
  geometries/materials/BatchedMesh; measured heap/WASM/GPU across repeated resets.
- **Load budget:** byte ceilings per GLB/audio, decoded-memory ceilings, initial-vs-lazy asset
  groups, meshopt compression. **License tiers** in `CREDITS.json`: true CC0
  (Kenney/Quaternius/Freesound-CC0) · royalty-free-in-game (Sonniss/Pixabay) · **avoid CC-BY**
  (most Poly Pizza) for v1.

## 12. Deploy (zero-backend v1)

Static Vite build → **Cloudflare Pages** (via Butterbase). Heavy `.glb`/`.wasm`/audio → **R2**
via a **custom domain** (never `r2.dev`), explicit `Content-Type` (`application/wasm`,
`model/gltf-binary`), bucket **CORS** GET/HEAD. **No COOP/COEP** (main-thread rapier compat).
**Client-only Sentry** for WebGL context-loss + `RAPIER.init` failure.

## 13. Resolved decisions (v2)

| # | Decision | Choice |
|---|---|---|
| A | Melee | **Rapier capsule shape-sweep** prev→current pose (physics transforms), ≤1 hit/target/swing, impulse+torque. *(Not a render-BVH ray — Codex P1.)* |
| B | Room | **Medium ~12–15 smashables + 2–3 heroes**, held under a **global shard budget** (not zone activation). |
| C | Threading | **Main-thread**, worker-portable spawn code. |
| D | **Guitar / all concave heroes** | **Pre-fractured offline** (Blender Cell Fracture) behind a watertight proxy. *(Reversed from runtime Voronoi — Codex P1.)* Runtime pinata = optional desktop tier. |
| E | Compression | **meshopt**. |
| F | Errors | **Client-only Sentry**. |
| G | Convex props | **Pre-fractured too** (ConvexObjectBreaker relegated to an optional desktop tier for genuinely-convex crates — Codex P1: our lathe/merged meshes aren't valid convex input). |

## 14. Top risks & mitigations

| Risk | Mitigation |
|---|---|
| Impact-frame hitch | **Pre-authored shard sets** (no runtime Voronoi/hull/BVH), BatchedMesh, deferred mutation, global shard budget |
| Wrong colliders from bad convex input | Offline-validated convex hulls per shard; CI gate; never trust runtime `convexMesh` blindly |
| Missing impact point | Derive from Rapier contact manifold in `useAfterPhysicsStep` |
| Double-fire breaks/score | `intact→pendingBreak→broken` state machine; suppress resting/repeat contacts |
| Mobile thermal context-loss | Explicit handler / controlled reload preserving game state |
| Dep graph drift | Exact pins + `overrides` (three-mesh-bvh, quarks.core, rapier 0.19.2) + committed lockfile + Node pin + CI version check |
| Unmeasurable perf claims | Named target device + benchmark scene + memory soak gate before "done" |
