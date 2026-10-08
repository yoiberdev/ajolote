import * as THREE from 'three'

// Puntero normalizado (-1..1) que comparten la cámara, el enfoque y el ajolote.
export const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, lastMove: -Infinity }

// Posición de la boca del ajolote en el mundo; las burbujas salen de aquí.
export const mouth = new THREE.Vector3()

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.targetX = (e.clientX / window.innerWidth) * 2 - 1
      pointer.targetY = 1 - (e.clientY / window.innerHeight) * 2
      pointer.lastMove = performance.now()
    },
    { passive: true },
  )
}
