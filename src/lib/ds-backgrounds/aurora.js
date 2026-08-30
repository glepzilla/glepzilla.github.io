/**
 * aurora — domain-warped fbm on the GPU. The richest of the set: slow
 * moss-coloured curtains that bend toward the cursor. Falls back to `mesh`
 * automatically when WebGL is unavailable (see index.js).
 */

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;

uniform vec2 u_res;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_strength;
uniform float u_dark;
uniform vec3 u_base;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(1.62, 1.2, -1.2, 1.62);
  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = rot * p;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  vec2 mouse = vec2(u_pointer.x, 1.0 - u_pointer.y);
  vec2 mp = (mouse - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.055;
  vec2 toward = p - mp;
  float md = length(toward);
  float pull = 0.55 / (1.0 + md * md * 6.0);

  vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(
    fbm(p * 2.0 + 2.6 * q + vec2(1.7, 9.2) + t * 1.15 - toward * pull),
    fbm(p * 2.0 + 2.6 * q + vec2(8.3, 2.8) - t * 0.85)
  );
  float f = fbm(p * 1.8 + 3.2 * r);

  // Narrow bands: most of the frame stays at the base colour, and only the
  // ridges of the field carry moss. Without the smoothsteps this washes out
  // into an even mid-tone and eats the text contrast.
  float depth = smoothstep(0.34, 0.86, length(r));
  float ridge = smoothstep(0.46, 0.92, f);
  float crest = pow(ridge, 3.0);

  vec3 col = u_base;
  col = mix(col, u_b, depth * 0.5);
  col = mix(col, u_a, ridge * 0.42);
  col = mix(col, u_c, crest * 0.3);

  float glow = 0.05 / (0.05 + md * md * 3.2);
  col = mix(col, u_c, clamp(glow * 0.3, 0.0, 0.35));

  col = mix(u_base, col, u_strength);

  float vignette = 1.0 - 0.55 * pow(length((uv - 0.5) * vec2(aspect, 1.0)) * 1.15, 1.7);
  col *= mix(1.0, vignette, u_dark);
  col = mix(col, mix(u_base, col, 0.72), 1.0 - u_dark);

  // dither away the banding that big smooth gradients always produce
  col += (hash(gl_FragCoord.xy * 0.77) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

export default {
  name: 'aurora',
  mode: 'webgl',
  resolution: 0.7,
  maxDpr: 1.5,

  setup(s) {
    const gl = s.gl;
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // one oversized triangle covers the viewport without an index buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    s.program = program;
    s.buffer = buffer;
    s.uniforms = {};
    for (const name of ['u_res', 'u_pointer', 'u_time', 'u_strength', 'u_dark', 'u_base', 'u_a', 'u_b', 'u_c']) {
      s.uniforms[name] = gl.getUniformLocation(program, name);
    }

    s.onContextLost = (event) => {
      event.preventDefault();
      s.stop();
    };
    s.canvas.addEventListener('webglcontextlost', s.onContextLost);
  },

  resize(s) {
    s.gl.viewport(0, 0, s.width, s.height);
  },

  frame(s) {
    const gl = s.gl;
    const u = s.uniforms;
    const p = s.palette;
    gl.viewport(0, 0, s.width, s.height);
    gl.useProgram(s.program);
    gl.uniform2f(u.u_res, s.width, s.height);
    gl.uniform2f(u.u_pointer, s.pointer.x, s.pointer.y);
    gl.uniform1f(u.u_time, s.time);
    gl.uniform1f(u.u_strength, p.strength);
    gl.uniform1f(u.u_dark, p.dark ? 1 : 0);
    gl.uniform3f(u.u_base, p.base[0] / 255, p.base[1] / 255, p.base[2] / 255);
    gl.uniform3f(u.u_a, p.a[0] / 255, p.a[1] / 255, p.a[2] / 255);
    gl.uniform3f(u.u_b, p.b[0] / 255, p.b[1] / 255, p.b[2] / 255);
    gl.uniform3f(u.u_c, p.c[0] / 255, p.c[1] / 255, p.c[2] / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },

  destroy(s) {
    s.canvas.removeEventListener('webglcontextlost', s.onContextLost);
    const gl = s.gl;
    if (!gl || gl.isContextLost()) return;
    gl.deleteProgram(s.program);
    gl.deleteBuffer(s.buffer);
  },
};
