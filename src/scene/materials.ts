import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export interface PbrSet {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
  metalnessMap?: THREE.Texture
}

/** Load a Poly Haven PBR set (diff/nor_gl/rough[/metal]) with tiling configured. */
export function usePbrSet(base: string, repeat: [number, number], metal = false): PbrSet {
  const paths = [`${base}/diff_1k.jpg`, `${base}/nor_gl_1k.jpg`, `${base}/rough_1k.jpg`]
  if (metal) paths.push(`${base}/metal_1k.jpg`)
  const textures = useTexture(paths)

  return useMemo(() => {
    const [map, normalMap, roughnessMap, metalnessMap] = textures
    map.colorSpace = THREE.SRGBColorSpace
    for (const t of textures) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(repeat[0], repeat[1])
      t.anisotropy = 8
      t.needsUpdate = true
    }
    return { map, normalMap, roughnessMap, metalnessMap }
  }, [textures, repeat[0], repeat[1]])
}
