/* ATJ's event-world: original, procedural portfolio pavilions. */
(function () {
  'use strict';
  const C = {
    ivory:'#eee9dd', snow:'#faf8f0', concrete:'#c6c8c5', side:'#949b98',
    ink:'#242633', black:'#10131c', purple:'#8b5af3', violet:'#bea9ff',
    lime:'#c9ed6b', green:'#66816a', hedge:'#587262', cyan:'#91d5cb',
    pink:'#efb0c8', pinkLight:'#f8cadb', gold:'#d9b771', silver:'#c1c9cd',
    asphalt:'#4c5356', yellow:'#f1c94b', rose:'#cf7978', muted:'#a2a8a1'
  };
  function build(api) {
    const {box,cylinder,sphere,beam,disc}=api;
    const B=(x,y,z,w,h,d,c,r=0)=>box(x,y,z,w,h,d,c,r);
    const Y=(x,y,z,r,h,c,n=20)=>cylinder(x,y,z,r,h,c,n);
    const S=(x,y,z,r,c,n=10)=>sphere(x,y,z,r,c,n);
    const L=(ax,ay,az,bx,by,bz,r,c)=>beam(ax,ay,az,bx,by,bz,r,c);
    const D=(x,y,z,r,c)=>disc(x,y,z,r,c);
    function rounded(x,y,z,w,h,d,r,c){
      B(x,y,z,w-r*2,h,d,c);B(x,y,z,w,h,d-r*2,c);
      for(const sx of [-1,1])for(const sz of [-1,1])Y(x+sx*(w/2-r),y,z+sz*(d/2-r),r,h,c,12);
    }
    function shadow(x,z,r){D(x,.024,z,r,'#b8bbb0');}
    function shrub(x,z,r=.58){
      shadow(x+.12,z+.1,r+.13);Y(x,.23,z,r*.87,.46,C.concrete,12);
      S(x,.75,z,r,C.hedge);S(x-.20,.84,z+.05,r*.68,C.green);
    }
    function tree(x,z,h=3.0){
      shadow(x+.25,z+.1,.85);Y(x,.22,z,.55,.42,C.snow,16);
      Y(x,1,z,.095,1.8,'#7f7967',8);S(x,h-.7,z,.85,C.green);
      S(x-.40,h-.85,z+.06,.58,'#7c9274');S(x+.30,h-.95,z+.25,.61,C.hedge);
    }
    function bollard(x,z){Y(x,.39,z,.07,.78,C.ink,8);Y(x,.79,z,.085,.09,C.lime,8);}
    function bench(x,z,r=0){
      B(x,.52,z,1.6,.16,.58,C.snow,r);
      for(const s of [-.55,.55])B(x+Math.cos(r)*s,.25,z-Math.sin(r)*s,.13,.5,.42,C.ink,r);
    }
    function plantbox(x,z,w=1.5){B(x,.25,z,w,.5,.52,C.snow);for(let i=0;i<3;i++)S(x-w*.34+i*w*.34,.68,z,.32,C.hedge);}
    function pavilion(x,z,w,d,accent){
      rounded(x,-.025,z,w+.38,.19,d+.38,.55,C.concrete);
      rounded(x,.04,z,w,.13,d,.43,C.snow);
      B(x,.12,z+d/2-.12,w-.55,.06,.09,accent);
      // Open-sided gallery shell: backdrop, corner pilasters and a floating cornice.
      B(x,2.5,z-d/2+.18,w-.4,4.8,.25,C.ivory);
      B(x,4.97,z-d/2+.19,w-.20,.22,.57,C.snow);
      for(const s of [-1,1]){
        B(x+s*(w/2-.25),2.51,z-d/2+.5,.32,4.86,.9,C.concrete);
        B(x+s*(w/2-.255),2.51,z-d/2+.985,.08,4.4,.06,accent);
      }
      B(x,4.76,z-d/2+.34,w-1.15,.06,.05,accent);
    }
    function truss(x,z,w,h=4.5){
      const c=C.silver;
      for(const s of [-1,1]){
        const tx=x+s*w/2;
        L(tx-.12,.12,z,tx-.12,h,z,.045,c);L(tx+.12,.12,z,tx+.12,h,z,.045,c);
        for(let y=.3;y<h-.3;y+=.62)L(tx-.12,y,z,tx+.12,y+.6,z,.025,c);
      }
      L(x-w/2,h-.1,z,x+w/2,h-.1,z,.045,c);L(x-w/2,h+.15,z,x+w/2,h+.15,z,.045,c);
      for(let i=-w/2;i<w/2-.35;i+=.55)L(x+i,h-.1,z,x+i+.55,h+.15,z,.025,c);
      for(let i=-1;i<=1;i++){
        B(x+i*w*.3,h-.31,z+.05,.28,.34,.36,C.ink);
        B(x+i*w*.3,h-.47,z+.245,.22,.08,.035,C.violet);
      }
    }
    function screen(x,y,z,w,h,c=C.purple){
      B(x,y,z,w+.16,h+.16,.19,C.ink);B(x,y,z+.105,w,h,.025,c);
    }
    function chair(x,z,r=0,c=C.snow){
      B(x,.46,z,.49,.11,.49,c,r);B(x,.8,z-.205,.48,.68,.08,c,r);
      for(const a of [-.16,.16])for(const b of [-.16,.16])B(x+a,.22,z+b,.045,.44,.045,C.ink);
    }
    function stage(x,z,w,d){
      rounded(x,.26,z,w,.46,d,.20,C.ink);
      B(x,.51,z,w-.14,.04,d-.13,'#3b394a');
      B(x,.40,z+d/2+.025,w-.18,.08,.035,C.purple);
      B(x,.13,z+d/2+.36,w*.45,.24,.63,C.concrete);
    }
    function lightPillar(x,z,h=2.7,c=C.purple){
      B(x,h/2,z,.17,h,.17,C.ink);B(x,h/2,z+.092,.045,h-.15,.02,c);
      Y(x,.10,z,.24,.18,C.ink,12);
    }
    function tulipTable(x,z,r=.65,c=C.snow){
      D(x+.1,.025,z+.12,r+.1,'#b6b8ae');Y(x,.13,z,.30,.13,C.silver);
      Y(x,.52,z,.075,.86,C.silver);Y(x,.97,z,r,.10,c,20);
    }
    function taxi(x,z,rot=0){
      // Models face toward positive X; one three-quarter model turns into the entrance.
      const p=(a,b,c)=>[x+Math.cos(rot)*a+Math.sin(rot)*c,b,z-Math.sin(rot)*a+Math.cos(rot)*c];
      const b=(a,y,c,w,h,d,col)=>{const q=p(a,y,c);B(q[0],q[1],q[2],w,h,d,col,rot);};
      const s=(a,y,c,r,col)=>{const q=p(a,y,c);S(q[0],q[1],q[2],r,col,10);};
      shadow(x,z,1.25);b(0,.53,0,2.5,.59,1.05,C.yellow);b(-.16,.99,0,1.24,.53,.9,C.yellow);
      b(.12,1.01,.462,.76,.31,.024,'#3c575c');b(.12,1.01,-.462,.76,.31,.024,'#3c575c');
      b(-.41,1.01,.462,.30,.31,.025,'#42676c');b(-.41,1.01,-.462,.30,.31,.025,'#42676c');
      b(.49,1.02,0,.06,.30,.81,'#46696c');b(-.80,1.0,0,.04,.25,.78,'#46696c');
      b(-.10,1.32,0,.47,.19,.30,C.snow);b(1.255,.53,0,.06,.20,.74,C.ink);
      for(const a of [-.78,.77])for(const c of [-.54,.54]){s(a,.34,c,.27,C.ink);s(a,.34,c*1.025,.12,C.silver);}
      for(const c of [-.34,.34])b(1.277,.68,c,.03,.13,.17,C.snow);
      b(-.04,.62,.538,1.6,.085,.02,C.ink);b(-.04,.62,-.538,1.6,.085,.02,C.ink);
    }
    function cherry(x,z,scale=1){
      shadow(x+.2,z+.12,scale*.96);Y(x,.21,z,.53,.40,C.ivory);
      L(x,.35,z,x,2.1*scale,z,.12*scale,'#897568');
      L(x,1.45*scale,z,x-.65*scale,2.42*scale,z-.16,.07*scale,'#897568');
      L(x,1.75*scale,z,x+.68*scale,2.56*scale,z+.18,.065*scale,'#897568');
      S(x,2.75*scale,z,.82*scale,C.pink);S(x-.68*scale,2.51*scale,z-.16,.67*scale,C.pinkLight);
      S(x+.65*scale,2.6*scale,z+.16,.63*scale,C.pinkLight);S(x+.13,3.22*scale,z-.1,.5*scale,C.pinkLight);
    }
    function lantern(x,z){
      B(x,.12,z,.42,.22,.42,C.concrete);B(x,.69,z,.18,1.0,.18,C.concrete);
      B(x,1.22,z,.60,.14,.60,C.ink);B(x,1.02,z,.40,.30,.40,C.gold);
      B(x,1.37,z,.75,.15,.73,C.ink);B(x,1.47,z,.43,.07,.43,C.ink);
    }
    function skyline(x,z){
      const towers=[[-2.65,1.25,.61],[-1.9,2.2,.65],[-1.06,3.4,.72],[-.13,2.5,.72],[.76,1.73,.62],[1.64,2.9,.76],[2.56,1.4,.67]];
      for(let k=0;k<towers.length;k++){
        const [dx,h,w]=towers[k];B(x+dx,.5+h/2,z,w,h,.60,k%2?C.violet:C.purple);
        B(x+dx,h+.56,z,w*.77,.12,.51,C.snow);
        for(let yy=.85;yy<h+.2;yy+=.53)for(const xx of [-.16,.16])B(x+dx+xx,yy,z+.309,.105,.22,.02,C.lime);
      }
      L(x-1.06,3.9,z,x-1.06,4.52,z,.025,C.snow);
      B(x-1.06,4.03,z,.28,.50,.3,C.violet);
    }

    // A warm architectural island hovering over a charcoal studio floor.
    B(0,-1.55,0,145,.20,145,'#20252a');
    rounded(0,-1.05,.5,43,.34,36.8,2.0,'#555e60');
    rounded(0,-.72,.5,42.5,.40,36.4,1.75,C.side);
    rounded(0,-.34,.5,42,.44,36,1.6,C.concrete);
    rounded(0,-.11,.5,41.5,.24,35.5,1.35,C.ivory);
    // Delicate paver joints, with a broad open promenade at the heart.
    for(let x=-19;x<=19;x+=2)B(x,.016,.5,.015,.012,33.5,'#d6d5ca');
    for(let z=-15;z<=17;z+=2)B(0,.017,z,39,.012,.015,'#d6d5ca');
    B(0,.026,1,5.2,.025,30.3,'#dedfd4');
    for(const s of [-1,1])B(s*2.69,.041,1,.055,.035,30.3,C.snow);
    B(0,.049,1,5.10,.018,.08,'#c8cabc');
    // Greenway paths lead to each project; these dots guide rather than block movement.
    for(let z=-13;z<=15;z+=1.15)D(.0,.058,z,.10,C.cyan);
    for(const z of [-6.2,8.2])for(const s of [-1,1])for(let x=2;x<10;x+=1.1)D(s*x,.067,z,.09,C.cyan);
    for(const x of [-20,20])for(const z of [-14,-7,0,7,14]){if(z===0)tree(x,z,3.2);else shrub(x,z,.54);}
    for(const z of [-16.25,17.25])for(const x of [-15,-7,7,15])shrub(x,z,.58);
    for(const s of [-1,1])for(const z of [-9,-3,3,10,15])bollard(s*3.18,z);

    // 01 / THE TAXI PROJECT — a miniature Mumbai street inside the gallery.
    pavilion(-13,6.3,10,10,C.yellow);
    B(-13,.11,6.9,8.6,.055,6.8,C.asphalt);
    for(let z=4.2;z<10;z+=1.35)B(-13,.152,z,.08,.025,.68,C.snow);
    B(-16.97,.17,6.9,.55,.19,6.8,C.concrete);B(-9.03,.17,6.9,.55,.19,6.8,C.concrete);
    screen(-13,2.8,1.72,6.9,3.18,C.yellow);
    // Graphic stripes and layered festival forms on the backdrop.
    for(let i=-2;i<=2;i++)B(-13+i*1.05,2.8,1.86,.17,2.72,.045,i%2?C.snow:C.ink,-.16);
    B(-13,2.75,1.9,5.7,.62,.07,C.yellow);
    taxi(-14.78,6.4,.20);taxi(-11.2,8.0,-.12);
    taxi(-11.1,4.45,0);
    for(const x of [-16.5,-9.55]){
      Y(x,1.62,8.8,.055,3.2,C.ink,10);L(x,3.2,8.8,x-.6,3.2,8.8,.045,C.ink);
      B(x-.58,3.13,8.8,.51,.12,.30,C.snow);
    }
    B(-16.5,1.75,3.4,.11,3.4,.11,C.ink);B(-16.5,2.7,3.4,.70,.73,.10,C.yellow);
    shrub(-17.4,10.9,.44);shrub(-8.6,10.9,.44);
    lightPillar(-8.55,3.1,3.5,C.yellow);

    // 02 / PRIVILEGE CLUB JAPAN — arrival gate, blossom garden and event stage.
    pavilion(-13,-7,10,10,C.rose);
    B(-13,.132,-6.3,3.0,.05,7.75,'#dfd5c5');
    for(let z=-9.8;z<-2.1;z+=.7)B(-13,.169,z,2.1,.065,.40,C.concrete);
    stage(-13,-10.1,6.7,2.0);
    screen(-13,2.79,-11.40,6.65,3.05,'#e7c7be');
    // Sun disc stands proud of the back wall as a geometric set element.
    S(-13,3.0,-11.22,1.16,C.rose,22);B(-13,1.56,-11.02,6.65,.48,.12,'#bcaca7');
    // Torii entrance with sculpted, slightly lifted beam ends.
    for(const s of [-1,1]){
      Y(-13+s*2.16,2.0,-4.2,.15,4.0,C.rose,12);
      Y(-13+s*2.16,.22,-4.2,.27,.42,C.ink,12);
      B(-13+s*2.43,4.23,-4.2,1.10,.22,.50,C.ink,-s*.07);
    }
    B(-13,3.30,-4.2,5.08,.19,.27,C.rose);B(-13,4.10,-4.2,5.2,.27,.48,C.rose);
    B(-13,4.30,-4.2,5.35,.17,.57,C.ink);B(-13,3.73,-4.2,.12,.63,.24,C.rose);
    cherry(-16.48,-6.4,1.05);cherry(-9.44,-6.9,1.12);
    cherry(-16.55,-10.6,.78);cherry(-9.55,-10.45,.76);
    lantern(-15.10,-3.0);lantern(-10.9,-3.0);
    for(const side of [-1,1])for(let k=0;k<3;k++)D(-13+side*(1.4+k*.40),.18,-6.2+k*.58,.08,C.pink);

    // 03 / PRIVILEGE CLUB USA — skyline set, curved celebratory steps and light towers.
    pavilion(0,-12.75,9.2,6.4,C.purple);
    stage(0,-13.65,7.65,3.25);
    screen(0,3.0,-15.55,7.6,3.5,'#222237');
    skyline(0,-14.35);
    for(const s of [-1,1]){
      lightPillar(s*3.57,-12.32,3.8,C.lime);
      Y(s*3.65,.45,-10.10,.48,.79,C.purple,18);S(s*3.65,1.0,-10.10,.36,C.lime);
    }
    B(0,.15,-11.58,4.15,.27,.62,C.concrete);B(0,.08,-11.01,4.65,.13,.56,C.ivory);
    for(let i=0;i<5;i++)B(-2.5+i*1.25,4.31,-15.38,.07,.09,.03,C.lime);
    truss(0,-14.92,8.5,5.15);

    // 04 / ELITE NIGHT — a black-tie gala with sculptural gold arches and banquet tables.
    pavilion(13,-7,10,10,C.gold);
    B(13,.132,-7,8.5,.05,8.8,'#dad5ca');
    stage(13,-10.28,7.7,2.7);
    screen(13,2.75,-11.4,7.15,3.05,'#2b2730');
    for(const dx of [-2.45,0,2.45]){
      const ax=13+dx;
      for(const s of [-1,1])Y(ax+s*.85,2.2,-11.15,.075,2.9,C.gold,10);
      for(let i=0;i<9;i++){
        const a=i*Math.PI/9,b=(i+1)*Math.PI/9;
        L(ax+Math.cos(a)*.85,3.65+Math.sin(a)*.85,-11.15,ax+Math.cos(b)*.85,3.65+Math.sin(b)*.85,-11.15,.074,C.gold);
      }
    }
    // A hint of Paris in the gala's centerpiece; an open metallic tower sculpture.
    const tx=13,tz=-10.14;
    for(const sx of [-1,1])for(const sz of [-1,1])L(tx+sx*.52,.58,tz+sz*.38,tx+sx*.10,3.36,tz+sz*.08,.037,C.gold);
    B(tx,1.44,tz,.72,.10,.55,C.gold);B(tx,2.30,tz,.42,.10,.29,C.gold);L(tx,3.35,tz,tx,3.97,tz,.025,C.gold);
    for(const x of [10.1,15.9])for(const z of [-6.9,-3.6]){
      tulipTable(x,z,.80,C.snow);Y(x,1.12,z,.18,.20,C.gold,12);S(x,1.42,z,.25,C.pinkLight);
      for(const off of [-1,1]){chair(x+off*.89,z,off*Math.PI*.5,'#ddd3c0');}
    }
    for(const s of [-1,1]){
      Y(13+s*4.30,1.43,-8.5,.11,2.8,C.gold,10);S(13+s*4.30,3.0,-8.5,.40,C.snow,16);
      plantbox(13+s*3.7,-2.22,1.35);
    }

    // 05 / AIMC — conference theatre with a superwide LED set and ordered seats.
    pavilion(13,6.3,10,10,C.purple);
    stage(13,3.38,8.15,2.75);
    screen(13,2.73,1.74,7.7,3.3,C.purple);
    B(13,2.72,1.89,1.70,2.74,.03,C.violet,.19);
    B(13,2.72,1.92,1.0,2.34,.03,C.purple,.19);
    B(10.20,2.0,1.90,1.34,.20,.04,C.lime);B(15.50,3.38,1.90,1.83,.13,.04,C.lime);
    B(15.70,1.21,3.52,.64,1.36,.55,C.snow);B(15.70,1.89,3.52,.89,.12,.71,C.ink);
    B(15.70,1.35,3.82,.40,.49,.04,C.purple);
    for(let row=0;row<3;row++)for(const group of [-1,1])for(let seat=0;seat<3;seat++)chair(13+group*(.86+seat*.84),6.08+row*1.30,0,row%2?C.ivory:C.snow);
    truss(13,2.0,8.9,5.35);
    for(const x of [8.65,17.35]){B(x,1.11,4.1,.56,1.93,.6,C.ink);B(x,1.11,4.415,.39,1.63,.028,'#3a3b46');}
    shrub(8.57,10.94,.45);shrub(17.43,10.94,.45);

    // A monumental welcome sculpture: an abstract A, a suspended orb, and a calm lounge.
    rounded(0,.09,1.0,6.4,.16,5.7,.95,C.snow);
    Y(0,.21,.55,1.65,.20,C.concrete,28);
    L(-1.40,.32,.52,0,4.68,.52,.20,C.snow);L(0,4.68,.52,1.4,.32,.52,.20,C.snow);
    L(-.83,2.10,.52,.83,2.10,.52,.14,C.purple);S(0,2.99,.52,.43,C.lime,16);
    // Low floating hoop made of slim gold members.
    for(let i=0;i<30;i++){
      const a=i*Math.PI*2/30,b=(i+1)*Math.PI*2/30;
      L(Math.cos(a)*1.91,2.56+Math.sin(a)*.25,.55+Math.sin(a)*1.55,Math.cos(b)*1.91,2.56+Math.sin(b)*.25,.55+Math.sin(b)*1.55,.037,C.gold);
    }
    for(const s of [-1,1]){
      bench(s*5.1,1.6,Math.PI*.5);tree(s*5.1,-1.3,3.15);plantbox(s*5.1,4.0,1.8);
      tulipTable(s*4.32,1.52,.38,C.ivory);
    }

    // THE EXPERIENCE HOUSE: a continuous building with a real walk-through doorway.
    // The ceiling is a separate mesh, cut away inside so the TPP camera stays useful.
    B(0,.10,-1.6,38,.12,28.4,C.ivory);
    B(-19,3.1,-1.6,.35,6.2,28.4,C.concrete);
    B(19,3.1,-1.6,.35,6.2,28.4,C.concrete);
    B(0,3.1,-15.8,38,6.2,.35,C.concrete);
    for(const side of [-1,1]) {
      B(side*11,3.1,12.6,16,6.2,.35,C.ivory);
      B(side*11,2.9,12.81,14,2.5,.06,C.ink);
      for(let k=0;k<6;k++)B(side*(4.6+k*2.4),2.9,12.86,.045,2.5,.05,C.violet);
      B(side*3.15,2.3,12.6,.3,4.6,.7,C.purple);
    }
    B(0,5.45,12.6,6.6,1.5,.7,C.purple);
    
    // Patio arcade cabinets: immediately visible from the front door.
    for(const x of [-6,6]) {
      B(x,.14,15.3,3.3,.18,2.2,C.concrete);
      B(x,1.2,15.3,1.1,2.4,.8,C.ink);
      B(x,1.75,15.75,.87,1.1,.04,x<0?C.purple:C.black);
      B(x,2.57,15.3,1.35,.25,1,C.lime);
      B(x,.95,15.85,1.15,.2,.35,C.purple);
      S(x-.25,1.15,15.85,.09,C.lime);S(x+.28,1.07,15.88,.065,C.rose);
    }
    // Blocks and stars on the cabinet screens distinguish the two games.
    for(let i=0;i<6;i++)B(-6+(i%3-1)*.21,1.4+intFloor(i/3)*.23,15.79,.19,.19,.02,C.lime);
    function intFloor(n){return Math.floor(n);}
    for(let i=0;i<5;i++)S(6+(i%3-1)*.24,1.5+Math.floor(i/3)*.36,15.80,.065,C.cyan);

    // CONTACT / an open reception portal on the arrival edge of the island.
    rounded(0,.07,13.7,8.4,.15,5.45,.6,C.snow);
    for(const s of [-1,1]){
      B(s*3.50,2.70,14.85,.48,5.26,.52,C.purple);
      B(s*3.22,2.69,14.83,.055,4.89,.56,C.violet);
    }
    B(0,5.28,14.85,7.5,.46,.64,C.purple);B(0,5.07,15.18,6.65,.065,.04,C.lime);
    // Reception counter sits to one side, leaving a generous route through the portal.
    rounded(-2.08,.72,12.95,2.45,1.33,1.02,.20,C.concrete);
    rounded(-2.08,1.44,12.95,2.59,.15,1.14,.20,C.snow);
    B(-2.08,.96,13.48,1.8,.13,.024,C.purple);
    B(-2.0,1.72,12.95,.58,.42,.07,C.ink,-.10);
    B(-2.0,1.69,13.002,.49,.29,.016,C.violet,-.10);
    for(const s of [-1,1])shrub(s*3.41,11.73,.53);
    bench(2.03,12.67,Math.PI*.5);D(.88,.167,13.10,.50,C.lime);
    for(let x=-2;x<=2;x+=.65)D(x,.155,16.10,.085,C.purple);

    return {
      roof: {x:0,y:6.25,z:-1.6,w:38.6,h:.22,d:29,color:C.purple},
      zones:[
        {id:'tetris',x:-6,z:16,label:'Tetris · PLAY',number:'▦',color:C.lime},
        {id:'spacewar',x:6,z:16,label:'Space War · PLAY',number:'✦',color:C.cyan},
        {id:'taxi',x:-10.8,z:10.1,label:'The Taxi Project',number:'01',color:C.yellow},
        {id:'japan',x:-13,z:-2.5,label:'Privilege Club Japan',number:'02',color:C.rose},
        {id:'usa',x:0,z:-9.45,label:'Privilege Club USA',number:'03',color:C.purple},
        {id:'elite',x:13,z:-2.4,label:'Elite Night',number:'04',color:C.gold},
        {id:'aimc',x:13,z:10.5,label:'AIMC 2026',number:'05',color:C.purple},
        {id:'contact',x:.88,z:13.10,label:'Let’s make it happen',number:'06',color:C.lime}
      ],
      bounds:{minX:-20,maxX:20,minZ:-16,maxZ:17},
      spawn:{x:0,z:16.3}
    };
  }
  window.ATJWorld={build};
})();
