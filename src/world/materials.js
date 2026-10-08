// Añade efectos de agua a los materiales Lambert de los bloques y las plantas:
// reflejos de luz ondulantes (cáusticas) y el vaivén de las plantas con la corriente.
export const waterUniforms = { uTime: { value: 0 } }

const CAUSTIC = /* glsl */ `
  #define TAU 6.28318530718
  float caustic(vec2 p, float t) {
    vec2 q = mod(p * TAU, TAU) - 250.0;
    vec2 i = q;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }
`

// sway: amplitud del vaivén por unidad de altura sobre la base (atributo de instancia aBase).
// hang: la planta cuelga del techo, así que se mueve más cuanto más abajo.
export function withWater(material, { caustics = 0, sway = 0, hang = false } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        ${sway ? 'attribute float aBase;' : ''}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          mat4 wm = modelMatrix * instanceMatrix;
        #else
          mat4 wm = modelMatrix;
        #endif
        ${
          sway
            ? `vec3 w0 = (wm * vec4(transformed, 1.0)).xyz;
          float k = max(0.0, ${hang ? 'aBase - w0.y' : 'w0.y - aBase'});
          float s = sin(uTime * 1.2 + w0.x * 0.7 + w0.z * 0.45 - w0.y * 0.5) * ${sway.toFixed(3)} * k;
          transformed.x += s;
          transformed.z += s * 0.6;`
            : ''
        }
        vWPos = (wm * vec4(transformed, 1.0)).xyz;
        vWNormal = normalize(mat3(wm) * objectNormal);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        ${caustics ? CAUSTIC : ''}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `${
          caustics
            ? `float up = clamp(vWNormal.y, 0.0, 1.0);
          float cs = caustic(vWPos.xz * 0.32 + vec2(uTime * 0.015, 0.0), uTime * 0.45);
          outgoingLight += diffuseColor.rgb * vec3(0.75, 1.0, 1.0) * cs * ${caustics.toFixed(3)} * (0.25 + 0.75 * up);`
            : ''
        }
        #include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => `water:${caustics}:${sway}:${hang}`
  return material
}
