import { useEffect } from 'react'
import { CATALOG } from '../props/PropCatalog'
import { SmashableProp } from '../props/SmashableProp'
import { useGame } from '../state/store'

interface Placement {
  prop: keyof typeof CATALOG
  pos: [number, number, number]
  rotY?: number
  rotX?: number
}

// Surfaces (props are base-origined + height-normalized): floor · crate top ·
// double-crate top · desk top. Flat tyres are ~0.21 thick.
const FLOOR = 0.01
const CRATE = 0.56
const CRATE2 = 1.11
const DESK = 0.86

const BOTTLES = ['bottle_bordeaux', 'bottle_alsace', 'bottle_burgundy', 'bottle_champagne'] as const
let bottleCursor = 0
const L: Placement[] = []

function at(prop: keyof typeof CATALOG, x: number, y: number, z: number, rotY?: number, rotX?: number): void {
  L.push({ prop, pos: [x, y, z], rotY, rotX })
}

/** A row of bottles (cycling the 4 wine types) along one axis. */
function bottleRow(x: number, y: number, z: number, n: number, dx: number, dz: number): void {
  for (let i = 0; i < n; i++) {
    at(BOTTLES[bottleCursor++ % BOTTLES.length], x + dx * i, y, z + dz * i, Math.random() * 3)
  }
}

/** Classic 3-2 crate pyramid; returns the top-center for a crown prop. */
function cratePyramid(x: number, z: number, rot: number): [number, number, number] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const step = 1.35
  for (let i = -1; i <= 1; i++) at('crate', x + c * step * i, FLOOR, z + s * step * i, rot + (Math.random() - 0.5) * 0.2)
  for (const i of [-0.5, 0.5]) at('crate', x + c * step * i, CRATE, z + s * step * i, rot + (Math.random() - 0.5) * 0.2)
  return [x, CRATE2, z]
}

/** Cardboard 3-2-1 mountain. */
function cardboardPile(x: number, z: number, rot: number): void {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (let i = -1; i <= 1; i++) at('cardboard', x + c * i, FLOOR, z + s * i, rot + i)
  for (const i of [-0.5, 0.5]) at('cardboard', x + c * i, 0.63, z + s * i, rot + i * 2)
  at('cardboard', x, 1.26, z, rot + 0.7)
}

/** Flat tyre stack of 3. */
function tyrePile(x: number, z: number): void {
  for (let i = 0; i < 3; i++) at('tyre', x + (Math.random() - 0.5) * 0.12, 0.13 + i * 0.22, z + (Math.random() - 0.5) * 0.12, Math.random() * 3, Math.PI / 2)
}

// ============================== THE GARAGE ==============================
// 16x16, player spawns at (0, 5) facing -z. Spawn pocket (|x|<1.8, z>3.6 center)
// stays clear; lanes between clusters stay walkable.

// ---- north shelf wall, bottle rank in front ----
at('shelves', -5.4, 0, -7.15)
at('shelves', -4.05, 0, -7.15)
at('shelves', -2.7, 0, -7.15)
at('shelves', -1.35, 0, -7.15)
bottleRow(-5.6, FLOOR, -6.35, 10, 0.47, 0)

// ---- west shelf pair + floor bottles ----
at('shelves', -7.15, 0, -0.7, Math.PI / 2)
at('shelves', -7.15, 0, 0.65, Math.PI / 2)
bottleRow(-6.5, FLOOR, -4.9, 6, 0, 0.45)

// ---- desk stations (4) ----
at('desk', -4.7, 0, -5.4)
at('tv', -4.7, DESK, -5.55, 0.1)
at('vase', -3.6, DESK, -5.6)
bottleRow(-5.7, DESK, -5.6, 2, 0.35, 0)

at('desk', 4.9, 0, -5.3, -0.08)
at('tv', 4.9, DESK, -5.45, -0.15)
at('vase', 5.9, DESK, -5.5, 0.6)
bottleRow(3.95, DESK, -5.5, 2, 0.38, 0)

at('desk', 6.55, 0, 1.7, Math.PI / 2)
at('tv', 6.6, DESK, 1.7, Math.PI / 2 + 0.1)
bottleRow(6.55, DESK, 0.75, 2, 0, 0.4)

at('desk', -6.6, 0, 3.6, -Math.PI / 2)
at('vase', -6.6, DESK, 3.1)
at('vase', -6.65, DESK, 4.05, 1.1)
bottleRow(-6.55, DESK, 3.55, 1, 0, 0)

