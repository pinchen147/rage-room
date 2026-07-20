import { useGLTF } from '@react-three/drei'
import { GLTF_FILES } from '../props/PropCatalog'

// Kick off model fetches at module load so the start screen doubles as a preloader.
for (const file of GLTF_FILES) useGLTF.preload(file)
