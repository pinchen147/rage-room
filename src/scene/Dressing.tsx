import { useEffect } from 'react'
import { CATALOG } from '../props/PropCatalog'
import { SmashableProp } from '../props/SmashableProp'
import { useGame } from '../state/store'

interface Placement {
  prop: keyof typeof CATALOG
  pos: [number, number, number]
  rotY?: number
}

// Every prop is base-origined and height-normalized, so y is exactly the
// surface it stands on (+ε): floor 0.01 · crate top 0.57 · 2-stack 1.13 · desk 0.82.
const FLOOR = 0.01
const CRATE = 0.57
const CRATE2 = 1.13
const DESK = 0.82

/** 16x16 garage, packed. Player spawns at z=5 facing -z; a small spawn pocket
 * stays clear, everything else is a target. EVERYTHING here breaks. */
const LAYOUT: Placement[] = [
  // ---- hero station: desk + TV + glass ----
  { prop: 'desk', pos: [-3.2, 0, -6.2] },
  { prop: 'tv', pos: [-3.2, DESK, -6.35], rotY: 0.12 },
  { prop: 'vase', pos: [-2.2, DESK, -6.4] },
  { prop: 'bottle_champagne', pos: [-4.15, DESK, -6.45] },
  { prop: 'bottle_alsace', pos: [-4.4, DESK, -6.15], rotY: 0.6 },

  // ---- second desk station (east) ----
  { prop: 'desk', pos: [5.9, 0, -1.5], rotY: Math.PI / 2 },
  { prop: 'bottle_bordeaux', pos: [5.95, DESK, -2.1] },
  { prop: 'bottle_burgundy', pos: [5.8, DESK, -1.5], rotY: 1.1 },
  { prop: 'vase', pos: [5.95, DESK, -0.85], rotY: 0.4 },

  // ---- shelf wall ----
  { prop: 'shelves', pos: [1.8, 0, -7.25] },
  { prop: 'shelves', pos: [4.35, 0, -7.25] },
  { prop: 'shelves', pos: [-6.95, 0, -3.5], rotY: Math.PI / 2 },

  // ---- crate corner with the second TV ----
  { prop: 'crate', pos: [4.9, FLOOR, -4.6], rotY: 0.2 },
  { prop: 'crate', pos: [4.9, CRATE, -4.55], rotY: -0.15 },
  { prop: 'tv', pos: [4.9, CRATE2, -4.55], rotY: -0.5 },
  { prop: 'crate', pos: [5.75, FLOOR, -3.85], rotY: 0.5 },
  { prop: 'bottle_alsace', pos: [5.75, CRATE, -3.85], rotY: 0.9 },
  { prop: 'crate', pos: [4.05, FLOOR, -3.95], rotY: 1.1 },
  { prop: 'vase', pos: [4.05, CRATE, -3.95] },

  // ---- west crate stack ----
  { prop: 'crate', pos: [-5.6, FLOOR, -5.55], rotY: 0.7 },
  { prop: 'crate', pos: [-5.6, CRATE, -5.5], rotY: 0.4 },
  { prop: 'bottle_champagne', pos: [-5.7, CRATE2, -5.55] },
  { prop: 'crate', pos: [-4.65, FLOOR, -6.05], rotY: 1.3 },
  { prop: 'bottle_burgundy', pos: [-4.65, CRATE, -6.05] },

  // ---- floor bottle rows ----
  { prop: 'bottle_bordeaux', pos: [-7.15, FLOOR, -2.4] },
  { prop: 'bottle_burgundy', pos: [-7.1, FLOOR, -1.85], rotY: 0.5 },
  { prop: 'bottle_champagne', pos: [-7.15, FLOOR, -1.3], rotY: 1.2 },
  { prop: 'bottle_alsace', pos: [-7.05, FLOOR, -0.75], rotY: 2.1 },
  { prop: 'bottle_bordeaux', pos: [0.55, FLOOR, -6.9] },
  { prop: 'bottle_champagne', pos: [1.0, FLOOR, -6.7], rotY: 0.8 },
  { prop: 'bottle_burgundy', pos: [2.95, FLOOR, -6.85], rotY: 1.6 },
  { prop: 'bottle_bordeaux', pos: [3.4, FLOOR, -6.6], rotY: 2.3 },

  // ---- ceramics scatter ----
  { prop: 'vase', pos: [-5.15, FLOOR, -4.35] },
  { prop: 'vase', pos: [-4.45, FLOOR, -3.75], rotY: 1.2 },
  { prop: 'vase', pos: [0.35, FLOOR, -5.85], rotY: 2.2 },
  { prop: 'vase', pos: [2.85, FLOOR, 1.2], rotY: 0.7 },
  { prop: 'vase', pos: [-1.9, FLOOR, -4.6], rotY: 1.8 },

  // ---- furniture fodder ----
  { prop: 'chair', pos: [1.7, FLOOR, -4.2], rotY: 2.6 },
  { prop: 'chair', pos: [-3.9, FLOOR, -3.3], rotY: -0.7 },
  { prop: 'chair', pos: [6.3, FLOOR, -6.3], rotY: -2.2 },
  { prop: 'chair', pos: [-2.2, FLOOR, 2.3], rotY: 2.9 },

  // ---- cardboard mountain + scatter ----
  { prop: 'cardboard', pos: [-0.95, FLOOR, -2.9], rotY: 0.4 },
  { prop: 'cardboard', pos: [-0.05, FLOOR, -3.2], rotY: -0.3 },
  { prop: 'cardboard', pos: [-0.5, 0.57, -3.05], rotY: 1.1 },
  { prop: 'cardboard', pos: [0.9, FLOOR, -2.55], rotY: 0.9 },
  { prop: 'cardboard', pos: [-3.35, FLOOR, -1.2], rotY: 1.9 },
  { prop: 'cardboard', pos: [6.75, FLOOR, -4.9], rotY: 0.3 },
  { prop: 'cardboard', pos: [-4.45, FLOOR, -7.0], rotY: 2.4 },
  { prop: 'cardboard', pos: [2.2, FLOOR, -5.95], rotY: 1.5 },
  { prop: 'cardboard', pos: [5.85, FLOOR, 2.9], rotY: 0.6 },
  { prop: 'cardboard', pos: [5.85, 0.57, 2.85], rotY: 2.0 },
  { prop: 'cardboard', pos: [-6.35, FLOOR, 1.4], rotY: 1.3 },

  // ---- heavy metal + rubber ----
  { prop: 'barrel', pos: [6.9, FLOOR, -6.9] },
  { prop: 'barrel', pos: [-6.9, FLOOR, -6.9], rotY: 1.7 },
  { prop: 'barrel', pos: [7.0, FLOOR, 1.8], rotY: 0.8 },
  { prop: 'barrel', pos: [-6.6, FLOOR, 2.6], rotY: 2.5 },
  { prop: 'tyre', pos: [-7.0, FLOOR, -0.15] },
  { prop: 'tyre', pos: [-6.45, FLOOR, 0.5], rotY: 1.3 },
  { prop: 'tyre', pos: [7.05, FLOOR, 3.4], rotY: 0.4 },
  { prop: 'tyre', pos: [2.05, FLOOR, 3.8], rotY: 2.1 },
]

export function Dressing() {
  const roomKey = useGame((s) => s.roomKey)
  const setTotalMass = useGame((s) => s.setTotalMass)

  useEffect(() => {
    const total = LAYOUT.reduce((sum, p) => {
      const def = CATALOG[p.prop]
      return sum + (Number.isFinite(def.breakSpeed) ? def.mass : 0)
    }, 0)
    setTotalMass(total)
  }, [setTotalMass, roomKey])

  return (
    <>
      {LAYOUT.map((p, i) => (
        <SmashableProp key={`${roomKey}:${i}`} def={CATALOG[p.prop]} position={p.pos} rotationY={p.rotY} />
      ))}
    </>
  )
}
