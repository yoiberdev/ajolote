# Ajolote

Una cueva submarina hecha de bloques que enfoca donde apuntas: el desenfoque de profundidad sigue al
cursor y, si haces clic en el ajolote, da una voltereta y cambia de color.

Hecho con [Svelte 5](https://svelte.dev) y [Threlte](https://threlte.xyz) sobre three.js. Todo está
hecho con código: no hay ni una imagen.

## Arrancar

```bash
npm install
npm run dev
```

`npm run build` genera la versión de producción en `dist/`.

Con el cursor al centro se enfoca el ajolote; arriba a la derecha, el fondo de la cueva; abajo a la
izquierda, las plantas pegadas a la cámara. En pantallas táctiles la cámara se mueve sola. Cada clic
en el ajolote suelta burbujas y saca otro color; el azul sale una vez de cada doce, más o menos.

## Cómo está hecho

La lógica que no depende del framework vive en `src/world/`; Svelte solo monta la escena y la anima.

- `world/textures.js`: texturas pixel-art de 16×16 (arena, grava, arcilla, musgo, piedra, corales, magma,
  kelp, bayas luminosas, el ajolote en sus cinco colores y los peces), pintadas en un canvas.
- `world/cave.js`: genera la cueva con ruido (suelo, paredes y techo con huecos de luz) y reparte la
  decoración. Son 6627 bloques de 16 tipos.
- `world/meshes.js`: una `InstancedMesh` por tipo de bloque o planta, así cada tipo se dibuja de una vez.
- `world/materials.js`: parchea los materiales de three.js para añadir los reflejos del agua y el
  vaivén de las plantas.
- `scene/`: los componentes de Svelte.
  - `Scene.svelte`: luces, niebla y sombras.
  - `Axolotl.svelte`: el ajolote por partes (cuerpo, cabeza, branquias, patas y cola).
  - `Fish.svelte`, `Bubbles.svelte`, `Shafts.svelte` y `MarineSnow.svelte`: los peces, las burbujas,
    los haces de luz y las partículas del agua.
  - `Rig.svelte`: la cámara con parallax y el punto de enfoque.
  - `Effects.svelte`: el posproceso (desenfoque, brillo y color) con `postprocessing`.
- `lib/state.svelte.js`: el color del ajolote, con runas de Svelte. Lo que cambia en cada fotograma
  (el puntero o la boca del ajolote) va en objetos planos en `lib/shared.js`, sin reactividad.

El diseño del ajolote es propio, en estilo bloques; no usa texturas ni marcas de Minecraft.

## Versión anterior

La etiqueta `v1-react` guarda la primera versión, hecha con React Three Fiber, junto con una variante
realista. La de Svelte es la misma escena y pesa casi un tercio menos: 241 kB comprimidos frente a
350 kB de la de React solo con la cueva.
