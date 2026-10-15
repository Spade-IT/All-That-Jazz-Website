/* Space War V3 — upgraded local arcade with particle explosions, thruster glow, and parallax stars. */
(() => {
  'use strict';
  class SpaceWar {
    constructor(root) {
      this.root = root;
      root.innerHTML = `<section class="space-game" tabindex="0" aria-label="Space War game"><div class="space-head"><h2>Space War</h2><span class="space-score" aria-live="polite">Score 0 · Lives 3</span></div><canvas width="480" height="420" aria-label="Space War playfield"></canvas><p class="space-status" role="status">Defend the experience. Destroy the incoming ships.</p><div class="space-controls"><button data-action="left" aria-label="Move ship left">←</button><button data-action="fire">FIRE</button><button data-action="right" aria-label="Move ship right">→</button><button data-action="pause">Pause</button><button data-action="reset">Restart</button></div><p>← → or A / D to move · Space to fire · P to pause. Touch controls work too.</p></section>`;
      this.element = root.firstElementChild;
      this.canvas = root.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.keys = new Set();
      this.running = false;
      this.particles = [];
      this.starOffset = 0;
      this.reset();
      this.element.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'p'].includes(k)) {
          e.preventDefault();
          if (k === 'p' && !e.repeat) {
            this.running ? this.pause() : this.resume();
            return;
          }
          this.keys.add(k);
        }
      });
      this.element.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
      this.element.addEventListener('blur', () => this.keys.clear());
      root.querySelectorAll('[data-action]').forEach(b => {
        const k = { left: 'a', right: 'd', fire: ' ' }[b.dataset.action];
        if (k) {
          b.addEventListener('pointerdown', e => {
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
            this.keys.add(k);
            this.element.focus();
          });
          ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t =>
            b.addEventListener(t, () => this.keys.delete(k))
          );
        } else {
          b.addEventListener('click', () => {
            if (b.dataset.action === 'reset') {
              this.reset();
              this.resume();
            } else {
              this.running ? this.pause() : this.resume();
            }
            this.element.focus();
          });
        }
      });
      window.addEventListener('blur', () => this.pause());
    }
    reset() {
      this.x = 240;
      this.lives = 3;
      this.score = 0;
      this.wave = 1;
      this.bullets = [];
      this.enemies = [];
      this.particles = [];
      this.cooldown = 0;
      this.spawnTimer = 0;
      this.invincible = 0;
      this.over = false;
      this.keys.clear();
      this.status('Defend the experience. Destroy the incoming ships.');
      this.draw();
    }
    status(s) {
      const node = this.root?.querySelector('.space-status');
      if (node) node.textContent = s;
    }
    pause() {
      this.running = false;
      cancelAnimationFrame(this.frame);
      this.keys.clear();
      if (!this.over) this.status('Paused · press Resume or P to continue.');
      const btn = this.root?.querySelector('[data-action="pause"]');
      if (btn) btn.textContent = 'Resume';
    }
    resume() {
      if (this.running || this.over) return;
      this.running = true;
      this.last = 0;
      this.status('Defend the experience. Destroy the incoming ships.');
      const btn = this.root?.querySelector('[data-action="pause"]');
      if (btn) btn.textContent = 'Pause';
      this.frame = requestAnimationFrame(t => this.tick(t));
    }
    tick(t) {
      if (!this.running) return;
      const dt = this.last ? Math.min((t - this.last) / 1000, .04) : 0;
      this.last = t;
      this.update(dt);
      this.draw();
      if (this.running) this.frame = requestAnimationFrame(t => this.tick(t));
    }
    _burst(x, y, color) {
      if (!Array.isArray(this.particles)) this.particles = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 45 + Math.random() * 95;
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.38, maxLife: 0.38, color });
      }
    }
    update(dt) {
      this.starOffset = ((this.starOffset || 0) + dt * 36) % 420;
      this.x = Math.max(
        18,
        Math.min(
          462,
          this.x + ((this.keys.has('d') || this.keys.has('arrowright')) - (this.keys.has('a') || this.keys.has('arrowleft'))) * 280 * dt
        )
      );
      this.cooldown -= dt;
      this.spawnTimer -= dt;
      this.invincible -= dt;
      if (this.keys.has(' ') && this.cooldown <= 0) {
        this.bullets.push({ x: this.x, y: 365 });
        this.cooldown = .16;
      }
      this.wave = 1 + Math.floor(this.score / 100);
      if (this.spawnTimer <= 0) {
        this.enemies.push({ x: 22 + Math.random() * 436, y: -15, v: 55 + this.wave * 10 });
        this.spawnTimer = Math.max(.22, 1 - this.wave * .075);
      }
      this.bullets.forEach(b => (b.y -= 430 * dt));
      this.enemies.forEach(e => (e.y += e.v * dt));
      for (const e of this.enemies) {
        for (const b of this.bullets) {
          if (!e.dead && !b.dead && Math.abs(e.x - b.x) < 19 && Math.abs(e.y - b.y) < 18) {
            e.dead = true;
            b.dead = true;
            this.score += 10;
            this._burst(e.x, e.y, '#c9ed6b');
          }
        }
        if (!e.dead && (e.y > 430 || (Math.abs(e.x - this.x) < 27 && Math.abs(e.y - 385) < 23))) {
          e.dead = true;
          this._burst(e.x, Math.min(410, e.y), '#efb0c8');
          if (this.invincible <= 0) {
            this.lives--;
            this.invincible = .5;
          }
        }
      }
      this.bullets = this.bullets.filter(b => !b.dead && b.y > -20);
      this.enemies = this.enemies.filter(e => !e.dead);
      if (Array.isArray(this.particles)) {
        this.particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
      }
      if (this.lives <= 0) {
        this.over = true;
        this.pause();
        let best = 0;
        try {
          best = Math.max(this.score, Number(localStorage.getItem('atj-space-best')) || 0);
          localStorage.setItem('atj-space-best', String(best));
        } catch (_) {}
        this.status(`Game over · Score ${this.score} · Best ${best}. Restart to play again.`);
      }
    }
    draw() {
      const c = this.ctx;
      if (!c) return;
      const grad = c.createLinearGradient(0, 0, 0, 420);
      grad.addColorStop(0, '#090c18');
      grad.addColorStop(1, '#12172c');
      c.fillStyle = grad;
      c.fillRect(0, 0, 480, 420);

      // Parallax starfield
      const off = this.starOffset || 0;
      for (let i = 0; i < 75; i++) {
        const sx = (i * 137) % 480;
        const sy = ((i * 71) + off * (i % 3 === 0 ? 1.4 : 0.7)) % 420;
        c.fillStyle = i % 5 === 0 ? '#bea9ff' : '#7786a7';
        const sz = i % 4 === 0 ? 2 : 1.2;
        c.fillRect(sx, sy, sz, sz);
      }

      // Horizon defense line
      c.strokeStyle = '#2d3753';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 350);
      c.lineTo(480, 350);
      c.stroke();

      // Particle bursts
      if (Array.isArray(this.particles)) {
        for (const p of this.particles) {
          c.globalAlpha = Math.max(0, p.life / p.maxLife);
          c.fillStyle = p.color;
          c.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        c.globalAlpha = 1;
      }

      // Player ship + thruster glow
      if (this.invincible > 0) {
        c.strokeStyle = 'rgba(201, 237, 107, 0.55)';
        c.beginPath();
        c.arc(this.x, 384, 24, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = this.invincible > 0 ? '#fff' : '#c9ed6b';
      c.beginPath();
      c.moveTo(this.x, 361);
      c.lineTo(this.x - 19, 400);
      c.lineTo(this.x, 391);
      c.lineTo(this.x + 19, 400);
      c.closePath();
      c.fill();
      c.fillStyle = '#91d5cb';
      c.fillRect(this.x - 4, 397, 8, 12);

      // Laser bolts
      c.fillStyle = '#deff88';
      this.bullets.forEach(b => {
        c.fillRect(b.x - 2, b.y - 7, 4, 15);
      });

      // Enemy ships
      for (const e of this.enemies) {
        c.fillStyle = '#bea9ff';
        c.beginPath();
        c.moveTo(e.x, e.y + 15);
        c.lineTo(e.x - 18, e.y - 10);
        c.lineTo(e.x, e.y - 5);
        c.lineTo(e.x + 18, e.y - 10);
        c.closePath();
        c.fill();
        c.fillStyle = '#efb0c8';
        c.fillRect(e.x - 4, e.y - 7, 8, 8);
      }

      const scoreNode = this.root?.querySelector('.space-score');
      if (scoreNode) {
        scoreNode.textContent = `Score ${this.score} · Lives ${Math.max(0, this.lives)} · Wave ${this.wave}`;
      }
      if (this.over) {
        c.fillStyle = '#0c101ee6';
        c.fillRect(0, 150, 480, 100);
        c.fillStyle = '#c9ed6b';
        c.font = 'bold 28px Arial';
        c.textAlign = 'center';
        c.fillText('GAME OVER', 240, 202);
        c.fillStyle = '#aeb8cc';
        c.font = '12px Arial';
        c.fillText('Press Restart to defend the stage again', 240, 228);
      }
    }
  }
  window.ATJSpaceWar = SpaceWar;
})();
