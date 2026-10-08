import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const CAM_Z = 20
export const FOV = 30
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))

// Tamaño visible del encuadre a la profundidad z, con la cámara en reposo.
export function useFrustum() {
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  return useMemo(() => {
    const aspect = width / height
    const at = (z) => {
      const h = 2 * (CAM_Z - z) * TAN
      return { w: h * aspect, h }
    }
    return { aspect, landscape: aspect >= 1, at, pxPerUnit: height / (2 * TAN) }
  }, [width, height])
}

export function prepTextures(input) {
  for (const t of [input].flat()) {
    t.colorSpace = THREE.SRGBColorSpace
    t.premultiplyAlpha = true
    t.anisotropy = 4
    t.needsUpdate = true
  }
}
