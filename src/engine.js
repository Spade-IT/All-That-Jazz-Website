/* ATJ WORLD V3 · dependency-free WebGL scene, PBR-inspired multi-light shader,
 * smart cutaway wall occlusion + X-ray avatar silhouette, and damped walking controller. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));
  const hex = value => {
    if (Array.isArray(value)) return value;
    let s = String(value || '#ffffff').replace('#', '');
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const n = parseInt(s, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const normalize = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  };
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const multiply = (a, b) => {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
    return out;
  };
  const translation = (x, y, z) => {
    const m = ident();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  };
  const scaling = (sx, sy, sz) => {
    const m = ident();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  };
  const rotationY = a => {
    const s = Math.sin(a), c = Math.cos(a);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  };
  const rotationX = a => {
    const s = Math.sin(a), c = Math.cos(a);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  };
  const rotationZ = a => {
    const s = Math.sin(a), c = Math.cos(a);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  };
  const perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  };
  const lookAt = (eye, target) => {
    const z = normalize(eye.map((v, i) => v - target[i]));
    const x = normalize(cross([0, 1, 0], z));
    const y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  };
  const inverse = m => {
    const a = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => (c < 4 ? m[c * 4 + r] : +(c - 4 === r)))
    );
    for (let i = 0; i < 4; i++) {
      let pivot = i;
      for (let r = i + 1; r < 4; r++) if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) pivot = r;
      if (Math.abs(a[pivot][i]) < 1e-9) return ident();
      [a[i], a[pivot]] = [a[pivot], a[i]];
      const div = a[i][i];
      for (let c = 0; c < 8; c++) a[i][c] /= div;
      for (let r = 0; r < 4; r++) if (r !== i) {
        const f = a[r][i];
        for (let c = 0; c < 8; c++) a[r][c] -= f * a[i][c];
      }
    }
    const out = new Float32Array(16);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[c * 4 + r] = a[r][c + 4];
    return out;
  };
  const transform = (m, v) => {
    const out = [0, 0, 0, 0];
    const w = v[3] === undefined ? 1 : v[3];
    for (let r = 0; r < 4; r++) {
      out[r] = m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * w;
    }
    return out;
  };

  class Geometry {
    constructor() { this.data = []; }
    vertex(p, normal, color) { this.data.push(...p, ...normal, ...color); }
    tri(a, b, c, normal, color) {
      this.vertex(a, normal, color);
      this.vertex(b, normal, color);
      this.vertex(c, normal, color);
    }
    box(x, y, z, sx, sy, sz, color, ry = 0) {
      const c = hex(color), cs = Math.cos(ry), sn = Math.sin(ry);
      const point = ([a, b, d]) => [x + a * cs + d * sn, y + b, z - a * sn + d * cs];
      const norm = ([a, b, d]) => [a * cs + d * sn, b, -a * sn + d * cs];
      const a = sx / 2, b = sy / 2, d = sz / 2;
      const faces = [
        [[-a, b, -d], [-a, b, d], [a, b, d], [a, b, -d], [0, 1, 0]],
        [[-a, -b, d], [-a, -b, -d], [a, -b, -d], [a, -b, d], [0, -1, 0]],
        [[-a, -b, d], [a, -b, d], [a, b, d], [-a, b, d], [0, 0, 1]],
        [[a, -b, -d], [-a, -b, -d], [-a, b, -d], [a, b, -d], [0, 0, -1]],
        [[a, -b, d], [a, -b, -d], [a, b, -d], [a, b, d], [1, 0, 0]],
        [[-a, -b, -d], [-a, -b, d], [-a, b, d], [-a, b, -d], [-1, 0, 0]]
      ];
      faces.forEach(f => {
        const n = norm(f[4]), p = f.slice(0, 4).map(point);
        // Subtle vertical gradient shading per box face for richer depth
        const topTint = f[4][1] > 0.5 ? 1.03 : (f[4][1] < -0.5 ? 0.88 : 1.0);
        const fc = [clamp(c[0] * topTint, 0, 1), clamp(c[1] * topTint, 0, 1), clamp(c[2] * topTint, 0, 1)];
        this.tri(p[0], p[1], p[2], n, fc);
        this.tri(p[0], p[2], p[3], n, fc);
      });
    }
    cylinder(x, y, z, radius, height, color, segments = 16) {
      this.beam(x, y - height / 2, z, x, y + height / 2, z, radius, color, segments);
    }
    beam(ax, ay, az, bx, by, bz, radius, color, segments = 12) {
      const c = hex(color), start = [ax, ay, az], end = [bx, by, bz];
      const axis = normalize([bx - ax, by - ay, bz - az]);
      const u = normalize(cross(axis, Math.abs(axis[1]) < .95 ? [0, 1, 0] : [1, 0, 0]));
      const v = cross(axis, u);
      const radial = a => u.map((n, i) => n * Math.cos(a) + v[i] * Math.sin(a));
      const p = (base, n) => base.map((b, j) => b + n[j] * radius);
      for (let i = 0; i < segments; i++) {
        const n1 = radial(i * TAU / segments), n2 = radial((i + 1) * TAU / segments);
        const a = p(start, n1), b = p(start, n2), d = p(end, n1), e = p(end, n2);
        this.vertex(a, n1, c); this.vertex(d, n1, c); this.vertex(e, n2, c);
        this.vertex(a, n1, c); this.vertex(e, n2, c); this.vertex(b, n2, c);
        this.tri(start, b, a, axis.map(n => -n), c);
        this.tri(end, d, e, axis, c);
      }
    }
    sphere(x, y, z, radius, color, segments = 14) {
      const c = hex(color), rows = Math.max(6, Math.floor(segments / 2));
      const n = (a, b) => [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
      const p = normal => [x + normal[0] * radius, y + normal[1] * radius, z + normal[2] * radius];
      for (let r = 0; r < rows; r++) for (let s = 0; s < segments; s++) {
        const a = s * TAU / segments, b = (s + 1) * TAU / segments;
        const c1 = r * Math.PI / rows, c2 = (r + 1) * Math.PI / rows;
        const ns = [n(a, c1), n(a, c2), n(b, c2), n(b, c1)];
        [0, 1, 2, 0, 2, 3].forEach(i => this.vertex(p(ns[i]), ns[i], c));
      }
    }
    disc(x, y, z, radius, color) {
      const c = hex(color), n = [0, 1, 0], count = 48;
      for (let i = 0; i < count; i++) {
        const a = i * TAU / count, b = (i + 1) * TAU / count;
        this.tri(
          [x, y, z],
          [x + Math.sin(a) * radius, y, z + Math.cos(a) * radius],
          [x + Math.sin(b) * radius, y, z + Math.cos(b) * radius],
          n, c
        );
      }
    }
    ring(x, y, z, inner, outer, color) {
      const c = hex(color), n = [0, 1, 0], count = 48;
      for (let i = 0; i < count; i++) {
        const a = i * TAU / count, b = (i + 1) * TAU / count;
        const p = (angle, r) => [x + Math.sin(angle) * r, y, z + Math.cos(angle) * r];
        this.tri(p(a, inner), p(a, outer), p(b, outer), n, c);
        this.tri(p(a, inner), p(b, outer), p(b, inner), n, c);
      }
    }
  }

  const vertexShader = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    uniform mat4 uViewProjection;
    uniform mat4 uModel;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vPosition;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vPosition = world.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      vColor = aColor;
      gl_Position = uViewProjection * world;
    }
  `;

  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vPosition;
    uniform vec3 uEye;
    uniform vec3 uAvatar;
    uniform float uAlpha;
    uniform float uUnlit;
    uniform float uOccluder;
    uniform float uFogStart;
    uniform float uTime;

    vec3 pointLight(vec3 pos, vec3 lPos, vec3 lCol, float radius, vec3 n) {
      vec3 d = lPos - pos;
      float dist = length(d);
      if (dist > radius) return vec3(0.0);
      float att = pow(clamp(1.0 - dist / radius, 0.0, 1.0), 2.0);
      float ndl = max(dot(n, d / max(dist, 0.001)), 0.0) * 0.7 + 0.3;
      return lCol * att * ndl;
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 viewVec = uEye - vPosition;
      float viewDist = length(viewVec);
      vec3 viewDir = viewVec / max(viewDist, 0.001);

      // X-Ray Silhouette Pass when avatar is behind walls/obstacles (uUnlit == 2.0)
      if (uUnlit > 1.5) {
        float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 1.8);
        vec3 xrayCol = mix(vec3(0.74, 0.68, 1.0), vec3(0.84, 0.98, 0.48), rim);
        float scan = 0.85 + 0.15 * sin(vPosition.y * 28.0 - uTime * 5.0);
        gl_FragColor = vec4(xrayCol * scan, uAlpha * (0.45 + 0.55 * rim));
        return;
      }

      // Smart Camera-to-Avatar Occlusion Cutaway Lens for walls & backdrops
      vec3 rimHighlight = vec3(0.0);
      if (uOccluder > 0.5 && vPosition.y > 0.36) {
        vec3 toAvatar = uAvatar - uEye;
        float segLen = length(toAvatar);
        float t = dot(vPosition - uEye, toAvatar) / max(segLen * segLen, 0.001);
        if (t > 0.06 && t < 0.96) {
          vec3 closest = uEye + toAvatar * t;
          vec3 diff = (vPosition - closest) * vec3(1.0, 0.56, 1.0);
          float rayDist = length(diff);
          float coneRadius = mix(0.42, 2.25, t);
          if (rayDist < coneRadius) {
            float rNorm = rayDist / coneRadius;
            vec2 cell = floor(mod(gl_FragCoord.xy, 4.0));
            float dither = fract(dot(cell, vec2(0.375, 0.125)) + cell.x * cell.y * 0.25);
            if (rNorm * rNorm < dither * 0.85 + 0.22) {
              discard;
            }
            float edge = smoothstep(1.0, 0.62, rNorm);
            rimHighlight = vec3(0.78, 0.94, 0.45) * edge * 0.42;
          }
        }
      }

      // Base surface color with subtle architectural micro-texture
      vec3 baseColor = vColor;
      if (uUnlit < 0.5) {
        if (vPosition.y < 0.16 && n.y > 0.8) {
          // Subtle satin terrazzo/stone variation on the promenade & island floor
          float grain = sin(vPosition.x * 9.0) * cos(vPosition.z * 9.0) * 0.012;
          baseColor += vec3(grain);
        } else if (abs(n.y) < 0.2 && vPosition.y > 0.35) {
          // Subtle architectural fluting on vertical walls
          float flute = sin((vPosition.x + vPosition.z) * 14.0) * 0.01;
          baseColor += vec3(flute);
        }
      }

      // Three-point studio lighting + hemispheric sky/ground + Blinn-Phong specular
      vec3 keyDir = normalize(vec3(-0.52, 0.95, 0.48));
      vec3 fillDir = normalize(vec3(0.78, 0.42, -0.68));
      float key = max(dot(n, keyDir), 0.0);
      float fill = max(dot(n, fillDir), 0.0);
      float hemi = n.y * 0.5 + 0.5;

      // Ground contact ambient occlusion near y = 0
      float contactAO = mix(0.84, 1.0, smoothstep(0.0, 0.48, max(0.0, vPosition.y)));

      vec3 lighting = (
        vec3(0.35, 0.33, 0.41) +
        vec3(0.41, 0.38, 0.31) * key +
        vec3(0.14, 0.11, 0.21) * fill +
        vec3(0.22, 0.22, 0.26) * hemi
      ) * contactAO;

      // Multi-zone colored stage radiance
      vec3 stageGlow = vec3(0.0);
      stageGlow += pointLight(vPosition, vec3(0.0, 3.1, 0.52), vec3(0.55, 0.68, 0.25), 9.0, n);
      stageGlow += pointLight(vPosition, vec3(-13.0, 3.2, 6.0), vec3(0.65, 0.48, 0.12), 10.5, n);
      stageGlow += pointLight(vPosition, vec3(-13.0, 3.2, -7.0), vec3(0.62, 0.28, 0.36), 10.5, n);
      stageGlow += pointLight(vPosition, vec3(0.0, 3.4, -12.8), vec3(0.42, 0.30, 0.75), 10.5, n);
      stageGlow += pointLight(vPosition, vec3(13.0, 3.2, -7.0), vec3(0.62, 0.48, 0.22), 10.5, n);
      stageGlow += pointLight(vPosition, vec3(13.0, 3.2, 6.0), vec3(0.45, 0.32, 0.72), 10.5, n);
      stageGlow += pointLight(vPosition, uAvatar + vec3(0.0, 2.2, 0.0), vec3(0.32, 0.36, 0.24), 5.5, n);

      // Specular highlight & Fresnel rim
      vec3 halfVec = normalize(keyDir + viewDir);
      float specPower = (vPosition.y < 0.16 && n.y > 0.8) ? 36.0 : 22.0;
      float specStrength = (vPosition.y < 0.16 && n.y > 0.8) ? 0.14 : 0.10;
      float spec = pow(max(dot(n, halfVec), 0.0), specPower) * specStrength;
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.2) * 0.09;

      vec3 litColor = baseColor * (lighting + stageGlow * 0.42) + vec3(spec) + vec3(0.75, 0.70, 0.95) * fresnel;
      vec3 emissiveColor = baseColor * (1.08 + 0.06 * sin(uTime * 3.2 + vPosition.x * 0.5));
      vec3 color = mix(litColor, emissiveColor, clamp(uUnlit, 0.0, 1.0)) + rimHighlight;

      // Atmospheric distance fog
      float fog = smoothstep(uFogStart, uFogStart + 92.0, viewDist) * 0.76;
      color = mix(color, vec3(0.065, 0.06, 0.088), fog);

      gl_FragColor = vec4(color, uAlpha);
    }
  `;

  class ATJEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = options;
      this.gl = null;
      this.running = false;
      this.ready = false;
      this.keysEnabled = true;
      this.keys = new Set();
      this.view = 'overview';
      this.autoTour = false;
      this.tourIndex = 0;
      this.tourWait = 0;
      this.target = null;
      this.waypoints = [];
      this.zone = null;
      this.zones = [];
      this.bounds = { minX: -22, maxX: 22, minZ: -20, maxZ: 20 };
      this.welcomeObstacle = { minX: -2.2, maxX: 2.2, minZ: -1.55, maxZ: 2.6 };
      this.interiorObstacles = [
        // Pavilion back walls (safely behind all zones and stages)
        { minX: -17.8, maxX: -8.2, minZ: 1.15, maxZ: 1.98 },
        { minX: -17.8, maxX: -8.2, minZ: -12.15, maxZ: -11.15 },
        { minX: -4.5, maxX: 4.5, minZ: -15.95, maxZ: -15.10 },
        { minX: 8.2, maxX: 17.8, minZ: -12.15, maxZ: -11.15 },
        { minX: 8.2, maxX: 17.8, minZ: 1.15, maxZ: 1.98 },
        // Reception desk (to the left of the contact zone & doorway)
        { minX: -3.38, maxX: -0.78, minZ: 12.38, maxZ: 13.52 },
        // Patio arcade cabinet pedestals (zones are at z = 16.0 in front of cabinets)
        { minX: -6.68, maxX: -5.32, minZ: 14.82, maxZ: 15.72 },
        { minX: 5.32, maxX: 6.68, minZ: 14.82, maxZ: 15.72 }
      ];
      this.avatar = {
        x: 0, z: 8, yaw: Math.PI, moving: false,
        phase: 0, idlePhase: 0, gait: 0, vx: 0, vz: 0, bank: 0
      };
      this.camera = {
        x: 31, y: 33, z: 40,
        tx: 0, ty: .5, tz: 0,
        angle: .57, elevation: .68, zoom: 1
      };
      this.wallAlpha = { front: 1, back: 1, left: 1, right: 1, roof: 1 };
      this.eye = [31, 33, 40];
      this.vp = ident();
      this.inverseVP = ident();
      this.width = 1;
      this.height = 1;
      this.lastTime = 0;
      this.lastCallback = 0;
      this.frame = 0;
      this.meshes = [];
      this.groups = {};
      this.pointer = null;
      this.reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this._boundFrame = time => this._tick(time);
      this._listeners = [];
      this._identity = ident();
    }

    _emit(name, ...args) {
      try { this.options[name]?.(...args); } catch (error) { console.warn('ATJ callback:', error); }
    }

    async init(worldFactory) {
      try {
        this._emit('onReady', .04, 'Opening the venue');
        this.gl =
          this.canvas.getContext('webgl', {
            alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false
          }) || this.canvas.getContext('experimental-webgl');
        if (!this.gl) throw new Error('Your browser could not open the 3D experience. The project index is still available.');
        const gl = this.gl;
        const compile = (type, source) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
          }
          return shader;
        };
        const vs = compile(gl.VERTEX_SHADER, vertexShader);
        const fs = compile(gl.FRAGMENT_SHADER, fragmentShader);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(this.program) || 'The 3D renderer could not start');
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.useProgram(this.program);
        this.attributes = Object.fromEntries(
          ['aPosition', 'aNormal', 'aColor'].map(n => [n, gl.getAttribLocation(this.program, n)])
        );
        this.uniforms = Object.fromEntries(
          ['uViewProjection', 'uModel', 'uEye', 'uAvatar', 'uAlpha', 'uUnlit', 'uOccluder', 'uFogStart', 'uTime']
            .map(n => [n, gl.getUniformLocation(this.program, n)])
        );
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        this._emit('onReady', .22, 'Building the exhibition halls');
        await nextTask();

        const buckets = new Map();
        const getBucket = (name, pivot = [0, 0, 0]) => {
          if (!buckets.has(name)) buckets.set(name, { geom: new Geometry(), pivot });
          else if (pivot && (pivot[0] || pivot[1] || pivot[2])) buckets.get(name).pivot = pivot;
          return buckets.get(name);
        };
        let activeBucket = getBucket('scene');

        const api = Object.fromEntries(
          ['box', 'cylinder', 'sphere', 'beam', 'disc'].map(name => [
            name,
            (...args) => activeBucket.geom[name](...args)
          ])
        );
        api.setGroup = (name, pivot) => {
          activeBucket = getBucket(name || 'scene', pivot);
        };

        const factory = worldFactory || window.ATJWorld;
        const world = await (typeof factory === 'function' ? factory(api) : factory.build(api));
        this.zones = world?.zones || [];
        this.bounds = { ...this.bounds, ...world?.bounds };
        if (world?.roof) {
          const r = world.roof, g = new Geometry();
          g.box(r.x, r.y, r.z, r.w, r.h, r.d, r.color);
          // Add architectural skylight coffer detail to the roof
          g.box(r.x, r.y + .14, r.z, r.w - 3.2, .08, r.d - 3.2, '#242633');
          g.box(r.x, r.y + .19, r.z, 6.2, .06, 22.0, '#bea9ff');
          this.roof = this._mesh(g);
        }
        if (world?.spawn) Object.assign(this.avatar, world.spawn);

        this._emit('onReady', .56, 'Lighting the stages');
        await nextTask();

        for (const [name, { geom, pivot }] of buckets.entries()) {
          if (geom.data.length) {
            this.groups[name] = { mesh: this._mesh(geom), pivot };
            geom.data = [];
          }
        }
        this.scene = this.groups.scene?.mesh || null;

        this._emit('onReady', .78, 'Meeting your event producer');
        await nextTask();
        this._createAvatar();
        this._bindInput();
        this.resize();
        this._updateCamera(1, true);
        this._draw(0);
        this.ready = true;
        this._emit('onReady', 1, 'Your world is ready');
        this._emit('onMove', this.getState());
        return this;
      } catch (error) {
        this.failed = true;
        this._emit('onError', error.message || 'The 3D experience is unavailable.');
        return this;
      }
    }

    _mesh(geometry) {
      const gl = this.gl, data = new Float32Array(geometry.data);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const mesh = { buffer, count: data.length / 9 };
      this.meshes.push(mesh);
      return mesh;
    }

    _part(method, ...args) {
      const geometry = new Geometry();
      geometry[method](...args);
      return this._mesh(geometry);
    }

    _createAvatar() {
      this.parts = {
        body: (() => {
          const g = new Geometry();
          g.box(0, 0, 0, .56, .67, .34, '#252136');
          // Tailored jacket lapels & pocket square
          g.box(-.14, .10, .175, .09, .38, .02, '#383252');
          g.box(.14, .10, .175, .09, .38, .02, '#383252');
          g.box(.16, .14, .182, .08, .035, .02, '#c9ed6b');
          return this._mesh(g);
        })(),
        hips: this._part('box', 0, 0, 0, .46, .23, .31, '#343044'),
        head: this._part('sphere', 0, 0, 0, .23, '#efb390', 18),
        hair: this._part('sphere', 0, 0, 0, .238, '#252034', 14),
        cap: (() => {
          const g = new Geometry();
          g.box(0, 0, .04, .47, .09, .52, '#252034');
          g.box(0, -.02, .26, .42, .035, .14, '#c9ed6b');
          return this._mesh(g);
        })(),
        neck: this._part('cylinder', 0, 0, 0, .095, .16, '#efb390', 12),
        leg: this._part('cylinder', 0, -.4, 0, .105, .8, '#302b40', 14),
        shoe: (() => {
          const g = new Geometry();
          g.box(0, -.82, .065, .22, .12, .35, '#f1f0e9');
          g.box(0, -.885, .065, .23, .035, .36, '#c9ed6b');
          return this._mesh(g);
        })(),
        arm: this._part('cylinder', 0, -.28, 0, .076, .57, '#252136', 12),
        hand: this._part('sphere', 0, -.615, 0, .084, '#efb390', 12),
        badge: (() => {
          const g = new Geometry();
          g.box(0, 0, 0, .135, .175, .028, '#d6f777');
          g.box(0, -.03, .016, .09, .05, .01, '#242633');
          return this._mesh(g);
        })(),
        headset: this._part('sphere', 0, 0, 0, .078, '#d6f777', 12),
        lanyard: this._part('box', 0, 0, 0, .032, .26, .024, '#c6b4ef'),
        shadow: this._part('disc', 0, .038, 0, .55, '#221c2b'),
        halo: (() => {
          const g = new Geometry();
          g.ring(0, .048, 0, .70, .79, '#d9f785');
          g.ring(0, .046, 0, .54, .58, '#bea9ff');
          return this._mesh(g);
        })(),
        target: (() => {
          const g = new Geometry();
          g.ring(0, .058, 0, .32, .42, '#c9ed6b');
          g.ring(0, .055, 0, .12, .18, '#bea9ff');
          return this._mesh(g);
        })(),
        waypointDot: this._part('disc', 0, .054, 0, .14, '#c9ed6b'),
        zoneRing: (() => {
          const g = new Geometry();
          g.ring(0, .042, 0, .88, .96, '#bea9ff');
          return this._mesh(g);
        })()
      };
    }

    _listen(target, event, fn, options) {
      target.addEventListener(event, fn, options);
      this._listeners.push(() => target.removeEventListener(event, fn, options));
    }

    _bindInput() {
      const canvas = this.canvas;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', 'Interactive 3D event venue. Use W A S D or arrow keys to walk, drag to orbit, or click the floor to move.');
      canvas.style.touchAction = 'none';
      const formActive = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable;
      this._listen(window, 'keydown', e => {
        if (!this.keysEnabled || formActive(e) || document.activeElement !== canvas) return;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) return;
        e.preventDefault();
        this.keys.add(e.key.toLowerCase());
        this.autoTour = false;
        this.target = null;
        this.waypoints = [];
      });
      this._listen(window, 'keyup', e => this.keys.delete(e.key.toLowerCase()));
      this._listen(window, 'blur', () => this.keys.clear());
      this._listen(document, 'visibilitychange', () => { this.keys.clear(); this.lastTime = 0; });
      this._listen(canvas, 'blur', () => this.keys.clear());
      this._listen(canvas, 'pointerdown', e => {
        if (!this.keysEnabled || e.button > 0) return;
        canvas.focus({ preventScroll: true });
        this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
        canvas.setPointerCapture?.(e.pointerId);
        canvas.style.cursor = 'grabbing';
      });
      this._listen(canvas, 'pointermove', e => {
        const p = this.pointer;
        if (!this.keysEnabled || !p || p.id !== e.pointerId) return;
        const dx = e.clientX - p.lastX, dy = e.clientY - p.lastY;
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 5) p.moved = true;
        if (p.moved) {
          this.camera.angle -= dx * .005;
          this.camera.elevation = clamp(
            this.camera.elevation + dy * .003,
            this.view === 'first' ? -.85 : .30,
            this.view === 'first' ? .85 : 1.15
          );
        }
        p.lastX = e.clientX;
        p.lastY = e.clientY;
      });
      this._listen(canvas, 'pointerup', e => {
        const p = this.pointer;
        if (!p || p.id !== e.pointerId) return;
        if (!p.moved && this.keysEnabled) {
          const hit = this._groundPoint(e.clientX, e.clientY);
          if (hit) this.setTarget(hit.x, hit.z);
        }
        this.pointer = null;
        canvas.style.cursor = 'grab';
        if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      });
      this._listen(canvas, 'pointercancel', () => { this.pointer = null; canvas.style.cursor = 'grab'; });
      this._listen(canvas, 'wheel', e => {
        if (!this.keysEnabled) return;
        e.preventDefault();
        this.camera.zoom = clamp(this.camera.zoom * Math.exp(e.deltaY * .0008), .52, 1.45);
      }, { passive: false });
      this._listen(window, 'resize', () => this.resize());
      this._listen(canvas, 'webglcontextlost', e => {
        e.preventDefault();
        this.stop();
        this._emit('onError', 'The 3D view was interrupted. You can still explore the project index, or reload to return to the venue.');
      });
      if (window.ResizeObserver) {
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
      }
      canvas.style.cursor = 'grab';
    }

    _groundPoint(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width * 2 - 1;
      const y = 1 - (clientY - rect.top) / rect.height * 2;
      const a = transform(this.inverseVP, [x, y, -1, 1]);
      const b = transform(this.inverseVP, [x, y, 1, 1]);
      const near = a.slice(0, 3).map(v => v / a[3]);
      const far = b.slice(0, 3).map(v => v / b[3]);
      const dir = far.map((v, i) => v - near[i]);
      if (Math.abs(dir[1]) < .0001) return null;
      const t = (.08 - near[1]) / dir[1];
      if (t < 0) return null;
      return { x: near[0] + dir[0] * t, z: near[2] + dir[2] * t };
    }

    resize() {
      if (!this.gl) return;
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, rect.width || this.canvas.clientWidth || window.innerWidth);
      this.height = Math.max(1, rect.height || this.canvas.clientHeight || window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, this.width < 700 ? 1.5 : 2);
      const w = Math.floor(this.width * dpr), h = Math.floor(this.height * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
      this._updateCamera(0, false);
      if (this.ready && !this.running) this._draw(0);
    }

    start() {
      if (!this.ready || this.running || this.failed) return;
      this.running = true;
      this.lastTime = 0;
      if (this.keysEnabled && (!document.activeElement || document.activeElement === document.body)) {
        this.canvas.focus({ preventScroll: true });
      }
      this.frame = requestAnimationFrame(this._boundFrame);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.frame);
      this.keys.clear();
      this.lastTime = 0;
    }

    setTarget(x, z) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      this.autoTour = false;
      this.waypoints = this._safePath(this.avatar, this._clampPoint({ x, z }));
      this.target = this.waypoints.shift() || null;
      this.keys.clear();
    }

    _clampPoint(p) {
      const point = {
        x: clamp(p.x, this.bounds.minX + .5, this.bounds.maxX - .5),
        z: clamp(p.z, this.bounds.minZ + .5, this.bounds.maxZ - .5)
      };
      const a = this.avatar;
      // House perimeter walls with open central doorway [-2.72, 2.72]
      for (const wall of [
        { minX: -19.5, maxX: -18.65, minZ: -16.1, maxZ: 12.95 },
        { minX: 18.65, maxX: 19.5, minZ: -16.1, maxZ: 12.95 },
        { minX: -19.5, maxX: 19.5, minZ: -16.2, maxZ: -15.45 },
        { minX: -19.5, maxX: -2.72, minZ: 12.22, maxZ: 12.98 },
        { minX: 2.72, maxX: 19.5, minZ: 12.22, maxZ: 12.98 }
      ]) {
        if (point.x > wall.minX && point.x < wall.maxX && point.z > wall.minZ && point.z < wall.maxZ) {
          if (a.z <= wall.minZ) point.z = wall.minZ - .01;
          else if (a.z >= wall.maxZ) point.z = wall.maxZ + .01;
          else if (a.x <= wall.minX) point.x = wall.minX - .01;
          else point.x = wall.maxX + .01;
        }
      }
      // Central welcome sculpture obstacle
      const obstacle = this.welcomeObstacle;
      if (point.x > obstacle.minX && point.x < obstacle.maxX && point.z > obstacle.minZ && point.z < obstacle.maxZ) {
        const edges = [
          { d: point.x - obstacle.minX, x: obstacle.minX - .04, z: point.z },
          { d: obstacle.maxX - point.x, x: obstacle.maxX + .04, z: point.z },
          { d: point.z - obstacle.minZ, x: point.x, z: obstacle.minZ - .04 },
          { d: obstacle.maxZ - point.z, x: point.x, z: obstacle.maxZ + .04 }
        ].sort((u, v) => u.d - v.d);
        point.x = edges[0].x;
        point.z = edges[0].z;
      }
      // Interior pavilion backdrops, reception counter, and arcade cabinets (smooth sliding)
      if (this.interiorObstacles) {
        for (const box of this.interiorObstacles) {
          if (point.x > box.minX && point.x < box.maxX && point.z > box.minZ && point.z < box.maxZ) {
            const edges = [
              { d: point.x - box.minX, x: box.minX - .02, z: point.z },
              { d: box.maxX - point.x, x: box.maxX + .02, z: point.z },
              { d: point.z - box.minZ, x: point.x, z: box.minZ - .02 },
              { d: box.maxZ - point.z, x: point.x, z: box.maxZ + .02 }
            ].sort((u, v) => u.d - v.d);
            point.x = edges[0].x;
            point.z = edges[0].z;
          }
        }
      }
      return point;
    }

    setKeys(enabled) {
      this.keysEnabled = !!enabled;
      if (!enabled) {
        this.keys.clear();
        this.avatar.moving = false;
        this.avatar.vx = 0;
        this.avatar.vz = 0;
        if (this.pointer && this.canvas.hasPointerCapture?.(this.pointer.id)) {
          this.canvas.releasePointerCapture(this.pointer.id);
        }
        this.pointer = null;
        this.canvas.style.cursor = 'grab';
      }
    }

    setView(view) {
      this.view = ['follow', 'first', 'overview'].includes(view) ? view : 'follow';
      if (view === 'first') this.camera.elevation = 0;
      else if (this.camera.elevation < .30) this.camera.elevation = .52;
      this._updateCamera(1, true);
      this.camera.zoom = 1;
    }

    setAutoTour(enabled) {
      this.autoTour = !!enabled;
      this.keys.clear();
      this.tourWait = 0;
      if (this.autoTour && this.zones.length) {
        const nearest = this.zones.reduce(
          (best, z, i) => (distance(z, this.avatar) < best.d ? { d: distance(z, this.avatar), i } : best),
          { d: Infinity, i: 0 }
        );
        this.tourIndex = nearest.i;
        this._routeToZone(this.zones[this.tourIndex]);
      } else {
        this.target = null;
        this.waypoints = [];
      }
      this._emit('onMove', this.getState());
    }

    goToZone(id) {
      const zone = this.zones.find(item => item.id === id);
      if (zone) {
        this.autoTour = false;
        this.keys.clear();
        this._routeToZone(zone);
      }
    }

    _routeToZone(zone) {
      const destination = this._clampPoint(zone);
      const boulevard = [
        this._clampPoint({ x: 0, z: this.avatar.z }),
        this._clampPoint({ x: 0, z: destination.z }),
        destination
      ];
      let current = this.avatar;
      this.waypoints = [];
      boulevard.forEach(point => {
        if (distance(current, point) > .15) this.waypoints.push(...this._safePath(current, point));
        current = point;
      });
      this.target = this.waypoints.shift() || destination;
    }

    _crossesWelcome(a, b) {
      const obstacle = this.welcomeObstacle;
      let low = 0, high = 1;
      for (const axis of ['x', 'z']) {
        const delta = b[axis] - a[axis];
        const min = obstacle[axis === 'x' ? 'minX' : 'minZ'];
        const max = obstacle[axis === 'x' ? 'maxX' : 'maxZ'];
        if (Math.abs(delta) < 1e-9) {
          if (a[axis] <= min || a[axis] >= max) return false;
        } else {
          let t0 = (min - a[axis]) / delta, t1 = (max - a[axis]) / delta;
          if (t0 > t1) [t0, t1] = [t1, t0];
          low = Math.max(low, t0);
          high = Math.min(high, t1);
          if (low >= high - 1e-7) return false;
        }
      }
      return high > .00001 && low < .99999;
    }

    _safePath(start, goal) {
      if ((start.z < 12.6) !== (goal.z < 12.6)) {
        const entry = { x: 0, z: start.z < 12.6 ? 11.7 : 13.5 };
        const exit = { x: 0, z: start.z < 12.6 ? 13.5 : 11.7 };
        return [...this._safePath(start, entry), exit, ...this._safePath(exit, goal)];
      }
      if (!this._crossesWelcome(start, goal)) return [goal];
      const o = this.welcomeObstacle, gap = .42;
      const nodes = [
        start, goal,
        { x: o.minX - gap, z: o.minZ - gap }, { x: o.maxX + gap, z: o.minZ - gap },
        { x: o.maxX + gap, z: o.maxZ + gap }, { x: o.minX - gap, z: o.maxZ + gap }
      ];
      const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
      costs[0] = 0;
      for (let step = 0; step < nodes.length; step++) {
        let current = -1;
        for (let i = 0; i < nodes.length; i++) {
          if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
        }
        if (current === 1 || !Number.isFinite(costs[current])) break;
        visited.add(current);
        for (let i = 0; i < nodes.length; i++) {
          if (i === current || visited.has(i) || this._crossesWelcome(nodes[current], nodes[i])) continue;
          const candidate = costs[current] + distance(nodes[current], nodes[i]);
          if (candidate < costs[i]) {
            costs[i] = candidate;
            previous[i] = current;
          }
        }
      }
      const path = [];
      for (let i = 1; i > 0; i = previous[i]) {
        if (previous[i] < 0) return [goal];
        path.unshift(nodes[i]);
      }
      return path;
    }

    getState() {
      const a = this.avatar;
      return {
        x: a.x, z: a.z, yaw: a.yaw, moving: a.moving,
        zone: this.zone, tour: this.autoTour, view: this.view,
        target: this.target ? { ...this.target } : null,
        waypoints: this.waypoints ? this.waypoints.map(w => ({ ...w })) : [],
        ready: this.ready, zones: this.zones, bounds: this.bounds
      };
    }

    projectPoint(x, y, z) {
      const p = transform(this.vp, [x, y, z, 1]);
      const nx = p[0] / p[3], ny = p[1] / p[3], nz = p[2] / p[3];
      return {
        x: (nx + 1) * this.width / 2,
        y: (1 - ny) * this.height / 2,
        visible: p[3] > 0 && nz > -1 && nz < 1 && Math.abs(nx) < 1.08 && Math.abs(ny) < 1.08
      };
    }

    _tick(time) {
      if (!this.running) return;
      const dt = this.lastTime ? clamp((time - this.lastTime) / 1000, 0, .04) : 0;
      this.lastTime = time;
      this._updateMovement(dt);
      this._updateCamera(dt, false);
      this._draw(time / 1000);
      if (time - this.lastCallback > 60) {
        this._emit('onMove', this.getState());
        this.lastCallback = time;
      }
      this.frame = requestAnimationFrame(this._boundFrame);
    }

    _updateMovement(dt) {
      const a = this.avatar;
      a.idlePhase = (a.idlePhase || 0) + dt * 2.1;
      let dx = 0, dz = 0;
      let manual = false;
      if (this.keysEnabled) {
        const forward = +(this.keys.has('w') || this.keys.has('arrowup')) - +(this.keys.has('s') || this.keys.has('arrowdown'));
        const right = +(this.keys.has('d') || this.keys.has('arrowright')) - +(this.keys.has('a') || this.keys.has('arrowleft'));
        if (forward || right) {
          manual = true;
          this.autoTour = false;
          this.target = null;
          this.waypoints = [];
          const angle = this.camera.angle;
          dx = -Math.sin(angle) * forward + Math.cos(angle) * right;
          dz = -Math.cos(angle) * forward - Math.sin(angle) * right;
          // Gentle doorway corner funneling so walking near the doorway jamb slides smoothly inside
          if (Math.abs(a.z - 12.6) < 0.9 && Math.abs(a.x) > 2.25 && Math.abs(a.x) < 3.55 && dz * (12.6 - a.z) > 0) {
            dx += (a.x > 0 ? -0.65 : 0.65);
          }
        } else if (this.target) {
          const dist = distance(this.target, a);
          const threshold = this.waypoints.length > 0 ? .28 : .10;
          if (dist > threshold) {
            dx = this.target.x - a.x;
            dz = this.target.z - a.z;
            // Smooth lookahead steering toward the next waypoint to eliminate sharp 90-degree turns
            if (this.waypoints.length > 0 && dist < 1.2) {
              const next = this.waypoints[0];
              const blend = (1.2 - dist) / 1.2 * 0.45;
              dx = lerp(dx, next.x - a.x, blend);
              dz = lerp(dz, next.z - a.z, blend);
            }
          } else {
            this.target = this.waypoints.shift() || null;
            if (this.autoTour && !this.target) this.tourWait = 4.6;
          }
        }
        if (this.autoTour && !this.target && this.zones.length) {
          this.tourWait -= dt;
          if (this.tourWait <= 0) {
            this.tourIndex = (this.tourIndex + 1) % this.zones.length;
            this._routeToZone(this.zones[this.tourIndex]);
          }
        }
      }

      const length = Math.hypot(dx, dz);
      a.moving = length > .0001;
      const maxSpeed = this.autoTour ? 3.8 : 5.0;
      const targetVx = a.moving ? (dx / length) * maxSpeed : 0;
      const targetVz = a.moving ? (dz / length) * maxSpeed : 0;
      const accel = 1 - Math.exp(-dt * (a.moving ? 16 : 18));
      a.vx = lerp(a.vx || 0, targetVx, accel);
      a.vz = lerp(a.vz || 0, targetVz, accel);
      const speedNow = Math.hypot(a.vx, a.vz);

      if (a.moving || speedNow > 0.08) {
        const step = Math.min(speedNow * dt, this.target && !manual ? distance(this.target, a) : Infinity);
        const dirX = speedNow > 0.001 ? a.vx / speedNow : dx / (length || 1);
        const dirZ = speedNow > 0.001 ? a.vz / speedNow : dz / (length || 1);
        // Sub-stepped axis sliding collision so diagonal walking glides along walls
        const nextX = a.x + dirX * step;
        const nextZ = a.z + dirZ * step;
        const clampedBoth = this._clampPoint({ x: nextX, z: nextZ });
        a.x = clampedBoth.x;
        a.z = clampedBoth.z;

        if (a.moving) {
          const desiredYaw = Math.atan2(dx, dz);
          const delta = Math.atan2(Math.sin(desiredYaw - a.yaw), Math.cos(desiredYaw - a.yaw));
          const turnStep = delta * Math.min(1, dt * 13.5);
          a.yaw += turnStep;
          a.bank = lerp(a.bank || 0, clamp(-delta * 0.14, -0.12, 0.12), Math.min(1, dt * 10));
        } else {
          a.bank = lerp(a.bank || 0, 0, Math.min(1, dt * 10));
        }
        a.phase += dt * (2.35 * speedNow);
      } else {
        a.bank = lerp(a.bank || 0, 0, Math.min(1, dt * 10));
      }
      a.gait = lerp(a.gait, a.moving ? 1 : 0, Math.min(1, dt * 11));

      const nearest = this.zones.reduce((best, item) => {
        const d = distance(item, a);
        return d < best.d ? { item, d } : best;
      }, { item: null, d: Infinity });
      const newZone = nearest.d < 4 ? nearest.item.id : null;
      if (newZone !== this.zone) {
        this.zone = newZone;
        this._emit('onZone', newZone);
      }
    }

    _updateCamera(dt, snap) {
      const a = this.avatar, c = this.camera;
      if (this.view === 'first') {
        const pitch = c.elevation;
        this.eye = [a.x, 2.05, a.z];
        this.cameraDistance = 0;
        const aim = [
          a.x - Math.sin(c.angle) * Math.cos(pitch),
          2.05 - Math.sin(pitch),
          a.z - Math.cos(c.angle) * Math.cos(pitch)
        ];
        this.vp = multiply(perspective(68 * Math.PI / 180, this.width / this.height, .06, 400), lookAt(this.eye, aim));
        this.inverseVP = inverse(this.vp);
        this._updateWallCutaways(dt, true);
        return;
      }

      const follow = this.view === 'follow';
      // Smooth continuous blend between outside (patio) and inside (experience house)
      // Eliminates the abrupt camera teleport when walking through the front doorway!
      const insideZ = 1 - smoothstep(10.8, 13.6, a.z);
      const insideX = 1 - smoothstep(17.5, 19.2, Math.abs(a.x));
      const insideBlend = insideZ * insideX;

      const tx = follow ? a.x : (this.bounds.minX + this.bounds.maxX) / 2;
      const tz = follow ? a.z : (this.bounds.minZ + this.bounds.maxZ) / 2;
      const ty = follow ? lerp(1.18, 1.08, insideBlend) : 1.0;

      const followRadius = lerp(10.2, 6.8, insideBlend);
      const radius = (follow ? followRadius : this._overviewDistance(tx, ty, tz)) * c.zoom;
      this.cameraDistance = radius;

      const factor = snap || this.reducedMotion ? 1 : 1 - Math.exp(-dt * (follow ? 6.5 : 3.4));
      c.tx = lerp(c.tx, tx, factor);
      c.ty = lerp(c.ty, ty, factor);
      c.tz = lerp(c.tz, tz, factor);

      const flat = radius * Math.cos(c.elevation);
      const idealX = c.tx + Math.sin(c.angle) * flat;
      const idealY = c.ty + Math.sin(c.elevation) * radius;
      const idealZ = c.tz + Math.cos(c.angle) * flat;

      c.x = lerp(c.x, idealX, factor);
      c.y = lerp(c.y, follow ? clamp(idealY, 1.8, lerp(14.0, 5.75, insideBlend * 0.85)) : idealY, factor);
      c.z = lerp(c.z, idealZ, factor);

      this.eye = [c.x, c.y, c.z];
      const view = lookAt(this.eye, [c.tx, c.ty, c.tz]);
      const projection = perspective(43 * Math.PI / 180, this.width / this.height, .15, 400);
      this.vp = multiply(projection, view);
      this.inverseVP = inverse(this.vp);
      this._updateWallCutaways(dt, snap);
    }

    _updateWallCutaways(dt, snap) {
      const a = this.avatar;
      const eye = this.eye;
      const inside = Math.abs(a.x) < 18.7 && a.z < 12.6;
      const nearDoor = Math.abs(a.x) < 4.5 && a.z < 14.2;
      const overview = this.view === 'overview';
      const first = this.view === 'first';

      // Roof smoothly fades out when inside, approaching doorway, or in overview
      const targetRoof = (overview || inside || nearDoor) ? 0.0 : 1.0;

      // Exterior walls smoothly fade to architectural glass cutaway when they sit between camera and character/interior
      let targetFront = 1.0, targetBack = 1.0, targetLeft = 1.0, targetRight = 1.0;
      if (!first) {
        if (eye[2] > 12.2 && (inside || a.z < 12.9 || overview)) targetFront = overview ? 0.28 : 0.15;
        if (eye[2] < -15.2 && (inside || a.z > -15.5 || overview)) targetBack = overview ? 0.28 : 0.15;
        if (eye[0] < -18.2 && (inside || a.x > -18.7 || overview)) targetLeft = overview ? 0.28 : 0.15;
        if (eye[0] > 18.2 && (inside || a.x < 18.7 || overview)) targetRight = overview ? 0.28 : 0.15;
      }

      const rate = snap || this.reducedMotion ? 1 : 1 - Math.exp(-dt * 8.5);
      this.wallAlpha.roof = lerp(this.wallAlpha.roof, targetRoof, rate);
      this.wallAlpha.front = lerp(this.wallAlpha.front, targetFront, rate);
      this.wallAlpha.back = lerp(this.wallAlpha.back, targetBack, rate);
      this.wallAlpha.left = lerp(this.wallAlpha.left, targetLeft, rate);
      this.wallAlpha.right = lerp(this.wallAlpha.right, targetRight, rate);
    }

    _overviewDistance(tx, ty, tz) {
      const c = this.camera, bounds = this.bounds;
      const tanV = Math.tan(43 * Math.PI / 360), tanH = tanV * this.width / this.height;
      const sa = Math.sin(c.angle), ca = Math.cos(c.angle), se = Math.sin(c.elevation), ce = Math.cos(c.elevation);
      let radius = 45;
      for (const x of [bounds.minX - 1.7, bounds.maxX + 1.7])
        for (const y of [-1.5, 6.2])
          for (const z of [bounds.minZ - 1.7, bounds.maxZ + 1.7]) {
            const dx = x - tx, dy = y - ty, dz = z - tz;
            const along = dx * sa + dz * ca;
            const horizontal = dx * ca - dz * sa;
            const vertical = dy * ce - along * se;
            const towardEye = along * ce + dy * se;
            radius = Math.max(radius, towardEye + Math.max(Math.abs(horizontal) / (tanH * .90), Math.abs(vertical) / (tanV * .88)));
          }
      return radius;
    }

    _render(mesh, model = this._identity, alpha = 1, unlit = 0, occluder = 0) {
      if (!mesh || alpha <= 0.01) return;
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      const names = ['aPosition', 'aNormal', 'aColor'];
      names.forEach((name, i) => {
        const location = this.attributes[name];
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, i * 12);
      });
      gl.uniformMatrix4fv(this.uniforms.uModel, false, model);
      gl.uniform1f(this.uniforms.uAlpha, alpha);
      gl.uniform1f(this.uniforms.uUnlit, unlit);
      gl.uniform1f(this.uniforms.uOccluder, occluder);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }

    _pivotTransform(pivot, rotY = 0, dy = 0, rotX = 0) {
      const [px, py, pz] = pivot;
      let m = translation(px, py + dy, pz);
      if (rotY) m = multiply(m, rotationY(rotY));
      if (rotX) m = multiply(m, rotationX(rotX));
      return multiply(m, translation(-px, -py, -pz));
    }

    _draw(time) {
      const gl = this.gl;
      if (!gl || !this.scene) return;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.uniforms.uViewProjection, false, this.vp);
      gl.uniform3fv(this.uniforms.uEye, this.eye);
      gl.uniform3fv(this.uniforms.uAvatar, [this.avatar.x, 1.32, this.avatar.z]);
      gl.uniform1f(this.uniforms.uFogStart, Math.max(68, (this.cameraDistance || 51) + 22));
      gl.uniform1f(this.uniforms.uTime, time || 0);

      const useCutaway = this.view !== 'first';

      // 1. Opaque architectural base & furniture
      this._render(this.scene, this._identity, 1, 0, 0);

      // 2. Interior tall backdrops & structures (with smart camera-to-avatar occlusion lens)
      if (this.groups.occluders) {
        this._render(this.groups.occluders.mesh, this._identity, 1, 0, useCutaway ? 1 : 0);
      }

      // 3. Emissive stage accents & neon trims
      if (this.groups.emissive) {
        this._render(this.groups.emissive.mesh, this._identity, 1, 0.88, 0);
      }

      // 4. Dynamic Animated 3D Centerpieces
      const t = this.reducedMotion ? 0 : (time || 0);
      if (this.groups.anim_orb) {
        const m = this._pivotTransform(this.groups.anim_orb.pivot, t * 0.8, Math.sin(t * 2.2) * 0.14);
        this._render(this.groups.anim_orb.mesh, m, 1, 0.75, 0);
      }
      if (this.groups.anim_ring) {
        const m = this._pivotTransform(this.groups.anim_ring.pivot, t * 0.48, Math.sin(t * 1.4) * 0.05, Math.sin(t * 0.9) * 0.06);
        this._render(this.groups.anim_ring.mesh, m, 1, 0.35, 0);
      }
      if (this.groups.anim_taxi) {
        const m = this._pivotTransform(this.groups.anim_taxi.pivot, 0, Math.sin(t * 2.5) * 0.06);
        this._render(this.groups.anim_taxi.mesh, m, 1, 0.8, 0);
      }
      if (this.groups.anim_japan) {
        const m = this._pivotTransform(this.groups.anim_japan.pivot, t * 0.22, Math.sin(t * 1.8) * 0.09);
        this._render(this.groups.anim_japan.mesh, m, 1, 0.65, 0);
      }
      if (this.groups.anim_usa) {
        const m = this._pivotTransform(this.groups.anim_usa.pivot, 0, Math.sin(t * 3.4) * 0.08);
        this._render(this.groups.anim_usa.mesh, m, 1, 0.9, 0);
      }
      if (this.groups.anim_elite) {
        const m = this._pivotTransform(this.groups.anim_elite.pivot, -t * 0.75, Math.sin(t * 2.0) * 0.07);
        this._render(this.groups.anim_elite.mesh, m, 1, 0.75, 0);
      }
      if (this.groups.anim_aimc) {
        const m = this._pivotTransform(this.groups.anim_aimc.pivot, 0, Math.sin(t * 2.1) * 0.06);
        this._render(this.groups.anim_aimc.mesh, m, 1, 0.85, 0);
      }
      if (this.groups.anim_arcade) {
        const m = this._pivotTransform(this.groups.anim_arcade.pivot, 0, Math.sin(t * 3.0) * 0.10);
        this._render(this.groups.anim_arcade.mesh, m, 1, 0.95, 0);
      }

      // 5. Interactive Zone Floor Rings
      if (this.parts?.zoneRing) {
        for (const z of this.zones) {
          const isCurrent = this.zone === z.id;
          const pulse = isCurrent && !this.reducedMotion ? 1 + Math.sin(t * 4.5) * 0.08 : 1;
          const m = multiply(translation(z.x, 0, z.z), scaling(pulse, 1, pulse));
          this._render(this.parts.zoneRing, m, isCurrent ? 0.92 : 0.38, 1, 0);
        }
      }

      // 6. Solid exterior walls (those with alpha >= 0.98)
      const wallPairs = [
        ['wall_front', this.wallAlpha.front],
        ['wall_back', this.wallAlpha.back],
        ['wall_left', this.wallAlpha.left],
        ['wall_right', this.wallAlpha.right]
      ];
      for (const [name, alpha] of wallPairs) {
        if (this.groups[name] && alpha >= 0.98) {
          this._render(this.groups[name].mesh, this._identity, 1, 0, useCutaway ? 1 : 0);
        }
      }
      if (this.roof && this.wallAlpha.roof >= 0.98) {
        this._render(this.roof, this._identity, 1, 0, 0);
      }

      // 7. Avatar & Navigation Markers (in TPP / Overview)
      if (this.view !== 'first') {
        this._drawAvatarAndPath(t);
      }

      // 8. Translucent / Cutaway exterior walls & roof (drawn with depthMask(false) so avatar inside is crystal clear)
      gl.depthMask(false);
      for (const [name, alpha] of wallPairs) {
        if (this.groups[name] && alpha < 0.98 && alpha > 0.02) {
          this._render(this.groups[name].mesh, this._identity, alpha, 0, 1);
        }
      }
      if (this.roof && this.wallAlpha.roof < 0.98 && this.wallAlpha.roof > 0.02) {
        this._render(this.roof, this._identity, this.wallAlpha.roof, 0, 0);
      }
      gl.depthMask(true);
    }

    _drawAvatarAndPath(t) {
      const gl = this.gl;
      const a = this.avatar, p = this.parts;
      const base = multiply(
        multiply(translation(a.x, 0, a.z), rotationY(a.yaw)),
        rotationZ(a.bank || 0)
      );

      // Ground shadow & dual-ring aura
      this._render(p.shadow, translation(a.x, 0, a.z), .32, 1, 0);
      const haloScale = this.reducedMotion ? 1 : 1 + Math.sin(t * 3.2) * 0.035;
      this._render(p.halo, multiply(translation(a.x, 0, a.z), scaling(haloScale, 1, haloScale)), .92, 1, 0);

      // Active path breadcrumbs & animated target ripple
      if (this.target) {
        const ripple = this.reducedMotion ? 1 : 1 + Math.sin(t * 5.0) * 0.14;
        this._render(
          p.target,
          multiply(translation(this.target.x, 0, this.target.z), scaling(ripple, 1, ripple)),
          .86, 1, 0
        );
        for (const wp of this.waypoints) {
          this._render(p.waypointDot, translation(wp.x, 0, wp.z), .62, 1, 0);
        }
      }

      const swing = this.reducedMotion ? 0 : Math.sin(a.phase) * .52 * a.gait;
      const bounce = this.reducedMotion ? 0 : Math.abs(Math.sin(a.phase)) * .052 * a.gait;
      const breathe = this.reducedMotion ? 0 : Math.sin(a.idlePhase || 0) * .016 * (1 - a.gait);
      const torsoTwist = this.reducedMotion ? 0 : Math.cos(a.phase) * .08 * a.gait;
      const idleLook = this.reducedMotion ? 0 : Math.sin((a.idlePhase || 0) * 0.6) * .09 * (1 - a.gait);

      const bodyBase = multiply(base, translation(0, bounce + breathe, 0));
      const torsoBase = multiply(bodyBase, rotationY(torsoTwist));
      const headBase = multiply(bodyBase, rotationY(idleLook));

      const drawCharacterParts = (unlitMode, alphaVal) => {
        const place = (mesh, parent, x, y, z) =>
          this._render(mesh, multiply(parent, translation(x, y, z)), alphaVal, unlitMode, 0);

        place(p.hips, bodyBase, 0, 1.02, 0);
        place(p.body, torsoBase, 0, 1.42, 0);
        place(p.neck, headBase, 0, 1.83, 0);
        place(p.head, headBase, 0, 2.035, 0);
        place(p.hair, headBase, 0, 2.13, -.045);
        place(p.cap, headBase, 0, 2.19, .02);
        if (unlitMode < 1.5) {
          place(p.headset, headBase, -.23, 2.04, 0);
          place(p.headset, headBase, .23, 2.04, 0);
          place(p.lanyard, torsoBase, -.048, 1.58, .183);
          place(p.lanyard, torsoBase, .048, 1.58, .183);
          place(p.badge, torsoBase, 0, 1.37, .188);
        }
        [-1, 1].forEach(side => {
          const leg = multiply(multiply(base, translation(side * .14, .97, 0)), rotationX(swing * side));
          this._render(p.leg, leg, alphaVal, unlitMode, 0);
          this._render(p.shoe, leg, alphaVal, unlitMode, 0);
          const idleArm = Math.sin((a.idlePhase || 0) + side) * 0.03 * (1 - a.gait);
          const arm = multiply(
            multiply(torsoBase, translation(side * .35, 1.72, 0)),
            rotationX(-swing * side * .82 - .07 + idleArm)
          );
          this._render(p.arm, arm, alphaVal, unlitMode, 0);
          this._render(p.hand, arm, alphaVal, unlitMode, 0);
        });
      };

      // Pass A: X-Ray Silhouette Pass (renders ONLY where avatar is occluded behind any wall/object!)
      gl.depthFunc(gl.GREATER);
      gl.depthMask(false);
      drawCharacterParts(2.0, 0.85);

      // Pass B: Normal Lit Pass (renders where avatar is visible)
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      drawCharacterParts(0.0, 1.0);
    }

    destroy() {
      this.stop();
      this._listeners.forEach(remove => remove());
      this.observer?.disconnect();
      if (this.gl) {
        this.meshes.forEach(mesh => this.gl.deleteBuffer(mesh.buffer));
        this.gl.deleteProgram(this.program);
      }
    }
  }

  window.ATJEngine = ATJEngine;
})();