// ---- crate pyramids crowned with TVs ----
const top1 = cratePyramid(3.1, -2.9, 0.15)
at('tv', top1[0], top1[1], top1[2], 0.4)
const top2 = cratePyramid(-3.5, -1.9, -0.35)
at('tv', top2[0], top2[1], top2[2], -0.2)

// loose crates + crate-top glass
at('crate', 6.6, FLOOR, -3.4, 0.5)
at('vase', 6.6, CRATE, -3.4)
at('crate', 5.5, FLOOR, -1.4, 1.2)
bottleRow(5.35, CRATE, -1.5, 2, 0.32, 0.1)
at('crate', -5.9, FLOOR, -3.3, 0.8)
at('vase', -5.9, CRATE, -3.3, 0.5)
at('crate', 1.4, FLOOR, -6.5, 0.3)
bottleRow(1.2, CRATE, -6.55, 2, 0.4, 0)
at('crate', -0.6, FLOOR, 2.9, 1.6)
at('crate', 2.9, FLOOR, 3.6, 0.9)
at('vase', 2.9, CRATE, 3.6, 1.9)

// ---- cardboard mountains + scatter ----
cardboardPile(0.6, -4.6, 0.3)
cardboardPile(-5.6, 1.9, 1.2)
cardboardPile(4.9, 3.9, 2.1)
at('cardboard', 2.1, FLOOR, -1.4, 0.7)
at('cardboard', -1.9, FLOOR, -3.1, 1.4)
at('cardboard', 7.0, FLOOR, -1.6, 0.2)
at('cardboard', -3.2, FLOOR, 3.3, 2.3)
at('cardboard', 1.2, FLOOR, -2.6, 1.9)
at('cardboard', -6.9, FLOOR, -5.9, 0.9)

// ---- TV shrine (floor CRT) ----
at('tv', 1.6, FLOOR, -1.7, 2.8)

// ---- vase clusters ----
at('vase', -1.2, FLOOR, -5.9)
at('vase', -0.65, FLOOR, -6.15, 1.3)
at('vase', 0.1, FLOOR, -5.75, 2.4)
at('vase', 3.9, FLOOR, -0.7, 0.8)
at('vase', 4.45, FLOOR, -1.05, 1.7)
at('vase', -4.4, FLOOR, 0.4, 0.4)
at('vase', -3.85, FLOOR, 0.75, 2.9)
at('vase', 0.8, FLOOR, 1.9, 1.1)

// ---- chair rows + scatter ----
at('chair', -2.5, FLOOR, -0.5, 2.9)
at('chair', -1.35, FLOOR, -0.75, 3.3)
at('chair', 2.35, FLOOR, -0.35, -2.7)
at('chair', 3.5, FLOOR, -0.7, -3.1)
at('chair', 6.4, FLOOR, -6.6, -2.2)
at('chair', -3.3, FLOOR, 5.6, 1.9)
at('chair', 3.3, FLOOR, 5.8, -1.7)
at('chair', 0.3, FLOOR, -3.6, 0.5)

// ---- barrels ----
at('barrel', 6.85, FLOOR, -6.85)
at('barrel', 6.1, FLOOR, -6.5, 0.8)
at('barrel', 6.75, FLOOR, -5.65, 1.7)
at('barrel', -6.85, FLOOR, -6.85, 0.4)
at('barrel', -6.2, FLOOR, -6.35, 2.2)
at('barrel', 7.0, FLOOR, 5.9, 1.1)
at('barrel', -7.0, FLOOR, 6.2, 2.8)
at('barrel', -0.9, FLOOR, 6.4, 0.6)

// ---- tyres: flat piles + upright rollers ----
tyrePile(6.75, 3.85)
tyrePile(-6.9, -3.9)
at('tyre', 2.0, FLOOR, 2.4, 0.4)
at('tyre', -2.1, FLOOR, 1.6, 1.3)
at('tyre', 7.05, FLOOR, -0.2, 0.9)
at('tyre', -0.4, FLOOR, -7.0, 2.0)

const LAYOUT = L

export function Dressing() {
  const roomKey = useGame((s) => s.roomKey)
  const setTotalMass = useGame((s) => s.setTotalMass)

  useEffect(() => {
    const total = LAYOUT.reduce((sum, p) => sum + CATALOG[p.prop].mass, 0)
    setTotalMass(total)
  }, [setTotalMass, roomKey])

  return (
    <>
      {LAYOUT.map((p, i) => (
        <SmashableProp
          key={`${roomKey}:${i}`}
          def={CATALOG[p.prop]}
          position={p.pos}
          rotationY={p.rotY}
          rotationX={p.rotX}
        />
      ))}
    </>
  )
}
