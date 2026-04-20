export const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform sampler2D uTexture;
uniform sampler2D uDisp;
uniform float uTime;
uniform float uProgress;
uniform float uHover;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 disp = texture2D(uDisp, uv * 1.6 + vec2(uTime * 0.03, -uTime * 0.02)).rg;
  disp = (disp - 0.5) * 2.0;

  float strength = 0.055 * uProgress + 0.07 * uHover;
  vec2 warpedUv = uv + disp * strength;

  vec4 color = texture2D(uTexture, warpedUv);

  float glow = smoothstep(0.4, 1.0, length(disp)) * (uHover * 0.35);
  color.rgb += vec3(0.12, 0.9, 1.0) * glow;

  gl_FragColor = color;
}
`;
