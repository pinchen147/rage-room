import * as THREE from 'three'
import type { MaterialClass } from '../audio/sfx'

/** Pre-built jagged shard geometry kits + one shared material per MaterialClass.
 * Built lazily on first use, cached for the session. Unit-ish size; scaled at spawn. */

interface Kit {
  geos: THREE.BufferGeometry[]
  mat: THREE.Material
}

const kits = new Map<MaterialClass, Kit>()

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
}

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
  },
  wood: {
    dims: [1.5, 0.16, 0.2],
    jitter: 0.7,
    make: () => new THREE.MeshStandardMaterial({ color: '#77552f', roughness: 0.85 }),
  },
  metal: {
    dims: [0.9, 0.08, 0.6],
    jitter: 0.4,
    make: () => new THREE.MeshStandardMaterial({ color: '#8f959c', roughness: 0.45, metalness: 0.85 }),
  },
  ceramic: {
    dims: [0.8, 0.45, 0.65],
    jitter: 0.6,
    make: () => new THREE.MeshStandardMaterial({ color: '#d8cfc2', roughness: 0.55 }),
  },
  plastic: {
    dims: [0.75, 0.4, 0.6],
    jitter: 0.5,
    make: () => new THREE.MeshStandardMaterial({ color: '#e6e6e2', roughness: 0.6 }),
  },
  cardboard: {
    dims: [1, 0.06, 0.8],
    jitter: 0.45,
    make: () => new THREE.MeshStandardMaterial({ color: '#b08d57', roughness: 0.95 }),
  },
  generic: {
    dims: [0.7, 0.5, 0.6],
    jitter: 0.55,
    make: () => new THREE.MeshStandardMaterial({ color: '#9c8f82', roughness: 0.8 }),
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
