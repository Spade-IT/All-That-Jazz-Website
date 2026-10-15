/* ATJ WORLD · an original, dependency-free WebGL scene and walking controller. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
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
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const multiply = (a, b) => {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  };
  const translation = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
  const rotationY = a => {
    const s = Math.sin(a), c = Math.cos(a);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  };
  const rotationX = a => {
    const s = Math.sin(a), c = Math.cos(a);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  };
  const perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  };
  const lookAt = (eye, target) => {
    const z = normalize(eye.map((v, i) => v - target[i]));
    const x = normalize(cross([0, 1, 0], z));
    const y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  };
  const inverse = m => {
    const a = Array.from({ length: 4 }, (_, r) => Array.from({ length: 8 }, (_, c) => c < 4 ? m[c * 4 + r] : +(c - 4 === r)));
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
    for (let r = 0; r < 4; r++) out[r] = m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * (v[3] === undefined ? 1 : v[3]);
    return out;
  };

  class Geometry {
    constructor() { this.data = []; }
    vertex(p, normal, color) { this.data.push(...p, ...normal, ...color); }
    tri(a, b, c, normal, color) {
      this.vertex(a, normal, color); this.vertex(b, normal, color); this.vertex(c, normal, color);
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
        this.tri(p[0], p[1], p[2], n, c); this.tri(p[0], p[2], p[3], n, c);
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
        this.tri(start, b, a, axis.map(n => -n), c); this.tri(end, d, e, axis, c);
      }
    }
    sphere(x, y, z, radius, color, segments = 12) {
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
        this.tri([x, y, z], [x + Math.sin(a) * radius, y, z + Math.cos(a) * radius], [x + Math.sin(b) * radius, y, z + Math.cos(b) * radius], n, c);
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
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vPosition;
    uniform vec3 uEye;
    uniform float uAlpha;
    uniform float uUnlit;
    uniform float uFogStart;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 lightDir = normalize(vec3(-0.55, 1.0, 0.5));
      float key = max(dot(n, lightDir), 0.0);
      float fill = max(dot(n, normalize(vec3(0.8, 0.4, -0.7))), 0.0);
      float hemi = n.y * 0.5 + 0.5;
      vec3 lighting = vec3(0.37, 0.35, 0.43) + vec3(0.37, 0.34, 0.28) * key + vec3(0.12, 0.09, 0.18) * fill + vec3(0.23, 0.23, 0.25) * hemi;
      vec3 color = vColor * mix(lighting, vec3(1.0), uUnlit);
      float fog = smoothstep(uFogStart, uFogStart + 90.0, length(uEye - vPosition)) * 0.75;
      color = mix(color, vec3(0.065, 0.06, 0.085), fog);
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
      this.avatar = { x: 0, z: 8, yaw: Math.PI, moving: false, phase: 0, gait: 0 };
      this.camera = { x: 31, y: 33, z: 40, tx: 0, ty: .5, tz: 0, angle: .57, elevation: .68, zoom: 1 };
      this.eye = [31, 33, 40];
      this.vp = ident();
      this.inverseVP = ident();
      this.width = 1;
      this.height = 1;
      this.lastTime = 0;
      this.lastCallback = 0;
      this.frame = 0;
      this.meshes = [];
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
        this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }) || this.canvas.getContext('experimental-webgl');
        if (!this.gl) throw new Error('Your browser could not open the 3D experience. The project index is still available.');
        const gl = this.gl;
        const compile = (type, source) => {
          const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
          return shader;
        };
        const vs = compile(gl.VERTEX_SHADER, vertexShader), fs = compile(gl.FRAGMENT_SHADER, fragmentShader);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs); gl.attachShader(this.program, fs); gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program) || 'The 3D renderer could not start');
        gl.deleteShader(vs); gl.deleteShader(fs);
        gl.useProgram(this.program);
        this.attributes = Object.fromEntries(['aPosition', 'aNormal', 'aColor'].map(n => [n, gl.getAttribLocation(this.program, n)]));
        this.uniforms = Object.fromEntries(['uViewProjection', 'uModel', 'uEye', 'uAlpha', 'uUnlit', 'uFogStart'].map(n => [n, gl.getUniformLocation(this.program, n)]));
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        this._emit('onReady', .22, 'Building the exhibition halls');
        await nextTask();
        const geometry = new Geometry();
        const api = Object.fromEntries(['box', 'cylinder', 'sphere', 'beam', 'disc'].map(name => [name, (...args) => geometry[name](...args)]));
        const factory = worldFactory || window.ATJWorld;
        const world = await (typeof factory === 'function' ? factory(api) : factory.build(api));
        this.zones = world?.zones || [];
        this.bounds = { ...this.bounds, ...world?.bounds };
        if(world.roof){const r=world.roof,g=new Geometry();g.box(r.x,r.y,r.z,r.w,r.h,r.d,r.color);this.roof=this._mesh(g);}
        if (world?.spawn) Object.assign(this.avatar, world.spawn);
        this._emit('onReady', .56, 'Lighting the stages');
        await nextTask();
        this.scene = this._mesh(geometry);
        geometry.data = [];
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
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const mesh = { buffer, count: data.length / 9 };
      this.meshes.push(mesh);
      return mesh;
    }

    _part(method, ...args) {
      const geometry = new Geometry(); geometry[method](...args); return this._mesh(geometry);
    }

    _createAvatar() {
      this.parts = {
        body: this._part('box', 0, 0, 0, .56, .67, .34, '#252136'),
        hips: this._part('box', 0, 0, 0, .45, .22, .31, '#343044'),
        head: this._part('sphere', 0, 0, 0, .23, '#efb390', 16),
        hair: this._part('sphere', 0, 0, 0, .235, '#252034', 12),
        cap: this._part('box', 0, 0, .04, .47, .09, .52, '#252034'),
        neck: this._part('cylinder', 0, 0, 0, .095, .16, '#efb390', 10),
        leg: this._part('cylinder', 0, -.4, 0, .105, .8, '#302b40', 12),
        shoe: this._part('box', 0, -.83, .065, .22, .13, .35, '#f1f0e9'),
        arm: this._part('cylinder', 0, -.28, 0, .075, .57, '#252136', 10),
        hand: this._part('sphere', 0, -.615, 0, .083, '#efb390', 10),
        badge: this._part('box', 0, 0, 0, .13, .17, .026, '#d6f777'),
        headset: this._part('sphere', 0, 0, 0, .077, '#d6f777', 10),
        lanyard: this._part('box', 0, 0, 0, .032, .26, .023, '#c6b4ef'),
        shadow: this._part('disc', 0, .04, 0, .53, '#282131'),
        halo: (() => { const g = new Geometry(); g.ring(0, .047, 0, .72, .8, '#d9f785'); return this._mesh(g); })(),
        target: (() => { const g = new Geometry(); g.ring(0, .056, 0, .33, .41, '#b7a0ed'); return this._mesh(g); })()
      };
    }

    _listen(target, event, fn, options) {
      target.addEventListener(event, fn, options); this._listeners.push(() => target.removeEventListener(event, fn, options));
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
        e.preventDefault(); this.keys.add(e.key.toLowerCase()); this.autoTour = false; this.target = null; this.waypoints = [];
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
          this.camera.elevation = clamp(this.camera.elevation + dy * .003, this.view==='first'?-.85:.34, this.view==='first'?.85:1.12);
        }
        p.lastX = e.clientX; p.lastY = e.clientY;
      });
      this._listen(canvas, 'pointerup', e => {
        const p = this.pointer;
        if (!p || p.id !== e.pointerId) return;
        if (!p.moved && this.keysEnabled) {
          const hit = this._groundPoint(e.clientX, e.clientY);
          if (hit) this.setTarget(hit.x, hit.z);
        }
        this.pointer = null; canvas.style.cursor = 'grab';
        if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      });
      this._listen(canvas, 'pointercancel', () => { this.pointer = null; canvas.style.cursor = 'grab'; });
      this._listen(canvas, 'wheel', e => {
        if (!this.keysEnabled) return;
        e.preventDefault(); this.camera.zoom = clamp(this.camera.zoom * Math.exp(e.deltaY * .0008), .56, 1.4);
      }, { passive: false });
      this._listen(window, 'resize', () => this.resize());
      this._listen(canvas, 'webglcontextlost', e => {
        e.preventDefault(); this.stop(); this._emit('onError', 'The 3D view was interrupted. You can still explore the project index, or reload to return to the venue.');
      });
      if (window.ResizeObserver) {
        this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
      }
      canvas.style.cursor = 'grab';
    }

    _groundPoint(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width * 2 - 1;
      const y = 1 - (clientY - rect.top) / rect.height * 2;
      const a = transform(this.inverseVP, [x, y, -1, 1]), b = transform(this.inverseVP, [x, y, 1, 1]);
      const near = a.slice(0, 3).map(v => v / a[3]), far = b.slice(0, 3).map(v => v / b[3]);
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
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.gl.viewport(0, 0, w, h);
      this._updateCamera(0, false);
      if (this.ready && !this.running) this._draw(0);
    }

    start() {
      if (!this.ready || this.running || this.failed) return;
      this.running = true; this.lastTime = 0;
      if (this.keysEnabled && (!document.activeElement || document.activeElement === document.body)) this.canvas.focus({ preventScroll: true });
      this.frame = requestAnimationFrame(this._boundFrame);
    }

    stop() {
      this.running = false; cancelAnimationFrame(this.frame); this.keys.clear(); this.lastTime = 0;
    }

    setTarget(x, z) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      this.autoTour = false;
      this.waypoints = this._safePath(this.avatar, this._clampPoint({ x, z }));
      this.target = this.waypoints.shift() || null;
      this.keys.clear();
    }

    _clampPoint(p) {
      const point = { x: clamp(p.x, this.bounds.minX + .5, this.bounds.maxX - .5), z: clamp(p.z, this.bounds.minZ + .5, this.bounds.maxZ - .5) };
      for(const wall of [
        {minX:-19.5,maxX:-18.65,minZ:-16.1,maxZ:12.95},
        {minX:18.65,maxX:19.5,minZ:-16.1,maxZ:12.95},
        {minX:-19.5,maxX:19.5,minZ:-16.2,maxZ:-15.45},
        {minX:-19.5,maxX:-2.72,minZ:12.22,maxZ:12.98},
        {minX:2.72,maxX:19.5,minZ:12.22,maxZ:12.98}
      ]){
        if(point.x>wall.minX&&point.x<wall.maxX&&point.z>wall.minZ&&point.z<wall.maxZ){
          const a=this.avatar;
          if(a.z<=wall.minZ)point.z=wall.minZ-.01;
          else if(a.z>=wall.maxZ)point.z=wall.maxZ+.01;
          else if(a.x<=wall.minX)point.x=wall.minX-.01;
          else point.x=wall.maxX+.01;
        }
      }
      const obstacle = this.welcomeObstacle;
      if (point.x > obstacle.minX && point.x < obstacle.maxX && point.z > obstacle.minZ && point.z < obstacle.maxZ) {
        // Keep both floor clicks and manual walking outside the sculpture.
        const edges = [
          { d: point.x - obstacle.minX, x: obstacle.minX - .04, z: point.z },
          { d: obstacle.maxX - point.x, x: obstacle.maxX + .04, z: point.z },
          { d: point.z - obstacle.minZ, x: point.x, z: obstacle.minZ - .04 },
          { d: obstacle.maxZ - point.z, x: point.x, z: obstacle.maxZ + .04 }
        ].sort((a, b) => a.d - b.d);
        point.x = edges[0].x; point.z = edges[0].z;
      }
      return point;
    }

    setKeys(enabled) {
      this.keysEnabled = !!enabled;
      if (!enabled) {
        this.keys.clear(); this.avatar.moving = false;
        if (this.pointer && this.canvas.hasPointerCapture?.(this.pointer.id)) this.canvas.releasePointerCapture(this.pointer.id);
        this.pointer = null;
        this.canvas.style.cursor = 'grab';
      }
    }

    setView(view) {
      this.view = ['follow','first','overview'].includes(view) ? view : 'follow';
      if(view==='first')this.camera.elevation=0;else if(this.camera.elevation<.34)this.camera.elevation=.5;
      this._updateCamera(1,true);
      this.camera.zoom = 1;
    }

    setAutoTour(enabled) {
      this.autoTour = !!enabled;
      this.keys.clear();
      this.tourWait = 0;
      if (this.autoTour && this.zones.length) {
        const nearest = this.zones.reduce((best, z, i) => distance(z, this.avatar) < best.d ? { d: distance(z, this.avatar), i } : best, { d: Infinity, i: 0 });
        this.tourIndex = nearest.i;
        this._routeToZone(this.zones[this.tourIndex]);
      } else { this.target = null; this.waypoints = []; }
      this._emit('onMove', this.getState());
    }

    goToZone(id) {
      const zone = this.zones.find(item => item.id === id);
      if (zone) { this.autoTour = false; this.keys.clear(); this._routeToZone(zone); }
    }

    _routeToZone(zone) {
      const destination = this._clampPoint(zone);
      const boulevard = [this._clampPoint({ x: 0, z: this.avatar.z }), this._clampPoint({ x: 0, z: destination.z }), destination];
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
          low = Math.max(low, t0); high = Math.min(high, t1);
          if (low >= high - 1e-7) return false;
        }
      }
      return high > .00001 && low < .99999;
    }

    _safePath(start, goal) {
      if((start.z<12.6)!==(goal.z<12.6)){
        const entry={x:0,z:start.z<12.6?11.7:13.5},exit={x:0,z:start.z<12.6?13.5:11.7};
        return [...this._safePath(start,entry),exit,...this._safePath(exit,goal)];
      }
      if (!this._crossesWelcome(start, goal)) return [goal];
      const o = this.welcomeObstacle, gap = .38;
      const nodes = [start, goal,
        { x: o.minX - gap, z: o.minZ - gap }, { x: o.maxX + gap, z: o.minZ - gap },
        { x: o.maxX + gap, z: o.maxZ + gap }, { x: o.minX - gap, z: o.maxZ + gap }
      ];
      const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
      costs[0] = 0;
      for (let step = 0; step < nodes.length; step++) {
        let current = -1;
        for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
        if (current === 1 || !Number.isFinite(costs[current])) break;
        visited.add(current);
        for (let i = 0; i < nodes.length; i++) {
          if (i === current || visited.has(i) || this._crossesWelcome(nodes[current], nodes[i])) continue;
          const candidate = costs[current] + distance(nodes[current], nodes[i]);
          if (candidate < costs[i]) { costs[i] = candidate; previous[i] = current; }
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
      return { x: a.x, z: a.z, yaw: a.yaw, moving: a.moving, zone: this.zone, tour: this.autoTour, view: this.view, target: this.target ? { ...this.target } : null, ready: this.ready, zones: this.zones, bounds: this.bounds };
    }

    projectPoint(x, y, z) {
      const p = transform(this.vp, [x, y, z, 1]);
      const nx = p[0] / p[3], ny = p[1] / p[3], nz = p[2] / p[3];
      return { x: (nx + 1) * this.width / 2, y: (1 - ny) * this.height / 2, visible: p[3] > 0 && nz > -1 && nz < 1 && Math.abs(nx) < 1.08 && Math.abs(ny) < 1.08 };
    }

    _tick(time) {
      if (!this.running) return;
      const dt = this.lastTime ? clamp((time - this.lastTime) / 1000, 0, .04) : 0;
      this.lastTime = time;
      this._updateMovement(dt);
      this._updateCamera(dt, false);
      this._draw(time / 1000);
      if (time - this.lastCallback > 70) { this._emit('onMove', this.getState()); this.lastCallback = time; }
      this.frame = requestAnimationFrame(this._boundFrame);
    }

    _updateMovement(dt) {
      const a = this.avatar;
      let dx = 0, dz = 0;
      if (this.keysEnabled) {
        const forward = +(this.keys.has('w') || this.keys.has('arrowup')) - +(this.keys.has('s') || this.keys.has('arrowdown'));
        const right = +(this.keys.has('d') || this.keys.has('arrowright')) - +(this.keys.has('a') || this.keys.has('arrowleft'));
        if (forward || right) {
          this.autoTour = false; this.target = null; this.waypoints = [];
          const angle = this.camera.angle;
          dx = -Math.sin(angle) * forward + Math.cos(angle) * right;
          dz = -Math.cos(angle) * forward - Math.sin(angle) * right;
        } else if (this.target) {
          const dist = distance(this.target, a);
          if (dist > .11) { dx = this.target.x - a.x; dz = this.target.z - a.z; }
          else {
            this.target = this.waypoints.shift() || null;
            if (this.autoTour && !this.target) this.tourWait = 5;
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
      if (a.moving) {
        const speed = this.autoTour ? 3.6 : 4.8;
        const step = Math.min(speed * dt, this.target ? length : Infinity);
        const p = this._clampPoint({ x: a.x + dx / length * step, z: a.z + dz / length * step });
        a.x = p.x; a.z = p.z;
        const desiredYaw = Math.atan2(dx, dz);
        const delta = Math.atan2(Math.sin(desiredYaw - a.yaw), Math.cos(desiredYaw - a.yaw));
        a.yaw += delta * Math.min(1, dt * 12);
        a.phase += dt * 11.5;
      }
      a.gait = lerp(a.gait, a.moving ? 1 : 0, Math.min(1, dt * 10));
      const nearest = this.zones.reduce((best, item) => {
        const d = distance(item, a); return d < best.d ? { item, d } : best;
      }, { item: null, d: Infinity });
      const newZone = nearest.d < 4 ? nearest.item.id : null;
      if (newZone !== this.zone) { this.zone = newZone; this._emit('onZone', newZone); }
    }

    _updateCamera(dt, snap) {
      const a = this.avatar, c = this.camera;
      if(this.view==='first'){
        const pitch=c.elevation;
        this.eye=[a.x,2.05,a.z];this.cameraDistance=0;
        const aim=[a.x-Math.sin(c.angle)*Math.cos(pitch),2.05-Math.sin(pitch),a.z-Math.cos(c.angle)*Math.cos(pitch)];
        this.vp=multiply(perspective(68*Math.PI/180,this.width/this.height,.06,400),lookAt(this.eye,aim));
        this.inverseVP=inverse(this.vp);return;
      }
      const follow = this.view === 'follow';
      const tx = follow ? a.x : (this.bounds.minX + this.bounds.maxX) / 2;
      const tz = follow ? a.z : (this.bounds.minZ + this.bounds.maxZ) / 2;
      const ty = follow ? 1.1 : 1;
      const inside=Math.abs(a.x)<18.7&&a.z<12.6;
      const radius = (follow ? (inside?6:10) : this._overviewDistance(tx, ty, tz)) * c.zoom;
      this.cameraDistance = radius;
      const factor = snap || this.reducedMotion ? 1 : 1 - Math.exp(-dt * (follow ? 3.4 : 2.5));
      c.tx = lerp(c.tx, tx, factor); c.ty = lerp(c.ty, ty, factor); c.tz = lerp(c.tz, tz, factor);
      const flat = radius * Math.cos(c.elevation);
      c.x = lerp(c.x, c.tx + Math.sin(c.angle) * flat, factor);
      c.y = lerp(c.y, c.ty + Math.sin(c.elevation) * radius, factor);
      c.z = lerp(c.z, c.tz + Math.cos(c.angle) * flat, factor);
      if(follow&&inside){c.x=clamp(c.x,-18.5,18.5);c.z=clamp(c.z,-15.3,12.1);c.y=Math.min(c.y,5.85);}
      this.eye = [c.x, c.y, c.z];
      const view = lookAt(this.eye, [c.tx, c.ty, c.tz]);
      const projection = perspective(43 * Math.PI / 180, this.width / this.height, .15, 400);
      this.vp = multiply(projection, view);
      this.inverseVP = inverse(this.vp);
    }

    _overviewDistance(tx, ty, tz) {
      const c = this.camera, bounds = this.bounds;
      const tanV = Math.tan(43 * Math.PI / 360), tanH = tanV * this.width / this.height;
      const sa = Math.sin(c.angle), ca = Math.cos(c.angle), se = Math.sin(c.elevation), ce = Math.cos(c.elevation);
      let radius = 45;
      // Fit the complete raised island, its tallest pavilion and a breathing
      // margin. This is especially important for a narrow portrait viewport.
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

    _render(mesh, model = this._identity, alpha = 1, unlit = 0) {
      if (!mesh) return;
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      const names = ['aPosition', 'aNormal', 'aColor'];
      names.forEach((name, i) => {
        const location = this.attributes[name]; gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, i * 12);
      });
      gl.uniformMatrix4fv(this.uniforms.uModel, false, model);
      gl.uniform1f(this.uniforms.uAlpha, alpha);
      gl.uniform1f(this.uniforms.uUnlit, unlit);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }

    _draw(time) {
      const gl = this.gl;
      if (!gl || !this.scene) return;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.uniforms.uViewProjection, false, this.vp);
      gl.uniform3fv(this.uniforms.uEye, this.eye);
      gl.uniform1f(this.uniforms.uFogStart, Math.max(68, (this.cameraDistance || 51) + 22));
      this._render(this.scene);
      const inside=Math.abs(this.avatar.x)<18.7&&this.avatar.z<12.6;
      if(this.roof&&this.view!=='overview'&&!inside)this._render(this.roof);
      if(this.view==='first')return;
      const a = this.avatar, p = this.parts;
      const base = multiply(translation(a.x, 0, a.z), rotationY(a.yaw));
      this._render(p.shadow, base, .30, 1);
      this._render(p.halo, base, .95, 1);
      if (this.target) this._render(p.target, translation(this.target.x, 0, this.target.z), .75, 1);
      const swing = this.reducedMotion ? 0 : Math.sin(a.phase) * .48 * a.gait;
      const bounce = this.reducedMotion ? 0 : Math.abs(Math.sin(a.phase)) * .045 * a.gait;
      const bodyBase = multiply(base, translation(0, bounce, 0));
      const place = (mesh, x, y, z) => this._render(mesh, multiply(bodyBase, translation(x, y, z)));
      place(p.hips, 0, 1.02, 0);
      place(p.body, 0, 1.42, 0);
      place(p.neck, 0, 1.83, 0);
      place(p.head, 0, 2.035, 0);
      place(p.hair, 0, 2.13, -.045);
      place(p.cap, 0, 2.19, .02);
      place(p.headset, -.23, 2.04, 0);
      place(p.headset, .23, 2.04, 0);
      place(p.lanyard, -.048, 1.58, .183);
      place(p.lanyard, .048, 1.58, .183);
      place(p.badge, 0, 1.37, .187);
      [-1, 1].forEach(side => {
        const leg = multiply(multiply(base, translation(side * .14, .97, 0)), rotationX(swing * side));
        this._render(p.leg, leg); this._render(p.shoe, leg);
        const arm = multiply(multiply(bodyBase, translation(side * .35, 1.72, 0)), rotationX(-swing * side * .8 - .07));
        this._render(p.arm, arm); this._render(p.hand, arm);
      });
    }

    destroy() {
      this.stop(); this._listeners.forEach(remove => remove()); this.observer?.disconnect();
      if (this.gl) { this.meshes.forEach(mesh => this.gl.deleteBuffer(mesh.buffer)); this.gl.deleteProgram(this.program); }
    }
  }

  window.ATJEngine = ATJEngine;
})();
