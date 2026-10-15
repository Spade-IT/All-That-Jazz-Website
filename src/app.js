/* All That Jazz · V3 experience orchestration, interactive radar, and ambient jazz pad. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const projects = [
    { id:'taxi', number:'01', name:'The Taxi Project', title:'A city.\nA moving canvas.', category:'BRAND ACTIVATION', client:'ASIAN PAINTS / THE TAXI PROJECT 2025', year:'2025', place:'Kolkata, India', color:'#efd790', summary:'Kolkata’s iconic yellow taxis became moving canvases for a celebration of Pujo. The campaign brought art into the everyday life of the city. All That Jazz is credited among the project’s collaborating partners.', award:'Silver — Integrated Marketing Campaign\nSilver — Road Show Activation', mood:'A city in celebration.' },
    { id:'japan', number:'02', name:'Privilege Club · Japan', title:'A different world.\nA shared moment.', category:'DESTINATION EXPERIENCE', client:'ASIAN PAINTS / PRIVILEGE CLUB JAPAN 2025', year:'2025', place:'Japan', color:'#e3b9ce', summary:'A destination celebration for the Asian Paints Privilege Club. Step into an imagined Japanese garden: sculptural cherry blossoms, an open pavilion and a stage framed by a striking red gate.', award:'Silver — Celebratory Event', mood:'Step into the destination garden.' },
    { id:'usa', number:'03', name:'Privilege Club · USA', title:'Big horizons.\nLasting connections.', category:'CHANNEL EXPERIENCE', client:'ASIAN PAINTS / PRIVILEGE CLUB SUPER PREMIUM MEMBERS USA 2025', year:'2025', place:'USA', color:'#bad9ed', summary:'An experience for Asian Paints Privilege Club Super Premium Members in the USA. Our virtual room imagines the energy of a city after dark, with a skyline-inspired set and a luminous live stage.', award:'Silver — Trade / Channel Event\nBudget above ₹1 crore', mood:'A skyline full of possibilities.' },
    { id:'elite', number:'04', name:'Elite Night', title:'An evening\nto remember.', category:'CORPORATE EXPERIENCE', client:'ASIAN PAINTS / ELITE NIGHT 2025', year:'2025', place:'India', color:'#d9c3a1', summary:'Asian Paints Elite Night 2025 received recognition in the domestic MICE category. This imagined gala room brings that sense of occasion into the venue through golden arches, a grand stage and intimate tables.', award:'Silver — Domestic MICE', mood:'Take your place at the gala.' },
    { id:'aimc', number:'05', name:'AIMC 2026', title:'Great minds.\nOne shared stage.', category:'CONFERENCE & CONCLAVE', client:'ALL INDIA MARKETING CONCLAVE / AIMC 2026', year:'2026', place:'Marketing conclave', color:'#c3c0e8', summary:'AIMC brings the All India Marketing Conclave into the story of All That Jazz. Explore our imagined conference theatre, built around a shared stage, open conversations and the energy of people coming together.', award:'Bronze — Professional Conference Organizer\nBronze — Trade / Channel Event, above ₹1 crore', mood:'Where the conversation begins.' }
  ];
  const byId = Object.fromEntries(projects.map(p => [p.id, p]));
  const source = 'https://www.eemaindia.com/eemaxglobal/winners.php';
  let engine, arcade, spacewar, ready = false, failed = false, exploring = false, currentZone = null, detailId = null;
  let labels = [], toastTimer, soundContext, soundGain, soundOn = false;
  const visited = new Set();
  try { const saved = JSON.parse(localStorage.getItem('atj-visited') || '[]'); if (Array.isArray(saved)) saved.filter(id => byId[id]).forEach(id => visited.add(id)); } catch (_) {}

  function art(id) {
    const color = byId[id].color;
    const base = '<ellipse cx="190" cy="192" rx="124" ry="15" fill="#211a3b" opacity=".16"/><path d="M54 158 192 94 313 155 177 213Z" fill="#f5efe6"/><path d="M54 158 177 213 177 225 54 170Z" fill="#bbaed0"/><path d="M177 213 313 155 313 166 177 225Z" fill="#9684b3"/>';
    const truss = '<path d="M83 170V75L264 100V180M83 75 111 60 294 86 264 100M294 86V164" fill="none" stroke="#514960" stroke-width="4"/><path d="M92 77 108 61M119 80 135 65M148 85 164 70M176 89 192 74M205 93 221 78M234 97 250 82" stroke="#514960" stroke-width="2"/>';
    const scenes = {
      taxi:'<circle cx="190" cy="92" r="56" fill="#fff6d6" opacity=".35"/><path d="M72 165 188 112 287 159 174 208Z" fill="#555060"/><path d="M108 171 151 151M180 138 213 123" stroke="#eee7d4" stroke-width="3" stroke-dasharray="11 6"/><g transform="translate(106 126)"><path d="M0 11 40-8 86 14 44 34Z" fill="#ffcf49"/><path d="M0 11 44 34 44 53 0 30Z" fill="#e4a225"/><path d="M44 34 86 14 86 32 44 53Z" fill="#ffe076"/><path d="M19 8 42-3 65 8 44 19Z" fill="#f9dc7f"/><path d="M19 8 44 19 44 34 12 18Z" fill="#536471"/><path d="M44 19 65 8 74 20 44 34Z" fill="#78929a"/><ellipse cx="12" cy="33" rx="6" ry="9" fill="#353241"/><ellipse cx="70" cy="37" rx="6" ry="9" fill="#353241"/><path d="m26 24 6-2 7 6-6 3Z" fill="#ec7eae"/></g><g transform="translate(58 -35) scale(.66)"><path d="M175 160 215 141 254 159 213 178Z" fill="#ffda64"/><path d="M175 160 213 178 213 196 175 179Z" fill="#e8a92e"/><path d="M213 178 254 159 254 177 213 196Z" fill="#f2c74d"/><path d="M187 157 213 169 238 157 215 145Z" fill="#788d9b"/><ellipse cx="184" cy="179" rx="5" ry="8" fill="#353241"/><ellipse cx="239" cy="183" rx="5" ry="8" fill="#353241"/></g><path d="M90 134V68L177 108V147Z" fill="#eac9b6"/><path d="M99 80 169 112 169 126 99 95Z" fill="#b7638f"/><path d="M114 110 127 116 127 128 114 122Z" fill="#8badb1"/>',
      japan:'<circle cx="204" cy="84" r="46" fill="#ffdfe9" opacity=".45"/><path d="M158 196 184 184 184 89 172 85 158 91Z" fill="#bb4d48"/><path d="M228 161 246 153 246 64 232 65 228 75Z" fill="#c75850"/><path d="M133 77 219 37 272 61 190 103Z" fill="#d3655b"/><path d="M133 77 190 103 190 114 133 87Z" fill="#a64447"/><path d="M190 103 272 61 272 73 190 114Z" fill="#b94f4d"/><path d="M151 106 229 71 252 81 176 118Z" fill="#d57569"/><path d="M96 154V91" stroke="#8b6676" stroke-width="8"/><g fill="#edacc8"><circle cx="96" cy="77" r="25"/><circle cx="70" cy="87" r="20"/><circle cx="115" cy="91" r="24"/><circle cx="91" cy="105" r="24"/></g><g fill="#f7c6d9"><circle cx="77" cy="72" r="13"/><circle cx="102" cy="60" r="15"/></g><path d="M206 188 270 158 248 149 183 179Z" fill="#a6bda9"/><ellipse cx="246" cy="160" rx="21" ry="10" fill="#8bab94"/>',
      usa:truss+'<circle cx="185" cy="88" r="54" fill="#e5f4ff" opacity=".32"/><path d="M120 141V55L143 45 159 53V147Z" fill="#8ca1c4"/><path d="M163 153V84L186 74 202 82V166Z" fill="#a3b4d0"/><path d="M211 141V43L231 34 247 42V155Z" fill="#7390b2"/><path d="M231 34V17" stroke="#62758c" stroke-width="3"/><path d="M115 170 187 137 260 173 187 207Z" fill="#a491d0"/><path d="M131 108 212 145 250 127V165L212 184 131 147Z" fill="#2c2f4f"/><path d="M143 125 208 155 237 141" fill="none" stroke="#bef3d6" stroke-width="4"/><g fill="#e7d889"><path d="M128 69v9l7 3v-9Zm0 21v9l7 3v-9Zm46 8v9l7 3v-9Zm44-38v9l7 3v-9Zm0 20v9l7 3v-9Z"/></g>',
      elite:'<circle cx="176" cy="96" r="52" fill="#fff2d6" opacity=".38"/><path d="M89 161V92Q89 46 132 64L193 92Q218 103 218 138V189" fill="none" stroke="#c29b4d" stroke-width="11"/><path d="M104 165V97Q104 66 134 80L185 103Q203 111 203 137V180" fill="none" stroke="#ead6a7" stroke-width="4"/><path d="M117 164 175 137 253 174 194 202Z" fill="#6f586e"/><path d="M143 115 185 134V171L143 151Z" fill="#a989b1"/><g fill="#f4e0ba"><ellipse cx="101" cy="184" rx="20" ry="10"/><ellipse cx="270" cy="157" rx="18" ry="9"/></g><g stroke="#9b8192" stroke-width="3"><path d="M101 184v14M270 157v14"/></g><g fill="#debc76"><circle cx="101" cy="178" r="5"/><circle cx="270" cy="151" r="5"/></g>',
      aimc:truss+'<circle cx="186" cy="95" r="52" fill="#ece8ff" opacity=".36"/><path d="M116 94 249 112 249 151 116 137Z" fill="#6c64a1"/><path d="M126 103 240 118 240 139 126 128Z" fill="#b3b5f1"/><path d="M105 150 200 108 270 143 176 188Z" fill="#ad9ecc"/><path d="M139 113 169 128 169 153 139 138Z" fill="#ddd7ed"/>'+[0,1,2].map(r=>[0,1,2,3].map(c=>{const x=102+c*25+r*13,y=162+c*11-r*6;return `<path d="M${x} ${y}v-10l12 6v10Z" fill="#7c698e"/><path d="m${x} ${y} 12 6 8-4-12-6Z" fill="#b1a1c7"/>`;}).join('')).join('')
    };
    return `<svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="360" height="240" fill="${color}"/>${base}${scenes[id]}</svg>`;
  }

  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3400); }
  function modalOpen() { return !!document.querySelector('dialog[open]'); }
  function openModal(id) {
    engine?.setKeys(false);
    const dialog = $(id);
    if (!dialog.open) dialog.showModal();
  }
  function closeModal(id) { if ($(id).open) $(id).close(); }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => {
      if (dialog.id === 'arcade-dialog') {arcade?.pause();spacewar?.pause();}
      if (!modalOpen()) { engine?.setKeys(exploring && !failed); if (exploring && !failed) $('world').focus({preventScroll:true}); }
    });
  });

  function updateVisited() {
    $('visited-count').textContent = `${visited.size} / 5`;
    document.querySelectorAll('.zone-step').forEach(el => { el.classList.toggle('visited',visited.has(el.dataset.zone)); el.classList.toggle('active',el.dataset.zone === currentZone); });
    labels.forEach(item => {
      item.el.classList.toggle('is-visited', visited.has(item.zone.id));
      item.el.classList.toggle('is-active', item.zone.id === currentZone);
    });
    try { localStorage.setItem('atj-visited',JSON.stringify([...visited])); } catch (_) {}
  }
  function showProject(id) {
    const p = byId[id]; if (!p) return;
    detailId = id; visited.add(id); updateVisited();
    $('detail-number').textContent = `${p.number} / 05`;
    $('detail-type').textContent = p.category;
    $('detail-client').textContent = p.client;
    $('detail-title').textContent = p.title;
    $('detail-summary').textContent = p.summary;
    $('detail-award').textContent = p.award;
    $('detail-award').style.whiteSpace = 'pre-line';
    $('detail-facts').innerHTML = `<div><span>CHAPTER</span><strong>${p.year}</strong></div><div><span>SETTING</span><strong>${p.place}</strong></div>`;
    $('detail-art').innerHTML = art(id); $('detail-art').style.background = p.color;
    $('detail-source').href = source;
    openModal('project-detail');
  }
  function setZone(id) {
    currentZone = id;
    const p = byId[id];
    const game = id==='tetris'||id==='spacewar';
    $('nearby-project').hidden = !id || !exploring;
    $('nearby-count').textContent = p?.number || '↗';
    $('nearby-category').textContent = p?.category || (game?'ATJ ARCADE · PRESS E TO PLAY':'YOUR NEXT CHAPTER');
    $('nearby-name').textContent = p?.name || (game?(id==='tetris'?'Tetris':'Space War'):'Let’s make it happen');
    $('location-title').textContent = p?.name || (id === 'contact' ? 'The next big moment' : 'The arrival');
    $('location-description').textContent = p?.mood || (id === 'contact' ? 'Bring your ideas. We’ll bring the possibilities.' : 'A whole world of possibilities. Find your next story.');
    $('open-nearby').setAttribute('aria-label',p ? `Explore ${p.name}` : 'Open contact page');
    updateVisited();
  }
  function openNearby() { if(currentZone==='tetris'||currentZone==='spacewar')openArcade(currentZone);else if(currentZone === 'contact') window.location.href = 'contact.html'; else if(currentZone) showProject(currentZone); }
  function navigateTo(id) {
    closeModal('project-directory');
    if (id==='tetris'||id==='spacewar'){openArcade(id);return;}
    if (failed) { if (id === 'contact') window.location.href = 'contact.html'; else showProject(id); return; }
    if (!ready) return;
    if (!exploring) enterWorld();
    if (currentZone === id) { openNearby(); return; }
    engine.goToZone(id); $('world').focus({preventScroll:true});
    toast(`On our way to ${byId[id]?.name || 'your next chapter'}.`);
  }
  function enterWorld() {
    if (failed) { openModal('project-directory'); return; }
    if (!ready) return;
    exploring = true;
    $('experience').classList.replace('intro-mode','exploring');
    document.querySelector('.hero').inert = true;
    document.querySelector('.hero').setAttribute('aria-hidden','true');
    $('explore-ui').hidden = false;
    $('fpp-reticle').hidden = true;
    engine.setKeys(!modalOpen()); engine.setView('follow'); $('camera-toggle').textContent='TPP'; engine.start();
    $('camera-toggle').setAttribute('aria-pressed','false');
    $('camera-toggle').setAttribute('aria-label','Switch to first person');
    $('world').focus({preventScroll:true});
    setZone(engine.getState().zone);
    labels.forEach(item=>item.el.tabIndex=0);
    requestAnimationFrame(() => engine.resize());
  }
  function backToIntro() {
    exploring = false;
    engine.setAutoTour(false); engine.setKeys(false); engine.setView('overview');
    $('experience').classList.replace('exploring','intro-mode');
    document.querySelector('.hero').inert = false;
    document.querySelector('.hero').removeAttribute('aria-hidden');
    $('explore-ui').hidden = true;
    $('fpp-reticle').hidden = true;
    labels.forEach(item=>item.el.tabIndex=-1);
    $('enter-world').focus({preventScroll:true}); requestAnimationFrame(() => engine.resize());
  }
  function openArcade(game='tetris') {
    if(typeof game!=='string')game='tetris';
    openModal('arcade-dialog');
    arcade?.pause();spacewar?.pause();
    const isSpace=game==='spacewar';
    $('tetris-root').hidden=isSpace;$('space-root').hidden=!isSpace;
    $('tab-tetris').setAttribute('aria-pressed',String(!isSpace));$('tab-space').setAttribute('aria-pressed',String(isSpace));
    if(isSpace){
      if(!spacewar)spacewar=new window.ATJSpaceWar($('space-root'));
      spacewar.resume();spacewar.element.focus({preventScroll:true});
    }else{
      if(!arcade)arcade=new window.ATJTetris($('tetris-root'),{onExit:()=>closeModal('arcade-dialog')}).mount();
      arcade.resume();arcade.element.focus({preventScroll:true});
    }
  }
  $('tab-tetris').addEventListener('click',()=>openArcade('tetris'));
  $('tab-space').addEventListener('click',()=>openArcade('spacewar'));
  $('quick-tetris').addEventListener('click',()=>openArcade('tetris'));
  $('quick-space').addEventListener('click',()=>openArcade('spacewar'));
  $('house-door').addEventListener('click',()=>{
    const inside=engine.avatar.z<12.6;
    engine.setTarget(0,inside?16.3:8);$('world').focus({preventScroll:true});
  });
  function togglePOV(){
    const first=engine.getState().view!=='first';engine.setView(first?'first':'follow');
    $('camera-toggle').textContent=first?'FPP':'TPP';
    $('camera-toggle').setAttribute('aria-label',`Switch to ${first?'third':'first'} person`);
    $('camera-toggle').setAttribute('aria-pressed',String(first));
    $('fpp-reticle').hidden=!first;
    $('world').focus({preventScroll:true});
    toast(first?'First person · WASD to walk · drag to look':'Third person · your character leads the way');
  }
  $('overview-button').addEventListener('click',()=>{
    const toOverview = engine.getState().view !== 'overview';
    engine.setView(toOverview ? 'overview' : 'follow');
    $('fpp-reticle').hidden = true;
    $('camera-toggle').textContent='TPP';$('camera-toggle').setAttribute('aria-pressed','false');$('camera-toggle').setAttribute('aria-label','Switch to first person');$('world').focus({preventScroll:true});
  });

  // Interactive Mini-Radar Floor Plan
  const minimap = $('minimap');
  minimap.addEventListener('click', event => {
    if (!ready || !exploring || failed) return;
    const rect = minimap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (event.clientX - rect.left) / rect.width;
    const nz = (event.clientY - rect.top) / rect.height;
    const wx = (nx - 0.5) * 42;
    const wz = -17.5 + nz * 36.5;
    engine.setTarget(wx, wz);
    $('world').focus({ preventScroll: true });
  });

  function drawMinimap(state) {
    const ctx = minimap?.getContext?.('2d');
    if (!ctx || !state) return;
    const w = minimap.width || 148, h = minimap.height || 124;
    const toX = x => w * 0.5 + (x / 42) * w;
    const toY = z => ((z + 17.5) / 36.5) * h;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111218';
    ctx.fillRect(0, 0, w, h);

    // Experience House outline with open front doorway
    const hx1 = toX(-19), hx2 = toX(19), hy1 = toY(-15.8), hy2 = toY(12.6);
    const doorL = toX(-2.72), doorR = toX(2.72);
    ctx.fillStyle = 'rgba(190, 176, 255, 0.07)';
    ctx.fillRect(hx1, hy1, hx2 - hx1, hy2 - hy1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(doorL, hy2);
    ctx.lineTo(hx1, hy2);
    ctx.lineTo(hx1, hy1);
    ctx.lineTo(hx2, hy1);
    ctx.lineTo(hx2, hy2);
    ctx.lineTo(doorR, hy2);
    ctx.stroke();

    // Central sculpture footprint
    ctx.fillStyle = 'rgba(201, 237, 107, 0.22)';
    ctx.beginPath();
    ctx.arc(toX(0), toY(0.55), 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Active walking path
    if (state.target) {
      ctx.strokeStyle = 'rgba(201, 237, 107, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(toX(state.x), toY(state.z));
      ctx.lineTo(toX(state.target.x), toY(state.target.z));
      if (Array.isArray(state.waypoints)) {
        state.waypoints.forEach(wp => ctx.lineTo(toX(wp.x), toY(wp.z)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Zone markers
    (engine.zones || []).forEach(z => {
      const zx = toX(z.x), zy = toY(z.z);
      const isVis = visited.has(z.id);
      const isCur = currentZone === z.id;
      ctx.fillStyle = z.color || '#bea9ff';
      ctx.beginPath();
      ctx.arc(zx, zy, isCur ? 4.2 : 3.0, 0, Math.PI * 2);
      ctx.fill();
      if (isVis || isCur) {
        ctx.strokeStyle = isCur ? '#deff88' : '#ffffffaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(zx, zy, 5.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Player avatar position & facing indicator
    const ax = toX(state.x), ay = toY(state.z);
    const yaw = state.yaw || 0;
    ctx.fillStyle = 'rgba(222, 255, 136, 0.24)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.arc(ax, ay, 11, yaw + Math.PI * 0.5 - 0.45, yaw + Math.PI * 0.5 + 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#deff88';
    ctx.beginPath();
    ctx.arc(ax, ay, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  $('project-grid').innerHTML = projects.map(p => `<button class="project-tile" data-project="${p.id}" aria-label="Walk to ${p.name}"><div class="tile-art">${art(p.id)}<span class="tile-number">${p.number}</span></div><div class="tile-info"><span>${p.category}</span><h3>${p.name}<b aria-hidden="true">↗</b></h3></div></button>`).join('') + '<a class="project-tile tile-contact" href="contact.html"><span class="star">✳</span><h3>The next story<br>could be yours.</h3><span>LET’S TALK ↗</span></a>';
  $('zone-steps').innerHTML = projects.map(p => `<button class="zone-step" data-zone="${p.id}" title="${p.name}" aria-label="Walk to ${p.name}">${p.number}</button>`).join('');
  document.querySelectorAll('[data-project]').forEach(el=>el.addEventListener('click',()=>navigateTo(el.dataset.project)));
  document.querySelectorAll('[data-zone]').forEach(el=>el.addEventListener('click',()=>navigateTo(el.dataset.zone)));
  $('enter-world').addEventListener('click',enterWorld);
  $('back-to-intro').addEventListener('click',backToIntro);
  $('intro-game').addEventListener('click',openArcade);
  $('arcade-button').addEventListener('click',openArcade);
  $('arcade-enter').addEventListener('click',()=>{closeModal('arcade-dialog');enterWorld();});
  $('open-nearby').addEventListener('click',openNearby);
  $('projects-button').addEventListener('click',()=>openModal('project-directory'));
  $('fallback-projects').addEventListener('click',()=>openModal('project-directory'));
  document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();openModal('project-directory');});
  $('help-button').addEventListener('click',()=>openModal('help-dialog'));
  $('next-project').addEventListener('click',()=>showProject(projects[(projects.findIndex(p=>p.id===detailId)+1)%projects.length].id));
  $('camera-toggle').addEventListener('click',togglePOV);
  $('tour-button').addEventListener('click',()=>{
    const enabled = !engine.getState().tour; engine.setAutoTour(enabled);
    toast(enabled ? 'Your tour is underway. Open a story at each stop.' : 'Your pace. Your path.');
    $('world').focus({preventScroll:true});
  });
  document.addEventListener('keydown',event=>{
    if(exploring&&!failed&&!modalOpen()&&event.key.toLowerCase()==='v'&&!event.repeat&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)){event.preventDefault();togglePOV();}
    if (exploring && !failed && !modalOpen() && (event.key==='e'||event.key==='E') && !event.repeat && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); openNearby(); }
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    const release = ()=>{engine?.keys.delete(button.dataset.move);};
    button.addEventListener('pointerdown',event=>{
      if(!ready||!exploring||modalOpen())return;
      event.preventDefault();button.setPointerCapture(event.pointerId);
      engine.setAutoTour(false);engine.keys.add(button.dataset.move);
    });
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });

  $('sound-toggle').addEventListener('click',async()=>{
    try {
      if (!soundContext) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { toast('Ambient audio is unavailable on this device.'); return; }
        soundContext = new Audio(); soundGain = soundContext.createGain(); soundGain.gain.value=0; soundGain.connect(soundContext.destination);
        let destinationNode = soundGain;
        if (typeof soundContext.createBiquadFilter === 'function') {
          const filter = soundContext.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 420;
          filter.connect(soundGain);
          destinationNode = filter;
        }
        // Warm A-minor 9th ambient lounge chord voicing
        [110, 164.81, 196.0, 246.94, 329.63].forEach((frequency,i)=>{
          const oscillator=soundContext.createOscillator(),level=soundContext.createGain();
          oscillator.type = i % 2 === 0 ? 'sine' : 'triangle';
          oscillator.frequency.value=frequency;
          level.gain.value=[.38,.20,.14,.10,.07][i];
          oscillator.connect(level);level.connect(destinationNode);oscillator.start();
        });
      }
      await soundContext.resume(); soundOn=!soundOn; soundGain.gain.setTargetAtTime(soundOn?.05:0,soundContext.currentTime,.5);
      $('sound-toggle').setAttribute('aria-pressed',String(soundOn));$('sound-toggle').setAttribute('aria-label',`Turn ${soundOn?'off':'on'} ambient sound`);
      toast(soundOn?'Ambient lounge sound on.':'Ambient sound off.');
    } catch (_) { toast('Audio couldn’t start. You can keep exploring.'); }
  });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){engine?.stop();soundContext?.suspend();spacewar?.pause();arcade?.pause();}else{if(ready&&!failed)engine?.start();if(soundOn)soundContext?.resume().catch(()=>{});} });

  function positionLabels() {
    const state = engine.getState();
    const sign=engine.projectPoint(0,5.65,13.05);
    const showSign = sign.visible && state.view !== 'first';
    $('house-sign').style.left=`${sign.x}px`;$('house-sign').style.top=`${sign.y}px`;$('house-sign').style.visibility=showSign?'visible':'hidden';
    labels.forEach(item=>{
      const point = engine.projectPoint(item.zone.x,2.9,item.zone.z);
      const onScreen=point.visible && (exploring || point.x>engine.width*.35);
      item.el.style.left=`${point.x}px`;item.el.style.top=`${point.y}px`;item.el.style.opacity=onScreen?'1':'0';
      item.el.style.visibility=onScreen?'visible':'hidden';
    });
  }
  function animateLabels() {
    if (failed) return;
    if (engine.running) positionLabels();
    requestAnimationFrame(animateLabels);
  }
  function loading(progress,label) {
    $('load-percent').textContent=`${Math.round(progress*100).toString().padStart(2,'0')}%`;
    $('load-bar').style.width=`${Math.round(progress*100)}%`;$('load-label').textContent=label;
    $('arcade-ready').textContent=progress<1?'The venue is taking shape while you play.':'Your experience is ready whenever you are.';
    $('arcade-enter').disabled=progress<1;
  }
  function fallback() {
    failed=true;ready=false;engine?.stop();
    $('world-viewport').hidden=true;$('world-fallback').hidden=false;
    $('enter-world').disabled=false;$('enter-world').innerHTML='Explore the projects <span>↗</span>';
    $('load-label').textContent='The project collection is ready';$('load-percent').textContent='';$('load-bar').style.width='100%';
    $('arcade-enter').disabled=false;$('arcade-enter').textContent='Explore the projects ↗';
    if(exploring){exploring=false;$('explore-ui').hidden=true;$('experience').classList.replace('exploring','intro-mode');document.querySelector('.hero').inert=false;document.querySelector('.hero').removeAttribute('aria-hidden');}
  }
  updateVisited();
  engine = new window.ATJEngine($('world'),{
    onReady:loading,
    onZone:setZone,
    onMove:state=>{
      const inside=Math.abs(state.x)<18.7&&state.z<12.6;
      $('house-status').textContent=inside?'INSIDE · THE EXPERIENCE HOUSE':'OUTSIDE · THE ARCADE PATIO';
      $('house-door').textContent=inside?'Go outside ↗':'Enter the house ↗';
      $('tour-label').textContent=state.tour?'Pause tour':'Guide me';$('tour-button').setAttribute('aria-pressed',String(state.tour));
      drawMinimap(state);
    },
    onError:fallback
  });
  engine.setKeys(false);
  engine.init(window.ATJWorld).then(()=>{
    if(engine.failed)return;
    ready=true;
    labels=engine.zones.map(zone=>{
      const el=document.createElement('button');el.className='world-label';el.tabIndex=-1;
      el.setAttribute('aria-label',`Walk to ${byId[zone.id]?.name||zone.label}`);
      el.innerHTML=`<span class="label-name ${(zone.id==='tetris'||zone.id==='spacewar')?'game-label':''}"><b>${byId[zone.id]?.number||zone.number}</b>${byId[zone.id]?.name||zone.label}</span><span class="label-dot"></span>`;
      el.addEventListener('click',()=>navigateTo(zone.id));$('world-labels').appendChild(el);return {zone,el};
    });
    updateVisited();
    $('enter-world').disabled=false;$('enter-world').innerHTML='Enter the experience <span>↗</span>';
    engine.start();positionLabels();drawMinimap(engine.getState());requestAnimationFrame(animateLabels);
    if(location.hash==='#explore'&&!modalOpen())enterWorld();
  }).catch(fallback);
})();
