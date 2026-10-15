/* ATJ loading-lounge arcade. Original implementation; no dependencies. */
(function () {
  'use strict';

  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]]
  };
  const COLORS = { I:'#bdf263', O:'#fae48b', T:'#c6b4f7', J:'#839cec', L:'#f0a177', S:'#83ceae', Z:'#e695b4' };
  // SRS wall-kick offsets. Y is converted from mathematical to canvas coordinates.
  const KICKS = {
    '0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], '1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]], '2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]], '3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], '0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  };
  const I_KICKS = {
    '0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], '1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], '2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], '3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], '0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  };
  const STORAGE = 'atj-stage-tetris-best-v1';
  const CSS = `
    .atj-tetris{--tt-lime:#c9f27d;--tt-muted:#92938f;color:#eeefe8;font:13px/1.45 Inter,Arial,sans-serif;background:#171916;border:1px solid #34382f;border-radius:20px;padding:22px;box-sizing:border-box;width:100%;max-width:570px;margin:auto;outline:none}
    .atj-tetris *{box-sizing:border-box}.atj-tetris button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}.atj-tetris button:focus-visible{outline:2px solid var(--tt-lime);outline-offset:3px}
    .atj-tetris .tt-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:17px}.atj-tetris .tt-kicker{font-size:9px;letter-spacing:2.2px;color:var(--tt-lime);font-weight:600;text-transform:uppercase;margin:0 0 7px}.atj-tetris h2{font-size:clamp(20px,3.5vw,27px);line-height:1.05;letter-spacing:-1.1px;font-weight:600;margin:0 0 7px}.atj-tetris .tt-subtitle{color:var(--tt-muted);font-size:11px;margin:0}.atj-tetris .tt-close{flex:0 0 31px;height:31px;background:transparent;border:1px solid #42473b;border-radius:50%;font-size:22px;line-height:1;padding:0;color:#c4c6bd}
    .atj-tetris .tt-body{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:19px;max-width:402px;margin:auto}.atj-tetris .tt-board-wrap{position:relative;min-width:0;border:1px solid #383e30;border-radius:8px;background:#0d100c;overflow:hidden;aspect-ratio:1/2;width:100%;max-width:250px}.atj-tetris .tt-board{display:block;width:100%;height:100%;touch-action:none}.atj-tetris .tt-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;background:rgba(12,15,10,.87);backdrop-filter:blur(3px);text-align:center;padding:15px}.atj-tetris .tt-status[hidden]{display:none}.atj-tetris .tt-status strong{font-size:23px;letter-spacing:-.7px}.atj-tetris .tt-status span{font-size:10px;color:#b3b7aa}.atj-tetris .tt-status button{border:0;border-radius:30px;background:var(--tt-lime);color:#14180f;padding:10px 15px;font-size:11px;font-weight:600;margin-top:7px}
    .atj-tetris .tt-sidebar{display:flex;flex-direction:column;gap:18px;padding-top:4px;min-width:0}.atj-tetris .tt-label{display:block;font-size:9px;letter-spacing:1.5px;color:var(--tt-muted);text-transform:uppercase;margin-bottom:5px}.atj-tetris .tt-score{font-size:25px;line-height:1;letter-spacing:-.8px;font-variant-numeric:tabular-nums;color:var(--tt-lime)}.atj-tetris .tt-small-value{font-size:15px;font-variant-numeric:tabular-nums}.atj-tetris .tt-next{display:block;width:88px;height:70px;max-width:100%;margin-left:-3px}.atj-tetris .tt-stats{display:flex;gap:20px}.atj-tetris .tt-buttons{margin-top:auto;display:flex;flex-direction:column;gap:7px}.atj-tetris .tt-button{border:1px solid #434a38;background:transparent;border-radius:20px;padding:9px 10px;text-align:center;font-size:10px}.atj-tetris .tt-button:hover,.atj-tetris .tt-control:hover{background:#303928}.atj-tetris .tt-button-primary{background:#d1c5eb;border-color:#d1c5eb;color:#19161f}.atj-tetris .tt-button-primary:hover{background:#e0d4fa}
    .atj-tetris .tt-controls{display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr;gap:7px;max-width:402px;margin:14px auto 0}.atj-tetris .tt-control{min-height:39px;background:#252b20;border:1px solid #3b4530;border-radius:10px;font-size:16px;user-select:none;-webkit-user-select:none}.atj-tetris .tt-control span{font-size:10px;letter-spacing:.2px}.atj-tetris .tt-help{text-align:center;color:#818a76;font-size:9px;margin:12px 0 0;letter-spacing:.1px}.atj-tetris .tt-footer{display:flex;align-items:center;justify-content:center;gap:5px;font-size:9px;color:#8b9580;margin-top:8px}.atj-tetris .tt-dot{width:4px;height:4px;background:var(--tt-lime);border-radius:50%;display:inline-block}.atj-tetris .tt-live{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:420px){.atj-tetris{padding:15px}.atj-tetris .tt-body{grid-template-columns:minmax(0,1fr) 86px;gap:12px}.atj-tetris .tt-sidebar{gap:14px}.atj-tetris .tt-stats{gap:14px}.atj-tetris .tt-help{font-size:8px}.atj-tetris .tt-score{font-size:21px}}
    @media(max-height:760px) and (min-width:421px){.atj-tetris{padding:17px}.atj-tetris .tt-body{grid-template-columns:190px 115px;max-width:324px}.atj-tetris .tt-controls{max-width:324px}.atj-tetris .tt-sidebar{gap:14px}.atj-tetris .tt-header{margin-bottom:12px}}
    @media(max-height:670px){.atj-tetris .tt-body{grid-template-columns:minmax(0,160px) 98px;max-width:276px}.atj-tetris .tt-controls{max-width:276px}.atj-tetris .tt-sidebar{gap:10px}.atj-tetris .tt-help{margin-top:8px}.atj-tetris .tt-next{height:52px}.atj-tetris .tt-header{margin-bottom:10px}.atj-tetris h2{font-size:22px}.atj-tetris .tt-subtitle{font-size:10px}}
  `;

  class ATJTetris {
    constructor(rootElement, options = {}) {
      if (!rootElement) throw new Error('ATJTetris requires a root element.');
      this.root = rootElement;
      this.options = options;
      this.best = this.readBest();
      this.mounted = false;
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.frame = 0;
      this.cleanup = [];
      this._tick = this.tick.bind(this);
      this._key = this.key.bind(this);
    }

    readBest() {
      try { return Math.max(0, Number(localStorage.getItem(STORAGE)) || 0); } catch (_) { return 0; }
    }

    mount() {
      if (this.mounted) return this;
      this.mounted = true;
      this.root.innerHTML = `<style>${CSS}</style><section class="atj-tetris" tabindex="0" aria-label="Tetris arcade game">
        <header class="tt-header"><div><p class="tt-kicker">The loading lounge · Tetris</p><h2>STACK THE STAGE</h2><p class="tt-subtitle">A little play before the big show.</p></div><button class="tt-close" type="button" aria-label="Close arcade">×</button></header>
        <div class="tt-body"><div class="tt-board-wrap"><canvas class="tt-board" aria-label="Tetris board. Use the arrow keys or the buttons below to play." role="img"></canvas><div class="tt-status" hidden><strong></strong><span></span><button type="button"></button></div></div>
          <aside class="tt-sidebar"><div><span class="tt-label">Your score</span><div class="tt-score" data-stat="score">00000</div></div><div><span class="tt-label">Personal best</span><div class="tt-small-value" data-stat="best">00000</div></div><div><span class="tt-label">Up next</span><canvas class="tt-next" aria-label="Next tetromino preview" role="img"></canvas></div><div class="tt-stats"><div><span class="tt-label">Level</span><div class="tt-small-value" data-stat="level">01</div></div><div><span class="tt-label">Lines</span><div class="tt-small-value" data-stat="lines">00</div></div></div><div class="tt-buttons"><button type="button" class="tt-button tt-button-primary" data-action="pause">Pause</button><button type="button" class="tt-button" data-action="restart">Start again ↻</button></div></aside>
        </div><div class="tt-controls" aria-label="Touch controls"><button type="button" class="tt-control" data-action="left" aria-label="Move left">←</button><button type="button" class="tt-control" data-action="rotate" aria-label="Rotate clockwise">↻</button><button type="button" class="tt-control" data-action="right" aria-label="Move right">→</button><button type="button" class="tt-control" data-action="drop" aria-label="Hard drop">↓ <span>DROP</span></button></div><p class="tt-help">← → move &nbsp; ↑ / X rotate &nbsp; Z reverse &nbsp; ↓ soft drop &nbsp; Space drop &nbsp; P pause</p><div class="tt-footer"><i class="tt-dot"></i>Clear a row. Make room for the next big thing.</div><div class="tt-live" aria-live="polite"></div>
      </section>`;
      this.element = this.root.querySelector('.atj-tetris');
      this.canvas = this.root.querySelector('.tt-board');
      this.ctx = this.canvas.getContext('2d');
      this.nextCanvas = this.root.querySelector('.tt-next');
      this.nextCtx = this.nextCanvas.getContext('2d');
      this.status = this.root.querySelector('.tt-status');
      this.pauseButton = this.root.querySelector('[data-action="pause"]');
      this.statusButton = this.status.querySelector('button');
      this.live = this.root.querySelector('.tt-live');
      this.bind(this.root, 'click', (event) => {
        const button = event.target.closest('button');
        if (!button || !this.root.contains(button)) return;
        if (button.classList.contains('tt-close')) {
          this.pause();
          if (typeof this.options.onExit === 'function') this.options.onExit();
          return;
        }
        if (button === this.statusButton) {
          if (this.gameOver) { this.reset(); this.start(); } else this.resume();
          this.element.focus({preventScroll:true});
          return;
        }
        this.action(button.dataset.action);
        this.element.focus({preventScroll:true});
      });
      this.bind(document, 'keydown', this._key);
      this.bind(document, 'visibilitychange', () => { if (document.hidden && this.running && !this.paused) this.pause(); });
      this.bind(window, 'blur', () => { if (this.running && !this.paused) this.pause(); });
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
      } else this.bind(window, 'resize', () => this.resize());
      this.reset();
      this.resize();
      return this;
    }

    bind(target, type, fn) {
      target.addEventListener(type, fn);
      this.cleanup.push(() => target.removeEventListener(type, fn));
    }

    reset() {
      this.board = Array.from({length:20}, () => Array(10).fill(null));
      this.bag = [];
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.gameOver = false;
      this.paused = false;
      this.fallTime = 0;
      this.lockTime = 0;
      this.lockResets = 0;
      this.clearFlash = 0;
      this.clearedRows = [];
      this.nextType = this.takeBag();
      this.spawn();
      this.syncStats();
      this.syncStatus();
      this.draw();
    }

    takeBag() {
      if (!this.bag.length) {
        this.bag = Object.keys(SHAPES);
        for (let i=this.bag.length-1; i>0; i--) {
          const j = Math.floor(Math.random()*(i+1));
          [this.bag[i],this.bag[j]] = [this.bag[j],this.bag[i]];
        }
      }
      return this.bag.pop();
    }

    spawn() {
      const type = this.nextType;
      this.piece = {type, matrix:SHAPES[type].map(row => row.slice()), x:type === 'O' ? 4 : 3, y:-1, rotation:0};
      this.nextType = this.takeBag();
      this.fallTime = 0;
      this.lockTime = 0;
      this.lockResets = 0;
      if (this.collides(this.piece.matrix,this.piece.x,this.piece.y)) this.finish();
      this.drawNext();
    }

    collides(matrix, x, y) {
      for (let row=0;row<matrix.length;row++) for (let col=0;col<matrix[row].length;col++) {
        if (!matrix[row][col]) continue;
        const bx=x+col, by=y+row;
        if (bx<0 || bx>=10 || by>=20 || (by>=0 && this.board[by][bx])) return true;
      }
      return false;
    }

    grounded() { return this.collides(this.piece.matrix,this.piece.x,this.piece.y+1); }

    move(dx) {
      if (!this.canPlay() || this.collides(this.piece.matrix,this.piece.x+dx,this.piece.y)) return;
      const wasGrounded = this.grounded();
      this.piece.x += dx;
      if (wasGrounded && this.lockResets < 12) { this.lockTime=0; this.lockResets++; }
      this.draw();
    }

    rotate(direction) {
      if (!this.canPlay() || this.piece.type === 'O') return;
      const p = this.piece;
      const n = p.matrix.length;
      const rotated = Array.from({length:n},(_,y) => Array.from({length:n},(_,x) => direction>0 ? p.matrix[n-1-x][y] : p.matrix[x][n-1-y]));
      const nextRotation = (p.rotation+(direction>0?1:3))%4;
      const kicks = (p.type === 'I' ? I_KICKS : KICKS)[p.rotation+'>'+nextRotation] || [[0,0]];
      const wasGrounded = this.grounded();
      for (const [dx,dy] of kicks) {
        if (!this.collides(rotated,p.x+dx,p.y-dy)) {
          p.matrix=rotated; p.x+=dx; p.y-=dy; p.rotation=nextRotation;
          if (wasGrounded && this.lockResets<12) { this.lockTime=0; this.lockResets++; }
          this.draw();
          return;
        }
      }
    }

    softDrop() {
      if (!this.canPlay()) return;
      if (!this.grounded()) { this.piece.y++; this.addScore(1); this.fallTime=0; this.lockTime=0; }
      this.draw();
    }

    hardDrop() {
      if (!this.canPlay()) return;
      let distance=0;
      while (!this.grounded()) { this.piece.y++; distance++; }
      this.addScore(distance*2);
      this.lock();
      this.draw();
    }

    lock() {
      let overflow=false;
      this.piece.matrix.forEach((row,y) => row.forEach((cell,x) => {
        if (!cell) return;
        const by=this.piece.y+y;
        if (by<0) overflow=true;
        else this.board[by][this.piece.x+x]=this.piece.type;
      }));
      if (overflow) { this.finish(); return; }
      const full=[];
      this.board.forEach((row,i) => { if (row.every(Boolean)) full.push(i); });
      if (full.length) {
        this.board=this.board.filter((_,i) => !full.includes(i));
        while (this.board.length<20) this.board.unshift(Array(10).fill(null));
        this.addScore([0,100,300,500,800][full.length]*this.level);
        this.lines+=full.length;
        this.level=Math.floor(this.lines/10)+1;
        this.clearFlash=180;
        this.clearedRows=full;
        this.live.textContent=(full.length===4?'Tetris! Four rows cleared.':full.length+' row'+(full.length>1?'s':'')+' cleared.')+' Score '+this.score+'.';
        this.syncStats();
      }
      this.spawn();
    }

    addScore(value) {
      this.score+=value;
      if (this.score>this.best) {
        this.best=this.score;
        try { localStorage.setItem(STORAGE,String(this.best)); } catch (_) { /* Private browsing may deny storage. */ }
      }
      this.syncStats();
      if (typeof this.options.onScore==='function') this.options.onScore(this.score,{lines:this.lines,level:this.level,best:this.best});
    }

    start() {
      if (!this.mounted) this.mount();
      if (this.gameOver) this.reset();
      this.running=true;
      this.paused=false;
      this.lastTime=performance.now();
      this.syncStatus();
      if (!this.frame) this.frame=requestAnimationFrame(this._tick);
      this.resize();
      return this;
    }

    pause() {
      if (!this.mounted) return this;
      this.paused=true;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame=0;
      this.syncStatus();
      return this;
    }

    resume() { return this.start(); }

    finish() {
      this.gameOver=true;
      this.running=false;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame=0;
      this.syncStatus();
      if (this.live) this.live.textContent='Show over. Final score '+this.score+'. Start again to play another round.';
    }

    visible() {
      return !!(this.root.isConnected && this.root.getClientRects().length && !this.root.closest('[hidden]'));
    }

    canPlay() { return this.running && !this.paused && !this.gameOver && this.visible(); }

    tick(now) {
      this.frame=0;
      if (!this.running || this.paused || this.gameOver) return;
      const dt=Math.min(now-this.lastTime,80);
      this.lastTime=now;
      if (this.visible()) {
        this.clearFlash=Math.max(0,this.clearFlash-dt);
        if (this.grounded()) {
          this.lockTime+=dt;
          if (this.lockTime>=450) this.lock();
        } else {
          this.lockTime=0;
          this.fallTime+=dt;
          const speed=Math.max(65,850*Math.pow(.79,this.level-1));
          if (this.fallTime>=speed) { this.piece.y++; this.fallTime=0; }
        }
        this.draw();
      }
      if (this.running && !this.paused && !this.gameOver) this.frame=requestAnimationFrame(this._tick);
    }

    action(action) {
      if (action==='restart') { this.reset(); this.start(); return; }
      if (action==='pause') { this.paused ? this.resume() : this.pause(); return; }
      if (action==='left') this.move(-1);
      if (action==='right') this.move(1);
      if (action==='rotate') this.rotate(1);
      if (action==='drop') this.hardDrop();
    }

    key(event) {
      if (!this.visible() || !this.mounted || !this.running) return;
      const target=event.target;
      if (target && (target.matches('input,textarea,select') || target.isContentEditable)) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const key=event.key.toLowerCase();
      // Let focused controls retain their native Space-key activation.
      if (key===' ' && target?.closest('button,a[href],summary')) return;
      if (!['arrowleft','arrowright','arrowdown','arrowup','x','z',' ','p'].includes(key)) return;
      event.preventDefault();
      // Prevent the parent walkthrough from interpreting arcade movement keys.
      event.stopPropagation();
      if (key==='p') { if (!event.repeat) this.paused ? this.resume() : this.pause(); return; }
      if (this.paused) return;
      if (key==='arrowleft') this.move(-1);
      if (key==='arrowright') this.move(1);
      if (key==='arrowdown') this.softDrop();
      if ((key==='arrowup' || key==='x') && !event.repeat) this.rotate(1);
      if (key==='z' && !event.repeat) this.rotate(-1);
      if (key===' ' && !event.repeat) this.hardDrop();
    }

    syncStats() {
      if (!this.mounted) return;
      const values={score:String(this.score).padStart(5,'0'),best:String(this.best).padStart(5,'0'),level:String(this.level).padStart(2,'0'),lines:String(this.lines).padStart(2,'0')};
      for (const [name,value] of Object.entries(values)) {
        const node=this.root.querySelector('[data-stat="'+name+'"]');
        if (node && node.textContent!==value) node.textContent=value;
      }
    }

    syncStatus() {
      if (!this.status) return;
      this.status.hidden=!this.paused && !this.gameOver;
      this.pauseButton.textContent=this.paused?'Resume':'Pause';
      this.status.querySelector('strong').textContent=this.gameOver?'SHOW OVER':'ON INTERMISSION';
      this.status.querySelector('span').textContent=this.gameOver?'You made '+this.score.toLocaleString()+' points. Another encore?':'Your stage is exactly where you left it.';
      this.statusButton.textContent=this.gameOver?'Play another round ↗':'Back to the stage ↗';
    }

    resize() {
      if (!this.canvas) return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const rect=this.canvas.getBoundingClientRect();
      const w=rect.width||220;
      const h=rect.height||440;
      this.canvas.width=Math.round(w*dpr);
      this.canvas.height=Math.round(h*dpr);
      this.boardWidth=w; this.boardHeight=h;
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      const nextRect=this.nextCanvas.getBoundingClientRect();
      const nw=nextRect.width||88, nh=nextRect.height||70;
      this.nextCanvas.width=Math.round(nw*dpr); this.nextCanvas.height=Math.round(nh*dpr);
      this.nextWidth=nw; this.nextHeight=nh;
      this.nextCtx.setTransform(dpr,0,0,dpr,0,0);
      this.draw(); this.drawNext();
    }

    block(ctx,x,y,w,h,color,ghost) {
      const inset=Math.max(1,w*.065);
      if (ghost) {
        ctx.strokeStyle=color; ctx.globalAlpha=.38; ctx.lineWidth=1;
        ctx.strokeRect(x+inset+1,y+inset+1,w-inset*2-2,h-inset*2-2);
        ctx.globalAlpha=1;
        return;
      }
      ctx.fillStyle=color;
      ctx.fillRect(x+inset,y+inset,w-inset*2,h-inset*2);
      ctx.fillStyle='rgba(255,255,255,.2)';
      ctx.fillRect(x+inset+1,y+inset,w-inset*2-2,Math.max(1,h*.08));
      ctx.fillStyle='rgba(0,0,0,.12)';
      ctx.fillRect(x+inset,y+h-inset-Math.max(1,h*.08),w-inset*2,Math.max(1,h*.08));
    }

    draw() {
      if (!this.ctx || !this.board || !this.boardWidth) return;
      const ctx=this.ctx, w=this.boardWidth, h=this.boardHeight, cw=w/10, ch=h/20;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#10150e'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(152,178,123,.055)'; ctx.lineWidth=.5;
      ctx.beginPath();
      for(let x=1;x<10;x++){ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,h);}
      for(let y=1;y<20;y++){ctx.moveTo(0,y*ch);ctx.lineTo(w,y*ch);}
      ctx.stroke();
      this.board.forEach((row,y) => row.forEach((type,x) => { if(type) this.block(ctx,x*cw,y*ch,cw,ch,COLORS[type],false); }));
      if (this.piece && !this.gameOver) {
        let gy=this.piece.y;
        while(!this.collides(this.piece.matrix,this.piece.x,gy+1)) gy++;
        for (const [py,ghost] of [[gy,true],[this.piece.y,false]]) {
          this.piece.matrix.forEach((row,y)=>row.forEach((cell,x)=>{
            if(cell && py+y>=0) this.block(ctx,(this.piece.x+x)*cw,(py+y)*ch,cw,ch,COLORS[this.piece.type],ghost);
          }));
        }
      }
      if(this.clearFlash>0) {
        ctx.fillStyle='rgba(213,251,166,'+(this.clearFlash/180*.7)+')';
        this.clearedRows.forEach(y=>ctx.fillRect(0,y*ch,w,ch));
      }
    }

    drawNext() {
      if(!this.nextCtx || !this.nextWidth || !this.nextType) return;
      const ctx=this.nextCtx,w=this.nextWidth,h=this.nextHeight;
      ctx.clearRect(0,0,w,h);
      const matrix=SHAPES[this.nextType],filled=[];
      matrix.forEach((row,y)=>row.forEach((cell,x)=>{if(cell)filled.push([x,y]);}));
      const minX=Math.min(...filled.map(p=>p[0])),maxX=Math.max(...filled.map(p=>p[0]));
      const minY=Math.min(...filled.map(p=>p[1])),maxY=Math.max(...filled.map(p=>p[1]));
      const cell=Math.min(19,w/4,h/3),ox=(w-(maxX-minX+1)*cell)/2,oy=(h-(maxY-minY+1)*cell)/2;
      filled.forEach(([x,y])=>this.block(ctx,ox+(x-minX)*cell,oy+(y-minY)*cell,cell,cell,COLORS[this.nextType],false));
      this.nextCanvas.setAttribute('aria-label','Next piece: '+this.nextType+' tetromino');
    }

    destroy() {
      if(this.frame)cancelAnimationFrame(this.frame);
      this.frame=0; this.running=false;
      this.cleanup.forEach(fn=>fn()); this.cleanup=[];
      if(this.resizeObserver)this.resizeObserver.disconnect();
      this.root.innerHTML=''; this.mounted=false;
    }
  }

  window.ATJTetris=ATJTetris;
})();
