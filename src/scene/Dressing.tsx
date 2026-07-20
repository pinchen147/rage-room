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
// surface it stands on (+ε): floor 0.01 · crate 0.46 · 2-stack 0.91 · desk 0.76.
const FLOOR = 0.01
const CRATE = 0.46
const CRATE2 = 0.91
const DESK = 0.76

/** The garage layout. Player spawns at z=5 facing -z; the center lane stays
 * open for dashing. ~45 props: two stations, shelf wall, clusters, toys. */
const LAYOUT: Placement[] = [
  // ---- anchors ----
  { prop: 'desk', pos: [-3.5, 0, -9.3] },
  { prop: 'desk', pos: [9.8, 0, -2.5], rotY: Math.PI / 2 },
  { prop: 'shelves', pos: [3.4, 0, -11.2] },
  { prop: 'shelves', pos: [6.2, 0, -11.2] },
  { prop: 'shelves', pos: [-11.3, 0, -6.5], rotY: Math.PI / 2 },

  // ---- hero station: TV + glass on the main desk ----
  { prop: 'tv', pos: [-3.5, DESK, -9.5], rotY: 0.12 },
  { prop: 'vase', pos: [-2.45, DESK, -9.55] },
  { prop: 'bottle_champagne', pos: [-4.55, DESK, -9.6] },
  { prop: 'bottle_alsace', pos: [-4.85, DESK, -9.35], rotY: 0.6 },

  // ---- second station: east desk ----
  { prop: 'bottle_bordeaux', pos: [9.85, DESK, -3.1] },
  { prop: 'bottle_burgundy', pos: [9.75, DESK, -2.55], rotY: 1.1 },
  { prop: 'vase', pos: [9.9, DESK, -1.9], rotY: 0.4 },

  // ---- crate corner with the second TV ----
  { prop: 'crate', pos: [5.6, FLOOR, -7.2], rotY: 0.2 },
  { prop: 'crate', pos: [5.6, CRATE, -7.15], rotY: -0.15 },
  { prop: 'tv', pos: [5.6, CRATE2, -7.15], rotY: -0.35 },
  { prop: 'crate', pos: [6.7, FLOOR, -6.3], rotY: 0.5 },
  { prop: 'bottle_bordeaux', pos: [6.6, CRATE, -6.35] },
  { prop: 'bottle_alsace', pos: [6.85, CRATE, -6.15], rotY: 0.9 },
  { prop: 'crate', pos: [4.5, FLOOR, -6.6], rotY: 1.1 },
  { prop: 'vase', pos: [4.5, CRATE, -6.6] },

  // ---- west crate stack ----
  { prop: 'crate', pos: [-8.2, FLOOR, -8.7], rotY: 0.7 },
  { prop: 'crate', pos: [-8.2, CRATE, -8.65], rotY: 0.4 },
  { prop: 'bottle_champagne', pos: [-8.3, CRATE2, -8.7] },
  { prop: 'crate', pos: [-7.1, FLOOR, -9.2], rotY: 1.3 },
  { prop: 'bottle_burgundy', pos: [-7.1, CRATE, -9.2] },

  // ---- floor bottle rows ----
  { prop: 'bottle_bordeaux', pos: [-10.6, FLOOR, -3.4] },
  { prop: 'bottle_burgundy', pos: [-10.55, FLOOR, -2.6], rotY: 0.5 },
  { prop: 'bottle_champagne', pos: [-10.6, FLOOR, -1.8], rotY: 1.2 },
  { prop: 'bottle_alsace', pos: [-10.5, FLOOR, -1.0], rotY: 2.1 },
  { prop: 'bottle_bordeaux', pos: [1.9, FLOOR, -10.6] },
  { prop: 'bottle_champagne', pos: [1.45, FLOOR, -10.4], rotY: 0.8 },

  // ---- ceramics scatter ----
  { prop: 'vase', pos: [-7.6, FLOOR, -7.4] },
  { prop: 'vase', pos: [-6.85, FLOOR, -6.7], rotY: 1.2 },
  { prop: 'vase', pos: [0.6, FLOOR, -8.9], rotY: 2.2 },

  // ---- furniture fodder ----
  { prop: 'chair', pos: [2.4, FLOOR, -6.2], rotY: 2.6 },
  { prop: 'chair', pos: [-5.8, FLOOR, -5.2], rotY: -0.7 },
  { prop: 'chair', pos: [0.4, FLOOR, -7.4], rotY: 1.8 },
  { prop: 'chair', pos: [8.2, FLOOR, -8.4], rotY: -2.2 },

  // ---- cardboard mountain + scatter ----
  { prop: 'cardboard', pos: [-1.1, FLOOR, -4.7], rotY: 0.4 },
  { prop: 'cardboard', pos: [-0.15, FLOOR, -5.05], rotY: -0.3 },
  { prop: 'cardboard', pos: [-0.6, 0.44, -4.85], rotY: 1.1 },
  { prop: 'cardboard', pos: [1.05, FLOOR, -4.25], rotY: 0.9 },
  { prop: 'cardboard', pos: [-4.6, FLOOR, -3.3], rotY: 1.9 },
  { prop: 'cardboard', pos: [7.9, FLOOR, -5.1], rotY: 0.3 },
  { prop: 'cardboard', pos: [-6.4, FLOOR, -10.4], rotY: 2.4 },
  { prop: 'cardboard', pos: [3.1, FLOOR, -9.0], rotY: 1.5 },

  // ---- physics toys ----
  { prop: 'barrel', pos: [10.2, FLOOR, -9.8] },
  { prop: 'barrel', pos: [9.5, FLOOR, -6.1], rotY: 0.8 },
  { prop: 'barrel', pos: [-10.2, FLOOR, -9.9], rotY: 1.7 },
  { prop: 'tyre', pos: [-9.6, FLOOR, -2.2] },
  { prop: 'tyre', pos: [-8.9, FLOOR, -1.55], rotY: 1.3 },
  { prop: 'tyre', pos: [10.4, FLOOR, -0.6], rotY: 0.4 },
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
