import * as THREE from 'three'
import type { MaterialClass } from '../audio/sfx'

/** Per-material debris identity: small-shard geometry kits, big structural
 * "wreck" pieces (planks/panels/arcs/chunks), one shared material, and the
 * physics character of the rubble. Built lazily, cached for the session. */

export type WreckStyle = 'planks' | 'panels' | 'arcs' | 'chunks'

export interface DebrisPhysics {
  restitution: number
  linearDamping: number
  angularDamping: number
  gravityScale: number
}

interface Kit {
  geos: THREE.BufferGeometry[]
  mat: THREE.Material
}

const kits = new Map<MaterialClass, Kit>()
const wrecks = new Map<WreckStyle, THREE.BufferGeometry[]>()

function jagged(sx: number, sy: number, sz: number, roughness: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(sx, sy, sz, 2, 1, 2).toNonIndexed()
  const pos = geo.attributes.position
  const amp = Math.min(sx, sy, sz) * roughness + Math.max(sx, sz) * 0.06
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + (Math.random() - 0.5) * amp,
      pos.getY(i) + (Math.random() - 0.5) * amp,
      pos.getZ(i) + (Math.random() - 0.5) * amp,
    )
  }
  geo.computeVertexNormals()
  return geo
}

interface Profile {
  dims: [number, number, number]
  jitter: number
  make: () => THREE.Material
  phys: DebrisPhysics
}

const CLANGY: DebrisPhysics = { restitution: 0.3, linearDamping: 0.08, angularDamping: 0.35, gravityScale: 1.4 }
const BRITTLE: DebrisPhysics = { restitution: 0.12, linearDamping: 0.18, angularDamping: 0.7, gravityScale: 1.5 }

const PROFILES: Record<MaterialClass, Profile> = {
  glass: {
    dims: [1, 0.06, 0.7],
    jitter: 0.5,
    make: () =>
      new THREE.MeshPhysicalMaterial({
        color: '#7fae8f',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 1.6,
      }),
    phys: { restitution: 0.15, linearDamping: 0.1, angularDamping: 0.6, gravityScale: 1.5 },
  },
  wood: {
    dims: [1.5, 0.16, 0.2],
    jitter: 0.7,
    make: () => new THREE.MeshStandardMaterial({ color: '#77552f', roughness: 0.85 }),
    phys: { restitution: 0.25, linearDamping: 0.12, angularDamping: 0.5, gravityScale: 1.5 },
  },
  metal: {
    dims: [0.9, 0.08, 0.6],
    jitter: 0.4,
    make: () => new THREE.MeshStandardMaterial({ color: '#8f959c', roughness: 0.45, metalness: 0.85 }),
    phys: CLANGY,
  },
  ceramic: {
    dims: [0.8, 0.45, 0.65],
    jitter: 0.6,
    make: () => new THREE.MeshStandardMaterial({ color: '#d8cfc2', roughness: 0.55 }),
    phys: BRITTLE,
  },
  plastic: {
    dims: [0.75, 0.4, 0.6],
    jitter: 0.5,
    make: () => new THREE.MeshStandardMaterial({ color: '#e6e6e2', roughness: 0.6 }),
    phys: { restitution: 0.35, linearDamping: 0.15, angularDamping: 0.5, gravityScale: 1.35 },
  },
  cardboard: {
    dims: [1, 0.06, 0.8],
    jitter: 0.45,
    make: () => new THREE.MeshStandardMaterial({ color: '#b08d57', roughness: 0.95 }),
    // dead flop — cardboard never bounces or slides
    phys: { restitution: 0.02, linearDamping: 1.6, angularDamping: 2.2, gravityScale: 1.25 },
  },
  rubber: {
    dims: [0.9, 0.18, 0.3],
    jitter: 0.35,
    make: () => new THREE.MeshStandardMaterial({ color: '#22252a', roughness: 0.92 }),
    // lively first bounce, then dies quickly
    phys: { restitution: 0.55, linearDamping: 0.4, angularDamping: 1.1, gravityScale: 1.4 },
  },
  generic: {
    dims: [0.7, 0.5, 0.6],
    jitter: 0.55,
    make: () => new THREE.MeshStandardMaterial({ color: '#9c8f82', roughness: 0.8 }),
    phys: BRITTLE,
  },
}

export function getKit(material: MaterialClass): Kit {
  let kit = kits.get(material)
  if (!kit) {
    const p = PROFILES[material]
    kit = {
      geos: Array.from({ length: 5 }, () => jagged(...p.dims, p.jitter)),
      mat: p.make(),
    }
    kits.set(material, kit)
  }
  return kit
}

export function getPhysics(material: MaterialClass): DebrisPhysics {
  return PROFILES[material].phys
}

/** Volume (m³) of one small shard at scale 1 — used to solve debris scales so
 * total rubble volume ≈ the smashed prop's volume (conservation of mass). */
export function smallUnitVolume(material: MaterialClass): number {
  const [x, y, z] = PROFILES[material].dims
  return x * y * z
}

/** Approx volume (m³) of one wreck piece at scale 1, by style. */
export function wreckUnitVolume(style: WreckStyle): number {
  switch (style) {
    case 'planks':
      return 0.7 * 0.055 * 0.09
    case 'panels':
      return 0.5 * 0.03 * 0.36
    case 'arcs':
      return 1.65 * 0.38 * Math.PI * 0.07 * 0.07 // arc·R·π·tube²
    case 'chunks':
      return 0.34 * 0.26 * 0.3
    default: {
      const exhaustive: never = style
      throw new Error(`Unhandled wreck style: ${exhaustive as string}`)
    }
  }
}

/** Big structural pieces, unit-sized (scale by prop size at spawn):
 * planks — long beams (shelf frames, crate slats) · panels — flat sheets (desk
 * tops, plastic shells, cardboard faces) · arcs — curved segments (tyre strips,
 * drum plates) · chunks — big jagged lumps (ceramic, generic). */
export function getWreckGeos(style: WreckStyle): THREE.BufferGeometry[] {
  let geos = wrecks.get(style)
  if (geos) return geos
  switch (style) {
    case 'planks':
      geos = Array.from({ length: 4 }, () => jagged(0.55 + Math.random() * 0.3, 0.055, 0.09, 0.25))
      break
    case 'panels':
      geos = Array.from({ length: 4 }, () => jagged(0.42 + Math.random() * 0.18, 0.03, 0.3 + Math.random() * 0.12, 0.3))
      break
    case 'arcs':
      geos = Array.from({ length: 4 }, () => {
        const g = new THREE.TorusGeometry(0.38, 0.07, 6, 9, 1.1 + Math.random() * 1.1)
        g.rotateZ(Math.random() * Math.PI * 2)
        return g
      })
      break
    case 'chunks':
      geos = Array.from({ length: 4 }, () => jagged(0.34, 0.26, 0.3, 0.6))
      break
    default: {
      const exhaustive: never = style
      throw new Error(`Unhandled wreck style: ${exhaustive as string}`)
    }
  }
  wrecks.set(style, geos)
  return geos
}
