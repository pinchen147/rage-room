import { useEffect } from 'react'
import { CATALOG } from '../props/PropCatalog'
import { SmashableProp } from '../props/SmashableProp'
import { useGame } from '../state/store'

interface Placement {
  prop: keyof typeof CATALOG
  pos: [number, number, number]
  rotY?: number
}

/** The garage layout. Player spawns at z=5 facing -z; content lives in the back
 * half. Items drop a few cm onto surfaces and settle during the ready window. */
const LAYOUT: Placement[] = [
  // anchors
  { prop: 'desk', pos: [-3.5, 0, -9.3] },
  { prop: 'shelves', pos: [4.2, 0, -11.05] },
  { prop: 'shelves', pos: [6.9, 0, -11.05], rotY: 0 },

  // the hero station
  { prop: 'tv', pos: [-3.5, 0.95, -9.15], rotY: 0.12 },
  { prop: 'vase', pos: [-2.4, 0.95, -9.4] },
  { prop: 'bottle_champagne', pos: [-4.5, 0.95, -9.45] },

  // crate corner with bottle targets
  { prop: 'crate', pos: [5.6, 0.03, -7.2], rotY: 0.2 },
  { prop: 'crate', pos: [5.6, 0.58, -7.15], rotY: -0.15 },
  { prop: 'crate', pos: [6.65, 0.03, -6.3], rotY: 0.5 },
  { prop: 'bottle_bordeaux', pos: [5.45, 1.16, -7.2] },
  { prop: 'bottle_alsace', pos: [5.8, 1.16, -7.05] },
  { prop: 'bottle_burgundy', pos: [6.65, 0.61, -6.3] },

  // floor bottle row along the west wall
  { prop: 'bottle_bordeaux', pos: [-10.5, 0.03, -3.4] },
  { prop: 'bottle_burgundy', pos: [-10.5, 0.03, -2.6] },
  { prop: 'bottle_champagne', pos: [-10.5, 0.03, -1.8] },

  // ceramics
  { prop: 'vase', pos: [-7.6, 0.03, -8.6] },
  { prop: 'vase', pos: [-6.9, 0.03, -7.85], rotY: 1.2 },

  // furniture fodder
  { prop: 'chair', pos: [2.4, 0.03, -6.2], rotY: 2.6 },
  { prop: 'chair', pos: [-5.8, 0.03, -5.2], rotY: -0.7 },

  // cardboard cluster
  { prop: 'cardboard', pos: [-0.8, 0.03, -4.6], rotY: 0.4 },
  { prop: 'cardboard', pos: [0.15, 0.03, -4.95], rotY: -0.3 },
  { prop: 'cardboard', pos: [-0.35, 0.52, -4.75], rotY: 1.1 },
  { prop: 'cardboard', pos: [1.25, 0.03, -4.15], rotY: 0.9 },

  // physics toys
  { prop: 'barrel', pos: [9.6, 0.03, -9.6] },
  { prop: 'barrel', pos: [10.1, 0.03, -4.2], rotY: 0.8 },
  { prop: 'tyre', pos: [-9.6, 0.03, -2.2] },
  { prop: 'tyre', pos: [-8.9, 0.03, -1.6], rotY: 1.3 },
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
