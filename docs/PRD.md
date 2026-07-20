# Rage Room — Product Requirements (v1)

> A first-person, physics-driven 3D rage room in the browser. Walk into a room full of
> smashable junk and **absolutely obliterate it** — hurl bottles like CS:GO grenades,
> mash your keyboard to swing a sledgehammer, and watch everything shatter, crumple, and
> fly apart in crunchy, slow-mo glory until the room hits **100% destroyed**.

## 1. Vision & feel

The single job of this product is **catharsis**. Every interaction must feel *weighty,
loud, and destructive*. We are not chasing simulation accuracy — we are chasing the
full-body "hell yeah" of watching a CRT TV implode.

Because **true hardware haptics don't exist on a desktop browser** (no API can buzz a
mouse or keyboard — see ARCHITECTURE §Reality checks), the "almost haptic" feel is
*manufactured* from three channels, all driven off one impact-energy value:

1. **Visual** — fracture, debris, screen-shake, FOV punch, bloom/chromatic-aberration flash.
2. **Audio** — layered, crunchy, realistic smash SFX (the other half of the catharsis).
3. **Time** — hit-stop (micro-freeze on impact) + **slow-motion** as the drama engine.

## 2. Locked design (v1)

| Dimension | Decision |
|---|---|
| **Core loop** | Single purpose-built rage room, free-play, **destruction-% score**, **no timer** |
| **Product** | Free, viral-intent; **no accounts, fully static, zero backend** in v1 |
| **Feel** | Slow-mo-driven: rage-meter overdrive + auto hero-smash slow-mo; realistic crunchy audio |
| **Controls** | First-person PointerLock; **mouse-flick throw** (grenade-style) + **keyboard-mash melee** |
| **Arsenal** | Grab & throw any prop + **swappable melee** (bat / sledgehammer / crowbar) |
| **Smashables** | Glass & bottles · e-waste (TVs/CRTs/monitors/PCs/keyboards) · furniture/housewares · **de-branded Telecaster** hero |
| **Art** | Stylized low-poly + juicy PBR on heroes; dynamically-lit concrete/warehouse room |
| **Device** | Desktop-first, mobile playable (touch-flick + halved budgets) |
| **Fidelity** | Hybrid fracture, **60fps on mid-tier Android** floor |

## 3. Core loop

```
enter room  →  pick a target  →  throw a prop OR mash-swing melee
     ↑                                      ↓
     └──  room not 100% destroyed  ←──  object breaks (fracture + debris + juice + audio)
                                             ↓
                              destruction-% ticks up · rage meter fills
                                             ↓
                       rage meter full → SLOW-MO OVERDRIVE burst
                                             ↓
                              room 100% destroyed → payoff screen
```

There is **no fail state and no clock**. The only "goal" is the satisfying march to 100%.

## 4. Signature features

- **Destruction-% score.** One honest number: `destroyed_mass / total_mass`. Big, juicy
  progress toward a 100% payoff. No combos, no multipliers, no pressure.
- **Rage meter → slow-mo overdrive.** Smashing fills a meter; when full, the player
  triggers a short **slow-motion destruction burst** (time dilation + intensified juice).
- **Auto slow-mo hero-smashes.** Big/hero destructions (CRT implosion, guitar smash)
  automatically drop into cinematic slow-motion for a beat.
- **Swappable melee.** Bat / sledgehammer / crowbar, each with distinct weight & reach.

## 5. Controls

| Input | Action |
|---|---|
| `WASD` / arrows | Walk around the room (first-person character controller) |
| Mouse move | Look / aim (PointerLock) |
| Hold RMB → flick + release LMB | Charge & **throw** the held prop (grenade-style arc) |
| Keyboard mash (e.g. `F` / spacebar) | **Melee swing** the equipped weapon |
| `1` / `2` / `3` or scroll | Swap melee weapon |
| `E` | Grab / pick up a nearby prop to throw |
| `Esc` | Release pointer lock / pause |
| Touch (mobile) | Drag-flick to throw · tap to swing · look via second finger |

## 6. Smashable roster (v1)

- **Glass & bottles:** beer/wine bottles, drinking glasses, jars, light bulbs, vases, one **hero transmission-glass** centerpiece.
- **E-waste:** vintage TV, CRT monitor, LCD monitor, desktop PC tower, laptop, mechanical keyboard, phone.
- **Furniture / housewares:** chairs, mugs, plates, a lamp (CC0-kit dressing that also breaks).
- **Hero:** the **de-branded Telecaster** guitar as the centerpiece smash.

> v1 ships a **medium room: ~12–15 smashables + 2–3 heroes**, gated on **zone-based
> activation** to respect the mobile physics cap (see ARCHITECTURE §8 & §11).

## 7. Art direction

Stylized **low-poly** silhouettes with **good PBR materials on hero smashables**. "Juicy"
comes from materials + physics + VFX + audio, **not polygon count**. One cohesive lighting
rig, limited palette, gritty industrial room (concrete / warehouse / abandoned office).

## 8. Non-goals (explicitly out of scope for v1)

- ❌ Uploads (image or 3D model) — deferred.
- ❌ Accounts, auth, backend, database — v1 is 100% static.
- ❌ Combos / multipliers / timer / fail state.
- ❌ Clip / GIF capture & sharing — **deferred to fast-follow** (keeps the "viral" runway open).
- ❌ Multiplayer, multiple rooms, progression/unlocks.
- ❌ Monetization.

## 9. Success criteria

1. **It feels amazing.** A first-time player smashes something in <5s and grins.
2. **60fps** on a **named mid-tier target (Pixel 6a class)** through a full-room smash,
   verified on a committed **benchmark stress scene**; **no >1-frame hitch** at impact;
   JS frame ≤ ~8ms.
3. **Time-to-first-smash ≤ ~4s** on throttled mobile; runs with **zero backend**; **no memory
   leak** across repeated full-room resets (soak test).
4. Reaching **100% destruction** feels like a genuine payoff.

## 10. Fast-follow roadmap (post-v1, not now)

- One-tap **clip/GIF capture** & share (the viral hook).
- **Leaderboards** (fastest-to-100%, most-destroyed) via a Butterbase backend.
- **Image upload** → texture on a pre-fractured prop ("smash your ex/boss").
- The reused **`desk.glb` cozy room** as a second selectable stage.
- Additional rooms / themes.
