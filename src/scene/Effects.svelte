<script>
  import { HalfFloatType } from 'three'
  import {
    BlendFunction,
    BloomEffect,
    BrightnessContrastEffect,
    DepthOfFieldEffect,
    EffectComposer,
    EffectPass,
    HueSaturationEffect,
    MaskFunction,
    RenderPass,
    VignetteEffect,
  } from 'postprocessing'
  import { useTask, useThrelte } from '@threlte/core'
  import { focus } from '../lib/shared'

  // Posproceso: desenfoque de profundidad, brillo en lo que emite luz y un retoque de color.
  // Va todo en una sola pasada, después de la escena.
  const { renderer, scene, camera, size, autoRender, renderStage } = useThrelte()

  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 })

  const dof = new DepthOfFieldEffect(camera.current, { resolutionScale: 0.5 })
  dof.bokehScale = 5
  dof.cocMaterial.focusDistance = focus.distance
  dof.cocMaterial.focusRange = 2.4
  dof.maskFunction = MaskFunction.MULTIPLY_RGB_SET_ALPHA

  const bloom = new BloomEffect({ luminanceThreshold: 1, luminanceSmoothing: 0.1, mipmapBlur: true, blendFunction: BlendFunction.ADD })
  bloom.intensity = 1.2

  const renderPass = new RenderPass(scene, camera.current)
  const effectPass = new EffectPass(
    camera.current,
    dof,
    bloom,
    new HueSaturationEffect({ saturation: 0.22 }),
    new BrightnessContrastEffect({ brightness: -0.02, contrast: 0.12 }),
    new VignetteEffect({ offset: 0.25, darkness: 0.65 }),
  )
  composer.addPass(renderPass)
  composer.addPass(effectPass)

  // camera.current y size.current son reactivos: se siguen si cambia la cámara o el tamaño.
  $effect(() => {
    renderPass.mainCamera = camera.current
    effectPass.mainCamera = camera.current
  })

  $effect(() => {
    composer.setSize(size.current.width, size.current.height)
  })

  // Threlte deja de dibujar por su cuenta y lo hace el compositor, al final de cada fotograma.
  $effect(() => {
    const before = autoRender.current
    autoRender.set(false)
    return () => autoRender.set(before)
  })

  useTask(
    (delta) => {
      dof.cocMaterial.focusDistance = focus.distance
      composer.render(delta)
    },
    { stage: renderStage, autoInvalidate: false },
  )

  $effect(() => () => composer.dispose())
</script>
