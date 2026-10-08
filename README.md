# Ajolote

Escena submarina con parallax y un desenfoque de profundidad que sigue al cursor, al estilo de
[zustand-demo.pmnd.rs](https://zustand-demo.pmnd.rs/). Tiene dos versiones:

- **En bloques** (por defecto, `/`): una cueva frondosa inundada en 3D, hecha de bloques con texturas pixel-art.
- **Realista** (`/?estilo=realista`): capas fotográficas generadas con IA. La página no la enlaza; solo se
  llega con esa dirección.

## Arrancar

```bash
npm install
npm run dev
```

`npm run build` genera la versión de producción en `dist/`.

En las dos versiones, con el cursor al centro se enfoca el ajolote; arriba a la derecha, el fondo; abajo a la
izquierda, lo que está pegado a la cámara. En pantallas táctiles la cámara se mueve sola. Al hacer clic en el
ajolote suelta burbujas (estado en `src/store.js`).

## Versión en bloques (`src/minecraft/`)

Todo está hecho con código, sin imágenes:

- `textures.js`: texturas pixel-art 16×16 (arena, grava, arcilla, musgo, piedra, corales, magma, kelp, bayas
  luminosas, el ajolote y los peces), pintadas en un canvas.
- `cave.js`: genera la cueva (terreno con ruido, paredes, techo con huecos de luz) y reparte la decoración.
- `World.jsx`: dibuja miles de bloques y plantas con instancias; `materials.js` añade los reflejos de agua y el
  vaivén de las plantas.
- `Axolotl.jsx`: modelo del ajolote por partes (cuerpo, cabeza, branquias, patas, cola), animado nadando. Al hacer
  clic da una voltereta.
- `MinecraftScene.jsx`: luces, niebla de agua, sombras, cámara con parallax, desenfoque, brillo (bloom) y color.

El diseño del ajolote es propio, en estilo bloques; no usa texturas ni marcas de Minecraft.

## Versión realista (`src/scene/`)

- **Capas** (`public/layers/`): fondo, plantas lejanas, roca con musgo, ajolote y plantas del frente, cada una en un
  plano a distinta profundidad (`Scene.jsx`).
- **Movimiento** (`LayerMaterial.js`): las plantas se mecen, la cola del ajolote ondula y sus branquias se agitan,
  todo con shaders sobre las fotos. Encima hay rayos de luz animados, partículas y burbujas.

### Cambiar las imágenes

Las imágenes originales están en `art/raw/` (generadas con IA sobre fondo de color sólido):

| Archivo | Contenido | Fondo |
|---|---|---|
| `axolotl.png` | El ajolote | Verde |
| `plants.png` | Plantas izquierda, roca y plantas derecha, separadas entre sí | Magenta |
| `background.png` | El fondo completo | Opaco |

`npm run art` recorta el fondo de color, separa las piezas y exporta las capas WebP a `public/layers/`, junto con
`src/scene/art.json` (proporciones y puntos de referencia del ajolote: cabeza, boca, branquias y cola). Si cambias
la foto del ajolote, actualiza esos puntos en `scripts/process-art.mjs`.
