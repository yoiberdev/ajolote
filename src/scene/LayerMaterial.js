import * as THREE from 'three'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

// Material para las capas fotográficas.
// mode 0: quieta · 1: se mece desde la base (plantas)
// mode 2: ajolote — la cola ondula y las branquias se agitan alrededor de la cabeza
export const LayerMaterial = shaderMaterial(
  {
    tex: null,
    time: 0,
    mode: 0,
    wiggle: 0,
    speed: 1,
    freq: 3,
    phase: 0,
    // Solo para el ajolote (coordenadas UV de la capa recortada):
    head: new THREE.Vector2(0.5, 0.5),
    tailEnd: 0.45,
    gillInner: 0.2,
    gillOuter: 0.45,
    aspect: 1,
    hazeColor: new THREE.Color('#1d5f6b'),
    haze: 0,
    caustics: 0,
    fade: 1,
  },
  /* glsl */ `
    uniform float time;
    uniform float mode;
    uniform float wiggle;
    uniform float speed;
    uniform float freq;
    uniform float phase;
    uniform float tailEnd;
    varying vec2 vUv;
    varying vec2 vWorld;

    void main() {
      vUv = uv;
      vec3 p = position;
      if (mode > 0.5 && mode < 1.5) {
        float w = uv.y * uv.y;
        p.x += (sin(time * speed + uv.y * freq + phase)
              + 0.5 * sin(time * speed * 0.57 + uv.y * freq * 0.5 + phase * 1.7)) * wiggle * w;
      } else if (mode > 1.5) {
        // La cola (lado izquierdo, parte de arriba) ondula; la punta se mueve más.
        float t = clamp(1.0 - uv.x / tailEnd, 0.0, 1.0);
        float gate = smoothstep(0.32, 0.5, uv.y);
        p.y += sin(time * speed - uv.x * freq + phase) * wiggle * t * t * gate;
        p.x += cos(time * speed - uv.x * freq + phase) * wiggle * 0.35 * t * t * gate;
      }
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorld = world.xy;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  /* glsl */ `
    #define TAU 6.28318530718
    uniform sampler2D tex;
    uniform float time;
    uniform float mode;
    uniform vec2 head;
    uniform float gillInner;
    uniform float gillOuter;
    uniform float aspect;
    uniform vec3 hazeColor;
    uniform float haze;
    uniform float caustics;
    uniform float fade;
    varying vec2 vUv;
    varying vec2 vWorld;

    // Cáusticas de agua (patrón clásico de "water caustic", repetible en mosaico).
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

    void main() {
      vec2 uv = vUv;
      if (mode > 1.5) {
        // Branquias: un anillo alrededor de la cara que se agita de lado, sin tocar la cara ni las patas.
        vec2 d = (vUv - head) * vec2(aspect, 1.0);
        float r = length(d);
        float ring = smoothstep(gillInner, gillInner + 0.05, r) * (1.0 - smoothstep(gillOuter - 0.06, gillOuter + 0.02, r));
        ring *= smoothstep(-0.13, -0.03, d.y);
        float a = atan(d.y, d.x);
        float wave = sin(time * 2.3 - r * 38.0) * 0.0045 + sin(time * 3.6 + a * 7.0) * 0.0022;
        vec2 tangent = vec2(-d.y, d.x) / max(r, 1e-4);
        uv += tangent / vec2(aspect, 1.0) * wave * ring;
      }
      vec4 c = texture2D(tex, uv); // alfa premultiplicado
      if (c.a < 0.04) discard;
      if (caustics > 0.0) {
        float k = caustic(vWorld * 0.22, time * 0.4);
        c.rgb += vec3(0.7, 0.95, 1.0) * k * caustics * c.a;
      }
      c.rgb = mix(c.rgb, hazeColor * c.a, haze);
      gl_FragColor = c * fade;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
)

extend({ LayerMaterial })
