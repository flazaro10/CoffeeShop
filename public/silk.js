export function buildSilk(THREE, bgScene) {
const WU = {
  uTime: { value: 0 }, uSkyA: { value: new THREE.Color() }, uSkyB: { value: new THREE.Color() },
  uDeep: { value: new THREE.Color('#0a0f1f') }, uMid: { value: new THREE.Color('#283460') }, uPale: { value: new THREE.Color('#7e89b2') },
  uSheen: { value: new THREE.Color('#c3c9e6') },
  uAmp: { value: 1 }, uFreq: { value: 1 }, uWall: { value: 0.07 }, uPhase: { value: 0 }, uL: { value: new THREE.Vector3(0.55, 0.75, 0.38) },
};
const SCRIM = `float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`;
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: WU, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
  fragmentShader: `uniform vec3 uSkyA, uSkyB; varying vec2 vUv; ${SCRIM}
    void main(){
      float t = clamp(vUv.x * 0.8 - (vUv.y - 0.5) * 0.55 + 0.05, 0.0, 1.0);
      gl_FragColor = vec4(mix(uSkyA, uSkyB, smoothstep(0.0, 1.0, t)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    }`,
}));
sky.frustumCulled = false; sky.renderOrder = -10; bgScene.add(sky);

const silk = new THREE.Mesh(new THREE.PlaneGeometry(36, 32, 320, 240), new THREE.ShaderMaterial({
  uniforms: WU, side: THREE.DoubleSide,
  vertexShader: `uniform float uTime, uAmp, uFreq, uWall, uPhase; varying vec3 vW, vN, vT;
    float H(float x, float z){
      float t = uTime + uPhase, X = x * uFreq, Z = z * uFreq, h = uWall * x * x;
      h += uAmp * (1.15 * sin(0.55 * X + 0.32 * Z + t * 0.13 + 1.0)
                 + 0.55 * sin(0.85 * Z - 0.42 * X + t * 0.19)
                 + 0.22 * sin(1.55 * X + 1.25 * Z - t * 0.26)
                 + 0.07 * sin(3.0 * X - 2.1 * Z + t * 0.35));
      return h;
    }
    void main(){
      float x = position.x, z = -position.y - 8.0, e = 0.02;
      float hx = (H(x + e, z) - H(x - e, z)) / (2.0 * e), hz = (H(x, z + e) - H(x, z - e)) / (2.0 * e);
      vW = vec3(x, H(x, z), z); vN = normalize(vec3(-hx, 1.0, -hz)); vT = normalize(vec3(1.0, hx, 0.0));
      gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
    }`,
  fragmentShader: `uniform float uTime; uniform vec3 uDeep, uMid, uPale, uSheen, uSkyA, uSkyB, uL; varying vec3 vW, vN, vT; ${SCRIM}
    float h1(float n){ return fract(sin(n) * 43758.5453); }
    float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
    float oct(float s, float fw, float f, float a){ return (n1(s * f + f * 0.37) - 0.5) * a * (1.0 - smoothstep(0.2, 0.55, fw * f)); }
    void main(){
      vec3 N = normalize(vN), V = normalize(cameraPosition - vW), T = normalize(vT);
      if (dot(N, V) < 0.0) N = -N;
      vec3 L = normalize(uL);
      float s = vW.z + 0.45 * sin(vW.x * 0.35 + uTime * 0.05) + 0.15 * sin(vW.x * 1.1 - 0.7), fw = fwidth(s);
      float st = oct(s, fw, 7.0, 0.45) + oct(s, fw, 31.0, 0.32) + oct(s, fw, 113.0, 0.24) + oct(s, fw, 360.0, 0.16);
      float d = dot(N, L) * 0.5 + 0.5;
      vec3 col = mix(uDeep, uMid, smoothstep(0.0, 0.72, d));
      col = mix(col, uPale, smoothstep(0.5, 1.0, d) * 0.8);
      col *= clamp(1.0 + st * 0.45, 0.78, 1.22);
      vec3 Hh = normalize(L + V), Ts = normalize(T + N * st * 0.5);
      float th = dot(Ts, Hh), sn = sqrt(max(0.0, 1.0 - th * th));
      float spec = (pow(sn, 90.0) * 0.75 + pow(sn, 14.0) * 0.12) * smoothstep(-0.1, 0.45, dot(N, L));
      col += uSheen * spec * 0.55 * clamp(0.7 + st * 0.6, 0.3, 1.2);
      vec3 haze = mix(uSkyA, uSkyB, 0.65);
      col = mix(col, haze * 1.4, pow(1.0 - max(dot(N, V), 0.0), 5.0) * 0.3);
      col = mix(col, haze, smoothstep(16.0, 44.0, length(cameraPosition - vW)));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    }`,
}));
silk.frustumCulled = false; bgScene.add(silk);
return WU;
}
