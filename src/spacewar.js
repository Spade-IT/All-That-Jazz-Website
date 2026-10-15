/* Space War — original local arcade; no runtime dependencies. */
(()=>{'use strict';
class SpaceWar{
 constructor(root){
  this.root=root;root.innerHTML=`<section class="space-game" tabindex="0" aria-label="Space War game"><div class="space-head"><h2>Space War</h2><span class="space-score" aria-live="polite">Score 0 · Lives 3</span></div><canvas width="480" height="420" aria-label="Space War playfield"></canvas><p class="space-status" role="status">Defend the experience. Destroy the incoming ships.</p><div class="space-controls"><button data-action="left" aria-label="Move ship left">←</button><button data-action="fire">FIRE</button><button data-action="right" aria-label="Move ship right">→</button><button data-action="pause">Pause</button><button data-action="reset">Restart</button></div><p>← → or A / D to move · Space to fire · P to pause. Touch controls work too.</p></section>`;
  this.element=root.firstElementChild;this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.keys=new Set();this.running=false;this.reset();
  this.element.addEventListener('keydown',e=>{
   const k=e.key.toLowerCase();if(['arrowleft','arrowright','a','d',' ','p'].includes(k)){e.preventDefault();if(k==='p'&&!e.repeat){this.running?this.pause():this.resume();return;}this.keys.add(k);}
  });this.element.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));this.element.addEventListener('blur',()=>this.keys.clear());
  root.querySelectorAll('[data-action]').forEach(b=>{
   const k={left:'a',right:'d',fire:' '}[b.dataset.action];
   if(k){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.keys.add(k);this.element.focus();});['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,()=>this.keys.delete(k)));}
   else b.addEventListener('click',()=>{if(b.dataset.action==='reset'){this.reset();this.resume();}else this.running?this.pause():this.resume();this.element.focus();});
  });
  window.addEventListener('blur',()=>this.pause());
 }
 reset(){this.x=240;this.lives=3;this.score=0;this.wave=1;this.bullets=[];this.enemies=[];this.cooldown=0;this.spawnTimer=0;this.invincible=0;this.over=false;this.keys.clear();this.status('Defend the experience. Destroy the incoming ships.');this.draw();}
 status(s){this.root.querySelector('.space-status').textContent=s;}
 pause(){this.running=false;cancelAnimationFrame(this.frame);this.keys.clear();if(!this.over)this.status('Paused · press Resume or P to continue.');this.root.querySelector('[data-action="pause"]').textContent='Resume';}
 resume(){if(this.running||this.over)return;this.running=true;this.last=0;this.status('Defend the experience. Destroy the incoming ships.');this.root.querySelector('[data-action="pause"]').textContent='Pause';this.frame=requestAnimationFrame(t=>this.tick(t));}
 tick(t){if(!this.running)return;const dt=this.last?Math.min((t-this.last)/1000,.04):0;this.last=t;this.update(dt);this.draw();if(this.running)this.frame=requestAnimationFrame(t=>this.tick(t));}
 update(dt){
  this.x=Math.max(18,Math.min(462,this.x+((this.keys.has('d')||this.keys.has('arrowright'))-(this.keys.has('a')||this.keys.has('arrowleft')))*280*dt));
  this.cooldown-=dt;this.spawnTimer-=dt;this.invincible-=dt;
  if(this.keys.has(' ')&&this.cooldown<=0){this.bullets.push({x:this.x,y:365});this.cooldown=.16;}
  this.wave=1+Math.floor(this.score/100);
  if(this.spawnTimer<=0){this.enemies.push({x:22+Math.random()*436,y:-15,v:55+this.wave*10});this.spawnTimer=Math.max(.22,1-this.wave*.075);}
  this.bullets.forEach(b=>b.y-=430*dt);this.enemies.forEach(e=>e.y+=e.v*dt);
  for(const e of this.enemies){for(const b of this.bullets){if(!e.dead&&!b.dead&&Math.abs(e.x-b.x)<19&&Math.abs(e.y-b.y)<18){e.dead=true;b.dead=true;this.score+=10;}}
   if(!e.dead&&(e.y>430||(Math.abs(e.x-this.x)<27&&Math.abs(e.y-385)<23))){e.dead=true;if(this.invincible<=0){this.lives--;this.invincible=.5;}}
  }
  this.bullets=this.bullets.filter(b=>!b.dead&&b.y>-20);this.enemies=this.enemies.filter(e=>!e.dead);
  if(this.lives<=0){this.over=true;this.pause();let best=0;try{best=Math.max(this.score,Number(localStorage.getItem('atj-space-best'))||0);localStorage.setItem('atj-space-best',String(best));}catch(_){}this.status(`Game over · Score ${this.score} · Best ${best}. Restart to play again.`);}
 }
 draw(){const c=this.ctx;if(!c)return;c.fillStyle='#0c101e';c.fillRect(0,0,480,420);
  c.fillStyle='#7786a7';for(let i=0;i<65;i++){c.fillRect((i*137)%480,(i*71)%420,i%4===0?2:1,i%4===0?2:1);}
  c.strokeStyle='#283148';c.beginPath();c.moveTo(0,350);c.lineTo(480,350);c.stroke();
  c.fillStyle=this.invincible>0?'#fff':'#c9ed6b';c.beginPath();c.moveTo(this.x,363);c.lineTo(this.x-18,400);c.lineTo(this.x,392);c.lineTo(this.x+18,400);c.closePath();c.fill();c.fillStyle='#91d5cb';c.fillRect(this.x-4,399,8,10);
  c.fillStyle='#c9ed6b';this.bullets.forEach(b=>c.fillRect(b.x-2,b.y-6,4,14));
  for(const e of this.enemies){c.fillStyle='#bea9ff';c.beginPath();c.moveTo(e.x,e.y+14);c.lineTo(e.x-18,e.y-10);c.lineTo(e.x+18,e.y-10);c.closePath();c.fill();c.fillStyle='#efb0c8';c.fillRect(e.x-4,e.y-8,8,8);}
  this.root.querySelector('.space-score').textContent=`Score ${this.score} · Lives ${Math.max(0,this.lives)} · Wave ${this.wave}`;
  if(this.over){c.fillStyle='#0c101ed9';c.fillRect(0,155,480,90);c.fillStyle='#c9ed6b';c.font='bold 28px Arial';c.textAlign='center';c.fillText('GAME OVER',240,208);}
 }
}
window.ATJSpaceWar=SpaceWar;
})();
