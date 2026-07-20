import type { MaterialClass } from '../audio/sfx'
import type { WreckStyle } from '../systems/shardKits'

/** One debris stream of a break (multi-material props spawn several). */
export interface DebrisPart {
  material: MaterialClass
  wreck: WreckStyle
  count: number
  heroes: number
}

export interface PropDef {
  id: string
  file: string
  /** Render just this named gltf node instead of the whole scene (multi-object files). */
  node?: string
  material: MaterialClass
  mass: number
  /** Relative impact speed (m/s) that shatters it. EVERYTHING breaks. */
  breakSpeed: number
  collider: 'cuboid' | 'hull'
  /** Real-world height in metres — the model is measured and normalized to this
   * at load (source GLTFs use inconsistent units; the shelves are 21m raw). */
  targetHeight: number
  restitution?: number
  shardCount: number
  heroes: number
  /** Small fodder skips the shadow depth pass (AO grounds it) — default true. */
  castShadow?: boolean
  /** Big structural piece style (shelf beams vs desk panels vs tyre strips). */
  wreck: WreckStyle
  /** Multi-material breakup (e.g. TV = glass screen + plastic shell). */
  debrisMix?: DebrisPart[]
}

const M = '/assets/models'

export const CATALOG: Record<string, PropDef> = {
  tv: {
    id: 'tv',
    file: `${M}/Television_01/Television_01_1k.gltf`,
    material: 'glass',
    mass: 14,
    breakSpeed: 7,
    collider: 'cuboid',
    targetHeight: 0.8,
    shardCount: 16,
    heroes: 3,
    wreck: 'panels',
    debrisMix: [
      { material: 'glass', wreck: 'chunks', count: 10, heroes: 0 },
      { material: 'plastic', wreck: 'panels', count: 6, heroes: 3 },
    ],
  },
  bottle_bordeaux: bottle('bordeaux'),
  bottle_alsace: bottle('alsace'),
  bottle_burgundy: bottle('burgundy'),
  bottle_champagne: bottle('champagne'),
  vase: {
    id: 'vase',
    file: `${M}/ceramic_vase_01/ceramic_vase_01_1k.gltf`,
    material: 'ceramic',
    mass: 2,
    breakSpeed: 5.5,
    collider: 'cuboid',
    targetHeight: 0.6,
    castShadow: false,
    shardCount: 10,
    heroes: 1,
    wreck: 'chunks',
  },
  chair: {
    id: 'chair',
    file: `${M}/plastic_monobloc_chair_01/plastic_monobloc_chair_01_1k.gltf`,
    material: 'plastic',
    mass: 5,
    breakSpeed: 8,
    collider: 'cuboid',
    targetHeight: 1.0,
    shardCount: 11,
    heroes: 2,
    wreck: 'panels',
  },
  cardboard: {
    id: 'cardboard',
    file: `${M}/cardboard_box_01/cardboard_box_01_1k.gltf`,
    material: 'cardboard',
    mass: 2,
    breakSpeed: 6,
    collider: 'cuboid',
    targetHeight: 0.62,
    castShadow: false,
    shardCount: 8,
    heroes: 2,
    wreck: 'panels',
  },
  crate: {
    id: 'crate',
    file: `${M}/wooden_crate_01/wooden_crate_01_1k.gltf`,
    material: 'wood',
    mass: 7,
    breakSpeed: 7.5,
    collider: 'cuboid',
    targetHeight: 0.55,
    shardCount: 11,
    heroes: 3,
    wreck: 'planks',
  },
  barrel: {
    id: 'barrel',
    file: `${M}/barrel_03/barrel_03_1k.gltf`,
    material: 'metal',
    mass: 22,
    breakSpeed: 9,
    collider: 'cuboid',
    targetHeight: 1.1,
    restitution: 0.35,
    shardCount: 10,
    heroes: 3,
    wreck: 'arcs',
  },
  tyre: {
    id: 'tyre',
    file: `${M}/old_tyre/old_tyre_1k.gltf`,
    material: 'rubber',
    mass: 11,
    breakSpeed: 9,
    collider: 'cuboid',
    targetHeight: 0.75,
    restitution: 0.75,
    shardCount: 4,
    heroes: 5,
    wreck: 'arcs',
  },
  desk: {
    id: 'desk',
    file: `${M}/metal_office_desk/metal_office_desk_1k.gltf`,
    material: 'metal',
    mass: 30,
    breakSpeed: 9,
    collider: 'cuboid',
    targetHeight: 0.85,
    shardCount: 12,
    heroes: 4,
    wreck: 'panels',
  },
  shelves: {
    id: 'shelves',
    file: `${M}/steel_frame_shelves_01/steel_frame_shelves_01_1k.gltf`,
    material: 'metal',
    mass: 35,
    breakSpeed: 10,
    collider: 'cuboid',
    targetHeight: 2.3,
    shardCount: 12,
    heroes: 5,
    wreck: 'planks',
  },
}

function bottle(name: string): PropDef {
  return {
    id: `bottle_${name}`,
    file: `${M}/wine_bottles_01/wine_bottles_01_1k.gltf`,
    node: `wine_bottles_01_${name}`,
    material: 'glass',
    mass: 1,
    breakSpeed: 5,
    collider: 'cuboid',
    targetHeight: 0.42,
    castShadow: false,
    shardCount: 8,
    heroes: 0,
    wreck: 'chunks',
  }
}

export const GLTF_FILES: string[] = [...new Set(Object.values(CATALOG).map((p) => p.file))]
