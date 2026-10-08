<script module>
  export const CAMERA = { position: [0, 0.25, 3.3], fov: 35, near: 0.05, far: 60 }
</script>

<script>
  import { T, useTask } from '@threlte/core'
  import { clock } from '../lib/shared'
  import { generateWorld } from '../world/cave'
  import { waterUniforms } from '../world/materials'
  import { worldMeshes } from '../world/meshes'
  import Axolotl from './Axolotl.svelte'
  import Fish from './Fish.svelte'
  import Shafts from './Shafts.svelte'
  import Bubbles from './Bubbles.svelte'
  import MarineSnow from './MarineSnow.svelte'
  import Rig from './Rig.svelte'
  import Effects from './Effects.svelte'

  const WATER = '#13566a'

  // Peces tropicales nadando en óvalos por el fondo de la cueva.
  const SCHOOL = [
    { colors: ['#ff8a1f', '#ffffff'], center: [1.5, 0.9, -5.5], radius: [3.2, 1.8], speed: 0.32, phase: 0 },
    { colors: ['#3aa0ff', '#ffe14a'], center: [1.9, 1.15, -5.8], radius: [3.0, 1.6], speed: 0.32, phase: 0.35 },
    { colors: ['#ff4d6d', '#ffd0d8'], center: [-3, 1.6, -8], radius: [4, 2.2], speed: -0.24, phase: 2 },
    { colors: ['#ffe14a', '#2b2b2b'], center: [-2.5, 0.5, -4], radius: [2.2, 1.2], speed: 0.4, phase: 4 },
    { colors: ['#7cff8a', '#2a7fff'], center: [4, 2.2, -10], radius: [3.5, 2], speed: -0.28, phase: 1 },
  ]

  const world = generateWorld()
  const meshes = worldMeshes(world)

  // La primera tarea del fotograma: el reloj que leen las demás.
  useTask((delta) => {
    clock.elapsed += delta
    waterUniforms.uTime.value += Math.min(delta, 0.1)
  })
</script>

<T.PerspectiveCamera makeDefault position={CAMERA.position} fov={CAMERA.fov} near={CAMERA.near} far={CAMERA.far} />

<T.Color attach="background" args={[WATER]} />
<T.FogExp2 attach="fog" args={[WATER, 0.07]} />
<T.HemisphereLight args={['#9fe6f0', '#4f7f86', 1]} />
<T.DirectionalLight
  position={[1.5, 10, 8]}
  intensity={1.25}
  color="#dcf7ff"
  castShadow
  shadow.mapSize={[2048, 2048]}
  shadow.camera.left={-11}
  shadow.camera.right={11}
  shadow.camera.top={11}
  shadow.camera.bottom={-11}
  shadow.camera.far={40}
  shadow.bias={-0.0004}
  shadow.normalBias={0.03}
/>
{#each world.lights as light}
  <T.PointLight position={light.pos} color={light.color} intensity={light.intensity} distance={light.distance} decay={1.5} />
{/each}

{#each meshes as mesh}
  <T is={mesh} />
{/each}
<Axolotl />
{#each SCHOOL as fish}
  <Fish {...fish} />
{/each}
<Shafts holes={world.holes} />
<Bubbles sources={world.magma} />
<MarineSnow count={600} box={[16, 8]} depth={[-12, 2.5]} offset={[0, 1]} size={0.014} />
<Rig />
<Effects />
