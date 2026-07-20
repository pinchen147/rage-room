import type { MaterialClass } from '../audio/sfx'

export interface PropDef {
  id: string
  file: string
  /** Render just this named gltf node instead of the whole scene (multi-object files). */
  node?: string
  material: MaterialClass
  mass: number
  /** Relative impact speed (m/s) that shatters it. Infinity = unbreakable. */
  breakSpeed: number
  collider: 'cuboid' | 'hull'
  /** Physics body type: breakables + toys are dynamic, anchors are fixed. */
  fixed?: boolean
  scale?: number
  restitution?: number
  shardCount: number
  heroes: number
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
    scale: 1.35,
    shardCount: 16,
    heroes: 3,
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
    collider: 'hull',
    scale: 1.15,
    shardCount: 10,
    heroes: 1,
  },
  chair: {
    id: 'chair',
    file: `${M}/plastic_monobloc_chair_01/plastic_monobloc_chair_01_1k.gltf`,
    material: 'plastic',
    mass: 5,
    breakSpeed: 8,
    collider: 'hull',
    shardCount: 11,
    heroes: 2,
  },
  cardboard: {
    id: 'cardboard',
    file: `${M}/cardboard_box_01/cardboard_box_01_1k.gltf`,
    material: 'cardboard',
    mass: 2,
    breakSpeed: 6,
    collider: 'cuboid',
    shardCount: 9,
    heroes: 1,
  },
  crate: {
    id: 'crate',
    file: `${M}/wooden_crate_01/wooden_crate_01_1k.gltf`,
    material: 'wood',
    mass: 7,
    breakSpeed: 7.5,
    collider: 'cuboid',
    shardCount: 13,
    heroes: 2,
  },
  barrel: {
    id: 'barrel',
    file: `${M}/barrel_03/barrel_03_1k.gltf`,
    material: 'metal',
    mass: 22,
    breakSpeed: Infinity,
    collider: 'hull',
    restitution: 0.35,
    shardCount: 0,
    heroes: 0,
  },
  tyre: {
    id: 'tyre',
    file: `${M}/old_tyre/old_tyre_1k.gltf`,
    material: 'generic',
    mass: 11,
    breakSpeed: Infinity,
    collider: 'hull',
    restitution: 0.75,
    shardCount: 0,
    heroes: 0,
  },
  desk: {
    id: 'desk',
    file: `${M}/metal_office_desk/metal_office_desk_1k.gltf`,
    material: 'metal',
    mass: 0,
    breakSpeed: Infinity,
    collider: 'cuboid',
    fixed: true,
    shardCount: 0,
    heroes: 0,
  },
  shelves: {
    id: 'shelves',
    file: `${M}/steel_frame_shelves_01/steel_frame_shelves_01_1k.gltf`,
    material: 'metal',
    mass: 0,
    breakSpeed: Infinity,
    collider: 'cuboid',
    fixed: true,
    shardCount: 0,
    heroes: 0,
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
    collider: 'hull',
    shardCount: 8,
    heroes: 0,
  }
}

export const GLTF_FILES: string[] = [...new Set(Object.values(CATALOG).map((p) => p.file))]
