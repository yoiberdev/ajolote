import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { Scene } from './scene/Scene'
import { CAM_Z, FOV } from './scene/layout'
import { CAMERA, MinecraftScene } from './minecraft/MinecraftScene'
import { AXOLOTL_VARIANTS } from './minecraft/textures'
import { useStore } from './store'

// Dos versiones de la escena: bloques (por defecto) y realista (?estilo=realista).
const realistic = new URLSearchParams(window.location.search).get('estilo') === 'realista'

export default function App() {
  const { active, progress } = useProgress()
  const ready = realistic ? !active && progress === 100 : true

  return (
    <div className={realistic ? 'realistic' : 'blocks'}>
      <div className={`stage${ready ? ' ready' : ''}`}>
        {realistic ? (
          <Canvas flat dpr={[1, 2]} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 80 }}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        ) : (
          <Canvas flat shadows dpr={[1, 1.75]} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={CAMERA}>
            <MinecraftScene />
          </Canvas>
        )}
      </div>

      <div className="overlay">
        <header>
          <h1 className="logo">AJOLOTE</h1>
          <p className="species">Ambystoma mexicanum</p>
          {!realistic && <VariantLabel />}
        </header>
        <footer>
          {realistic ? (
            <span>
              Xochimilco, México · <a href="?">Ver versión en bloques</a>
            </span>
          ) : (
            <a className="firma" href="https://yoiber.com">
              Yoiber
            </a>
          )}
          <span className="hint">Mueve el cursor para cambiar el enfoque · Haz clic en el ajolote</span>
        </footer>
      </div>

      {realistic && (
        <div className={`loader${ready ? ' hidden' : ''}`} aria-hidden={ready}>
          Sumergiendo… {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

function VariantLabel() {
  const shown = useStore((s) => s.shown)
  const { label, skin } = AXOLOTL_VARIANTS[shown]
  return (
    <p key={shown} className="variant" aria-live="polite">
      <span className="dot" style={{ background: skin[0] }} />
      Ajolote {label}
      {shown === 'azul' && <strong> · ¡el más raro!</strong>}
    </p>
  )
}
