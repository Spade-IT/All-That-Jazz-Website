/* ATJ's event-world V3: procedural architectural pavilions, dynamic stage lighting,
 * separated cutaway house walls, occluder groups, and animated 3D centerpieces. */
(function () {
  'use strict';
  const C = {
    ivory: '#eee9dd', snow: '#faf8f0', concrete: '#c6c8c5', side: '#949b98',
    ink: '#242633', black: '#10131c', purple: '#8b5af3', violet: '#bea9ff',
    lime: '#c9ed6b', green: '#66816a', hedge: '#587262', cyan: '#91d5cb',
    pink: '#efb0c8', pinkLight: '#f8cadb', gold: '#d9b771', goldBright: '#f6df98',
    silver: '#c1c9cd', asphalt: '#4c5356', yellow: '#f1c94b', amber: '#ffae38',
    rose: '#cf7978', muted: '#a2a8a1', wood: '#897568', slate: '#363948'
  };

  function build(api) {
    const { box, cylinder, sphere, beam, disc } = api;
    const G = (name, pivot = [0, 0, 0]) => api.setGroup?.(name, pivot);
    const B = (x, y, z, w, h, d, c, r = 0) => box(x, y, z, w, h, d, c, r);
    const Y = (x, y, z, r, h, c, n = 20) => cylinder(x, y, z, r, h, c, n);
    const S = (x, y, z, r, c, n = 12) => sphere(x, y, z, r, c, n);
    const L = (ax, ay, az, bx, by, bz, r, c) => beam(ax, ay, az, bx, by, bz, r, c);
    const D = (x, y, z, r, c) => disc(x, y, z, r, c);

    function rounded(x, y, z, w, h, d, r, c) {
      B(x, y, z, w - r * 2, h, d, c);
      B(x, y, z, w, h, d - r * 2, c);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        Y(x + sx * (w / 2 - r), y, z + sz * (d / 2 - r), r, h, c, 14);
      }
    }
    function shadow(x, z, r) { D(x, .024, z, r, '#b4b7ac'); }
    function shrub(x, z, r = .58) {
      shadow(x + .12, z + .1, r + .13);
      Y(x, .23, z, r * .87, .46, C.concrete, 14);
      Y(x, .45, z, r * .92, .05, C.snow, 14);
      S(x, .75, z, r, C.hedge, 12);
      S(x - .20, .86, z + .05, r * .68, C.green, 10);
      S(x + .18, .78, z - .12, r * .55, '#769178', 10);
    }
    function tree(x, z, h = 3.0) {
      shadow(x + .25, z + .1, .88);
      Y(x, .22, z, .56, .42, C.snow, 16);
      Y(x, .43, z, .46, .04, '#6d6558', 14);
      Y(x, 1.05, z, .095, 1.85, '#7f7967', 10);
      L(x, 1.4, z, x - .32, 2.0, z + .05, .055, '#7f7967');
      L(x, 1.55, z, x + .28, 2.05, z + .18, .05, '#7f7967');
      S(x, h - .68, z, .88, C.green, 14);
      S(x - .40, h - .85, z + .06, .60, '#7c9274', 12);
      S(x + .30, h - .95, z + .25, .63, C.hedge, 12);
      S(x + .05, h - .25, z - .1, .52, '#86a27e', 10);
    }
    function bollard(x, z) {
      shadow(x + .04, z + .04, .16);
      Y(x, .39, z, .072, .78, C.ink, 10);
      G('emissive');
      Y(x, .79, z, .088, .10, C.lime, 10);
      G('scene');
      Y(x, .86, z, .075, .04, C.ink, 10);
    }
    function bench(x, z, r = 0) {
      shadow(x, z, .72);
      B(x, .52, z, 1.62, .14, .58, C.snow, r);
      B(x, .59, z, 1.54, .04, .50, '#e5dec9', r);
      for (const s of [-.55, .55]) B(x + Math.cos(r) * s, .25, z - Math.sin(r) * s, .13, .5, .44, C.ink, r);
    }
    function plantbox(x, z, w = 1.5) {
      B(x, .25, z, w, .5, .54, C.snow);
      B(x, .51, z, w + .04, .05, .58, C.concrete);
      for (let i = 0; i < 3; i++) {
        S(x - w * .34 + i * w * .34, .69, z, .33, C.hedge, 10);
        S(x - w * .34 + i * w * .34 + .06, .82, z + .04, .21, C.green, 8);
      }
    }
    function pavilion(x, z, w, d, accent) {
      G('scene');
      rounded(x, -.025, z, w + .42, .19, d + .42, .56, C.concrete);
      rounded(x, .04, z, w, .13, d, .44, C.snow);
      G('emissive');
      B(x, .12, z + d / 2 - .12, w - .55, .065, .095, accent);
      B(x, .12, z - d / 2 + .12, w - .55, .05, .06, accent);
      // Open-sided gallery shell: backdrop and corner pilasters placed in 'occluders'
      // so the shader automatically opens a clear view cone if the character steps behind them.
      G('occluders');
      B(x, 2.5, z - d / 2 + .18, w - .4, 4.8, .26, C.ivory);
      B(x, 4.97, z - d / 2 + .19, w - .18, .24, .60, C.snow);
      for (const s of [-1, 1]) {
        B(x + s * (w / 2 - .25), 2.51, z - d / 2 + .5, .34, 4.86, .92, C.concrete);
        G('emissive');
        B(x + s * (w / 2 - .255), 2.51, z - d / 2 + .99, .085, 4.42, .065, accent);
        G('occluders');
      }
      G('emissive');
      B(x, 4.76, z - d / 2 + .35, w - 1.12, .065, .055, accent);
      G('scene');
    }
    function truss(x, z, w, h = 4.5) {
      G('occluders');
      const c = C.silver;
      for (const s of [-1, 1]) {
        const tx = x + s * w / 2;
        L(tx - .12, .12, z, tx - .12, h, z, .045, c);
        L(tx + .12, .12, z, tx + .12, h, z, .045, c);
        for (let y = .3; y < h - .3; y += .62) L(tx - .12, y, z, tx + .12, y + .6, z, .025, c);
      }
      L(x - w / 2, h - .1, z, x + w / 2, h - .1, z, .045, c);
      L(x - w / 2, h + .15, z, x + w / 2, h + .15, z, .045, c);
      for (let i = -w / 2; i < w / 2 - .35; i += .55) L(x + i, h - .1, z, x + i + .55, h + .15, z, .025, c);
      for (let i = -1; i <= 1; i++) {
        B(x + i * w * .3, h - .31, z + .05, .28, .34, .36, C.ink);
        G('emissive');
        B(x + i * w * .3, h - .47, z + .245, .22, .085, .04, C.violet);
        G('occluders');
      }
      G('scene');
    }
    function screen(x, y, z, w, h, c = C.purple) {
      G('occluders');
      B(x, y, z, w + .20, h + .20, .20, C.ink);
      B(x, y, z + .106, w, h, .028, c);
      G('scene');
    }
    function chair(x, z, r = 0, c = C.snow) {
      B(x, .46, z, .49, .11, .49, c, r);
      B(x, .8, z - .205, .48, .68, .08, c, r);
      for (const a of [-.16, .16]) for (const b of [-.16, .16]) B(x + a, .22, z + b, .045, .44, .045, C.ink);
    }
    function stage(x, z, w, d) {
      rounded(x, .26, z, w, .46, d, .22, C.ink);
      B(x, .51, z, w - .14, .042, d - .13, '#3b394a');
      G('emissive');
      B(x, .40, z + d / 2 + .026, w - .18, .082, .038, C.purple);
      G('scene');
      B(x, .13, z + d / 2 + .36, w * .45, .24, .63, C.concrete);
      B(x, .25, z + d / 2 + .22, w * .42, .04, .30, C.snow);
    }
    function lightPillar(x, z, h = 2.7, c = C.purple) {
      B(x, h / 2, z, .18, h, .18, C.ink);
      G('emissive');
      B(x, h / 2, z + .095, .052, h - .15, .025, c);
      B(x, h / 2, z - .095, .04, h - .25, .02, c);
      G('scene');
      Y(x, .10, z, .25, .18, C.ink, 14);
    }
    function tulipTable(x, z, r = .65, c = C.snow) {
      D(x + .1, .025, z + .12, r + .1, '#b6b8ae');
      Y(x, .13, z, .30, .13, C.silver, 16);
      Y(x, .52, z, .075, .86, C.silver, 12);
      Y(x, .97, z, r, .10, c, 24);
    }
    function taxi(x, z, rot = 0) {
      const p = (a, b, c) => [x + Math.cos(rot) * a + Math.sin(rot) * c, b, z - Math.sin(rot) * a + Math.cos(rot) * c];
      const b = (a, y, c, w, h, d, col) => { const q = p(a, y, c); B(q[0], q[1], q[2], w, h, d, col, rot); };
      const s = (a, y, c, r, col) => { const q = p(a, y, c); S(q[0], q[1], q[2], r, col, 12); };
      shadow(x, z, 1.28);
      // Iconic Kolkata yellow Ambassador silhouette with festive Pujo art stripe
      b(0, .53, 0, 2.52, .59, 1.06, C.yellow);
      b(-.16, .99, 0, 1.26, .54, .91, C.yellow);
      b(.12, 1.01, .465, .76, .31, .026, '#3c575c');
      b(.12, 1.01, -.465, .76, .31, .026, '#3c575c');
      b(-.41, 1.01, .465, .30, .31, .026, '#42676c');
      b(-.41, 1.01, -.465, .30, .31, .026, '#42676c');
      b(.49, 1.02, 0, .06, .30, .82, '#46696c');
      b(-.80, 1.0, 0, .04, .25, .78, '#46696c');
      G('emissive');
      b(-.10, 1.33, 0, .48, .19, .30, C.snow);
      b(-.10, 1.33, 0, .40, .11, .32, C.amber);
      G('scene');
      b(1.26, .53, 0, .07, .20, .76, C.silver);
      b(-1.26, .51, 0, .06, .16, .82, C.silver);
      for (const a of [-.78, .77]) for (const c of [-.54, .54]) {
        s(a, .34, c, .27, C.ink);
        s(a, .34, c * 1.03, .13, C.silver);
      }
      G('emissive');
      for (const c of [-.34, .34]) {
        b(1.28, .68, c, .035, .14, .18, C.snow);
        b(-1.27, .64, c, .03, .12, .14, C.rose);
      }
      G('scene');
      // Festive Pujo art motif bands along the doors
      b(-.04, .62, .54, 1.65, .09, .024, C.ink);
      b(-.04, .62, -.54, 1.65, .09, .024, C.ink);
      b(-.08, .52, .542, 1.15, .06, .026, C.rose);
      b(-.08, .52, -.542, 1.15, .06, .026, C.rose);
    }
    function cherry(x, z, scale = 1) {
      shadow(x + .2, z + .12, scale * .98);
      Y(x, .21, z, .54, .40, C.ivory, 16);
      L(x, .35, z, x, 2.1 * scale, z, .12 * scale, C.wood);
      L(x, 1.45 * scale, z, x - .65 * scale, 2.42 * scale, z - .16, .07 * scale, C.wood);
      L(x, 1.75 * scale, z, x + .68 * scale, 2.56 * scale, z + .18, .065 * scale, C.wood);
      S(x, 2.75 * scale, z, .84 * scale, C.pink, 14);
      S(x - .68 * scale, 2.51 * scale, z - .16, .68 * scale, C.pinkLight, 12);
      S(x + .65 * scale, 2.6 * scale, z + .16, .64 * scale, C.pinkLight, 12);
      S(x + .13, 3.22 * scale, z - .1, .52 * scale, '#fde0ec', 12);
    }
    function lantern(x, z) {
      B(x, .12, z, .44, .22, .44, C.concrete);
      B(x, .69, z, .18, 1.0, .18, C.concrete);
      B(x, 1.22, z, .62, .14, .62, C.ink);
      G('emissive');
      B(x, 1.02, z, .41, .31, .41, C.goldBright);
      G('scene');
      B(x, 1.37, z, .76, .15, .74, C.ink);
      B(x, 1.47, z, .44, .07, .44, C.ink);
    }
    function skyline(x, z) {
      G('occluders');
      const towers = [
        [-2.65, 1.35, .62], [-1.9, 2.3, .66], [-1.06, 3.45, .74],
        [-.13, 2.55, .74], [.76, 1.80, .64], [1.64, 2.95, .78], [2.56, 1.48, .68]
      ];
      for (let k = 0; k < towers.length; k++) {
        const [dx, h, w] = towers[k];
        B(x + dx, .5 + h / 2, z, w, h, .62, k % 2 ? C.violet : C.purple);
        B(x + dx, h + .56, z, w * .77, .12, .52, C.snow);
        G('emissive');
        for (let yy = .85; yy < h + .2; yy += .52) {
          for (const xx of [-.16, .16]) B(x + dx + xx, yy, z + .315, .11, .22, .025, C.lime);
        }
        G('occluders');
      }
      L(x - 1.06, 3.9, z, x - 1.06, 4.58, z, .028, C.snow);
      B(x - 1.06, 4.05, z, .30, .52, .32, C.violet);
      G('scene');
    }

    // =========================================================================
    // BASE ARCHITECTURAL ISLAND & PROMENADE
    // =========================================================================
    G('scene');
    B(0, -1.55, 0, 145, .20, 145, '#1d2128');
    rounded(0, -1.05, .5, 43.2, .34, 37.0, 2.0, '#4f575a');
    rounded(0, -.72, .5, 42.6, .40, 36.5, 1.75, C.side);
    rounded(0, -.34, .5, 42.1, .44, 36.1, 1.6, C.concrete);
    rounded(0, -.11, .5, 41.6, .24, 35.6, 1.35, C.ivory);

    // Delicate architectural paver joints and central promenade
    for (let x = -19; x <= 19; x += 2) B(x, .016, .5, .016, .012, 33.5, '#d5d4c8');
    for (let z = -15; z <= 17; z += 2) B(0, .017, z, 39, .012, .016, '#d5d4c8');
    B(0, .026, 1, 5.25, .025, 30.4, '#dfdfd5');
    for (const s of [-1, 1]) B(s * 2.70, .041, 1, .06, .036, 30.4, C.snow);
    B(0, .049, 1, 5.12, .018, .08, '#c8cabc');

    // Illuminated Greenway guide nodes leading to each room
    G('emissive');
    for (let z = -13; z <= 15; z += 1.15) D(.0, .058, z, .105, C.cyan);
    for (const z of [-6.2, 8.2]) for (const s of [-1, 1]) for (let x = 2; x < 10; x += 1.1) D(s * x, .067, z, .095, C.cyan);
    G('scene');

    for (const x of [-20, 20]) for (const z of [-14, -7, 0, 7, 14]) {
      if (z === 0) tree(x, z, 3.25); else shrub(x, z, .55);
    }
    for (const z of [-16.25, 17.25]) for (const x of [-15, -7, 7, 15]) shrub(x, z, .58);
    for (const s of [-1, 1]) for (const z of [-9, -3, 3, 10, 15]) bollard(s * 3.18, z);

    // =========================================================================
    // 01 / THE TAXI PROJECT (KOLKATA BRAND ACTIVATION)
    // =========================================================================
    pavilion(-13, 6.3, 10, 10, C.yellow);
    B(-13, .11, 6.9, 8.6, .055, 6.8, C.asphalt);
    for (let z = 4.2; z < 10; z += 1.35) B(-13, .152, z, .085, .026, .68, C.snow);
    B(-16.97, .17, 6.9, .56, .19, 6.8, C.concrete);
    B(-9.03, .17, 6.9, .56, .19, 6.8, C.concrete);
    screen(-13, 2.8, 1.72, 6.9, 3.18, C.yellow);
    G('occluders');
    for (let i = -2; i <= 2; i++) B(-13 + i * 1.05, 2.8, 1.86, .17, 2.72, .048, i % 2 ? C.snow : C.ink, -.16);
    G('emissive');
    B(-13, 2.75, 1.9, 5.7, .62, .072, C.yellow);
    G('scene');
    taxi(-14.78, 6.4, .20);
    taxi(-11.2, 8.0, -.12);
    taxi(-11.1, 4.45, 0);
    for (const x of [-16.5, -9.55]) {
      Y(x, 1.62, 8.8, .055, 3.2, C.ink, 10);
      L(x, 3.2, 8.8, x - .6, 3.2, 8.8, .045, C.ink);
      G('emissive');
      B(x - .58, 3.13, 8.8, .52, .13, .31, C.snow);
      G('scene');
    }
    B(-16.5, 1.75, 3.4, .11, 3.4, .11, C.ink);
    G('emissive');
    B(-16.5, 2.7, 3.4, .72, .74, .11, C.yellow);
    G('scene');
    shrub(-17.4, 10.9, .44);
    shrub(-8.6, 10.9, .44);
    lightPillar(-8.55, 3.1, 3.5, C.yellow);
    // Animated Pujo festival kinetic sunburst above the Taxi backdrop
    G('anim_taxi', [-13, 4.15, 2.15]);
    S(-13, 4.15, 2.15, .28, C.amber, 14);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      B(-13 + Math.cos(a) * .48, 4.15 + Math.sin(a) * .48, 2.15, .14, .14, .06, i % 2 ? C.yellow : C.rose, a);
    }
    G('scene');

    // =========================================================================
    // 02 / PRIVILEGE CLUB JAPAN (DESTINATION EXPERIENCE)
    // =========================================================================
    pavilion(-13, -7, 10, 10, C.rose);
    B(-13, .132, -6.3, 3.0, .05, 7.75, '#dfd5c5');
    for (let z = -9.8; z < -2.1; z += .7) B(-13, .169, z, 2.1, .065, .40, C.concrete);
    stage(-13, -10.1, 6.7, 2.0);
    screen(-13, 2.79, -11.40, 6.65, 3.05, '#e7c7be');
    G('emissive');
    S(-13, 3.0, -11.22, 1.16, C.rose, 24);
    G('occluders');
    B(-13, 1.56, -11.02, 6.65, .48, .12, '#bcaca7');
    // Torii entrance
    for (const s of [-1, 1]) {
      Y(-13 + s * 2.16, 2.0, -4.2, .155, 4.0, C.rose, 14);
      Y(-13 + s * 2.16, .22, -4.2, .28, .42, C.ink, 14);
      B(-13 + s * 2.43, 4.23, -4.2, 1.12, .22, .52, C.ink, -s * .07);
    }
    B(-13, 3.30, -4.2, 5.10, .19, .28, C.rose);
    B(-13, 4.10, -4.2, 5.22, .27, .49, C.rose);
    B(-13, 4.30, -4.2, 5.38, .17, .58, C.ink);
    B(-13, 3.73, -4.2, .13, .63, .25, C.rose);
    G('scene');
    cherry(-16.48, -6.4, 1.05);
    cherry(-9.44, -6.9, 1.12);
    cherry(-16.55, -10.6, .78);
    cherry(-9.55, -10.45, .76);
    lantern(-15.10, -3.0);
    lantern(-10.9, -3.0);
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) D(-13 + side * (1.4 + k * .40), .18, -6.2 + k * .58, .085, C.pink);
    // Animated floating blossom petals & warm lantern orbs in Japan
    G('anim_japan', [-13, 2.6, -6.8]);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      S(-13 + Math.cos(a) * 2.2, 2.3 + (i % 3) * .45, -6.8 + Math.sin(a) * 1.8, .09, i % 2 ? C.pinkLight : C.pink, 8);
    }
    G('scene');

    // =========================================================================
    // 03 / PRIVILEGE CLUB USA (CHANNEL EXPERIENCE)
    // =========================================================================
    pavilion(0, -12.75, 9.2, 6.4, C.purple);
    stage(0, -13.65, 7.65, 3.25);
    screen(0, 3.0, -15.55, 7.6, 3.5, '#222237');
    skyline(0, -14.35);
    for (const s of [-1, 1]) {
      lightPillar(s * 3.57, -12.32, 3.8, C.lime);
      Y(s * 3.65, .45, -10.10, .48, .79, C.purple, 18);
      G('emissive');
      S(s * 3.65, 1.0, -10.10, .36, C.lime, 14);
      G('scene');
    }
    B(0, .15, -11.58, 4.15, .27, .62, C.concrete);
    B(0, .08, -11.01, 4.65, .13, .56, C.ivory);
    G('emissive');
    for (let i = 0; i < 5; i++) B(-2.5 + i * 1.25, 4.31, -15.38, .08, .10, .035, C.lime);
    G('scene');
    truss(0, -14.92, 8.5, 5.15);
    // Animated skyline beacon & equalizer wave in USA
    G('anim_usa', [0, 4.65, -14.35]);
    S(-1.06, 4.68, -14.35, .14, C.lime, 12);
    for (let i = -3; i <= 3; i++) {
      B(i * .75, .72, -12.15, .18, .22 + (Math.abs(i) % 2) * .12, .06, C.cyan);
    }
    G('scene');

    // =========================================================================
    // 04 / ELITE NIGHT (CORPORATE GALA EXPERIENCE)
    // =========================================================================
    pavilion(13, -7, 10, 10, C.gold);
    B(13, .132, -7, 8.5, .05, 8.8, '#dad5ca');
    stage(13, -10.28, 7.7, 2.7);
    screen(13, 2.75, -11.4, 7.15, 3.05, '#2b2730');
    G('occluders');
    for (const dx of [-2.45, 0, 2.45]) {
      const ax = 13 + dx;
      for (const s of [-1, 1]) Y(ax + s * .85, 2.2, -11.15, .078, 2.9, C.gold, 12);
      for (let i = 0; i < 9; i++) {
        const a = i * Math.PI / 9, b = (i + 1) * Math.PI / 9;
        L(ax + Math.cos(a) * .85, 3.65 + Math.sin(a) * .85, -11.15, ax + Math.cos(b) * .85, 3.65 + Math.sin(b) * .85, -11.15, .076, C.gold);
      }
    }
    const tx = 13, tz = -10.14;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L(tx + sx * .52, .58, tz + sz * .38, tx + sx * .10, 3.36, tz + sz * .08, .038, C.gold);
    B(tx, 1.44, tz, .72, .10, .55, C.gold);
    B(tx, 2.30, tz, .42, .10, .29, C.gold);
    L(tx, 3.35, tz, tx, 3.97, tz, .028, C.gold);
    G('scene');
    for (const x of [10.1, 15.9]) for (const z of [-6.9, -3.6]) {
      tulipTable(x, z, .80, C.snow);
      Y(x, 1.12, z, .18, .20, C.gold, 12);
      G('emissive');
      S(x, 1.42, z, .25, C.pinkLight, 12);
      G('scene');
      for (const off of [-1, 1]) chair(x + off * .89, z, off * Math.PI * .5, '#ddd3c0');
    }
    for (const s of [-1, 1]) {
      Y(13 + s * 4.30, 1.43, -8.5, .11, 2.8, C.gold, 12);
      G('emissive');
      S(13 + s * 4.30, 3.0, -8.5, .40, C.snow, 16);
      G('scene');
      plantbox(13 + s * 3.7, -2.22, 1.35);
    }
    // Animated rotating golden gala crown above the Eiffel centerpiece
    G('anim_elite', [13, 4.18, -10.14]);
    S(13, 4.18, -10.14, .18, C.goldBright, 12);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      B(13 + Math.cos(a) * .42, 4.18, -10.14 + Math.sin(a) * .42, .12, .12, .12, C.goldBright, a);
    }
    G('scene');

    // =========================================================================
    // 05 / AIMC 2026 (ALL INDIA MARKETING CONCLAVE)
    // =========================================================================
    pavilion(13, 6.3, 10, 10, C.purple);
    stage(13, 3.38, 8.15, 2.75);
    screen(13, 2.73, 1.74, 7.7, 3.3, C.purple);
    G('emissive');
    B(13, 2.72, 1.89, 1.70, 2.74, .032, C.violet, .19);
    B(13, 2.72, 1.92, 1.0, 2.34, .032, C.purple, .19);
    B(10.20, 2.0, 1.90, 1.34, .20, .042, C.lime);
    B(15.50, 3.38, 1.90, 1.83, .13, .042, C.lime);
    G('scene');
    B(15.70, 1.21, 3.52, .64, 1.36, .55, C.snow);
    B(15.70, 1.89, 3.52, .89, .12, .71, C.ink);
    G('emissive');
    B(15.70, 1.35, 3.82, .40, .49, .042, C.purple);
    G('scene');
    for (let row = 0; row < 3; row++) for (const group of [-1, 1]) for (let seat = 0; seat < 3; seat++) {
      chair(13 + group * (.86 + seat * .84), 6.08 + row * 1.30, 0, row % 2 ? C.ivory : C.snow);
    }
    truss(13, 2.0, 8.9, 5.35);
    for (const x of [8.65, 17.35]) {
      B(x, 1.11, 4.1, .56, 1.93, .6, C.ink);
      B(x, 1.11, 4.415, .39, 1.63, .028, '#3a3b46');
    }
    shrub(8.57, 10.94, .45);
    shrub(17.43, 10.94, .45);
    // Animated keynote stage orbital element in AIMC
    G('anim_aimc', [13, 2.72, 2.12]);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12, b = (i + 1) * Math.PI * 2 / 12;
      L(13 + Math.cos(a) * .95, 2.72 + Math.sin(a) * .95, 2.12, 13 + Math.cos(b) * .95, 2.72 + Math.sin(b) * .95, 2.12, .035, i % 2 ? C.lime : C.violet);
    }
    G('scene');

    // =========================================================================
    // CENTRAL MONUMENTAL WELCOME SCULPTURE & LOUNGE
    // =========================================================================
    G('scene');
    rounded(0, .09, 1.0, 6.4, .16, 5.7, .95, C.snow);
    Y(0, .21, .55, 1.65, .20, C.concrete, 28);
    G('occluders');
    L(-1.40, .32, .52, 0, 4.68, .52, .20, C.snow);
    L(0, 4.68, .52, 1.4, .32, .52, .20, C.snow);
    L(-.83, 2.10, .52, .83, 2.10, .52, .14, C.purple);
    // Levitating lime orb in its own animated group
    G('anim_orb', [0, 2.99, .52]);
    S(0, 2.99, .52, .44, C.lime, 18);
    // Rotating golden orbital ring in its own animated group
    G('anim_ring', [0, 2.56, .55]);
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI * 2 / 30, b = (i + 1) * Math.PI * 2 / 30;
      L(Math.cos(a) * 1.91, 2.56 + Math.sin(a) * .25, .55 + Math.sin(a) * 1.55, Math.cos(b) * 1.91, 2.56 + Math.sin(b) * .25, .55 + Math.sin(b) * 1.55, .04, C.gold);
    }
    G('scene');
    for (const s of [-1, 1]) {
      bench(s * 5.1, 1.6, Math.PI * .5);
      tree(s * 5.1, -1.3, 3.15);
      plantbox(s * 5.1, 4.0, 1.8);
      tulipTable(s * 4.32, 1.52, .38, C.ivory);
    }

    // =========================================================================
    // THE EXPERIENCE HOUSE: SEPARATED CUTAWAY WALLS FOR SMART OCCLUSION
    // =========================================================================
    G('scene');
    B(0, .10, -1.6, 38, .12, 28.4, C.ivory);

    // Left Wall (x = -19)
    G('wall_left', [-19, 3.1, -1.6]);
    B(-19, 3.1, -1.6, .36, 6.2, 28.4, C.concrete);
    B(-18.80, .28, -1.6, .08, .36, 28.2, C.ink);
    B(-18.80, 5.95, -1.6, .12, .18, 28.2, C.snow);

    // Right Wall (x = 19)
    G('wall_right', [19, 3.1, -1.6]);
    B(19, 3.1, -1.6, .36, 6.2, 28.4, C.concrete);
    B(18.80, .28, -1.6, .08, .36, 28.2, C.ink);
    B(18.80, 5.95, -1.6, .12, .18, 28.2, C.snow);

    // Back Wall (z = -15.8)
    G('wall_back', [0, 3.1, -15.8]);
    B(0, 3.1, -15.8, 38.2, 6.2, .36, C.concrete);
    B(0, .28, -15.60, 37.8, .36, .08, C.ink);
    B(0, 5.95, -15.60, 37.8, .18, .12, C.snow);

    // Front Wall (z = 12.6) with walk-through doorway & architectural glazing
    G('wall_front', [0, 3.1, 12.6]);
    for (const side of [-1, 1]) {
      B(side * 11, 3.1, 12.6, 16, 6.2, .36, C.ivory);
      B(side * 11, 2.9, 12.81, 14, 2.5, .06, C.ink);
      for (let k = 0; k < 6; k++) B(side * (4.6 + k * 2.4), 2.9, 12.86, .05, 2.5, .055, C.violet);
      B(side * 3.15, 2.3, 12.6, .32, 4.6, .72, C.purple);
      B(side * 2.95, 2.3, 12.6, .06, 4.5, .76, C.lime);
    }
    B(0, 5.45, 12.6, 6.6, 1.5, .72, C.purple);
    B(0, 4.72, 12.6, 6.4, .08, .76, C.lime);

    // =========================================================================
    // OUTDOOR ARCADE PATIO CABINETS (TETRIS & SPACE WAR)
    // =========================================================================
    G('scene');
    for (const x of [-6, 6]) {
      B(x, .14, 15.3, 3.3, .18, 2.2, C.concrete);
      G('occluders');
      B(x, 1.2, 15.3, 1.12, 2.4, .82, C.ink);
      G('emissive');
      B(x, 1.75, 15.75, .88, 1.12, .045, x < 0 ? C.purple : C.black);
      B(x, 2.57, 15.3, 1.36, .26, 1.02, x < 0 ? C.lime : C.cyan);
      G('occluders');
      B(x, .95, 15.85, 1.16, .2, .36, C.purple);
      G('emissive');
      S(x - .25, 1.15, 15.85, .09, C.lime, 10);
      S(x + .28, 1.07, 15.88, .068, C.rose, 10);
      G('scene');
    }
    G('emissive');
    for (let i = 0; i < 6; i++) B(-6 + (i % 3 - 1) * .21, 1.4 + Math.floor(i / 3) * .23, 15.79, .19, .19, .025, C.lime);
    for (let i = 0; i < 5; i++) S(6 + (i % 3 - 1) * .24, 1.5 + Math.floor(i / 3) * .36, 15.80, .068, C.cyan, 10);

    // Floating holographic icons above the two patio arcade cabinets
    G('anim_arcade', [0, 3.25, 15.3]);
    B(-6, 3.25, 15.3, .48, .16, .16, C.lime);
    B(-6, 3.41, 15.3, .16, .16, .16, C.lime);
    S(6, 3.32, 15.3, .22, C.cyan, 12);
    B(6, 3.32, 15.3, .52, .06, .18, C.violet);
    G('scene');

    // =========================================================================
    // CONTACT / OPEN RECEPTION PORTAL ON THE ARRIVAL EDGE
    // =========================================================================
    rounded(0, .07, 13.7, 8.4, .15, 5.45, .6, C.snow);
    G('occluders');
    for (const s of [-1, 1]) {
      B(s * 3.50, 2.70, 14.85, .48, 5.26, .52, C.purple);
      G('emissive');
      B(s * 3.22, 2.69, 14.83, .06, 4.89, .57, C.violet);
      G('occluders');
    }
    B(0, 5.28, 14.85, 7.5, .46, .64, C.purple);
    G('emissive');
    B(0, 5.07, 15.18, 6.65, .07, .045, C.lime);
    G('occluders');
    rounded(-2.08, .72, 12.95, 2.45, 1.33, 1.02, .20, C.concrete);
    rounded(-2.08, 1.44, 12.95, 2.59, .15, 1.14, .20, C.snow);
    G('emissive');
    B(-2.08, .96, 13.48, 1.8, .13, .026, C.purple);
    G('occluders');
    B(-2.0, 1.72, 12.95, .58, .42, .07, C.ink, -.10);
    G('emissive');
    B(-2.0, 1.69, 13.002, .49, .29, .018, C.violet, -.10);
    G('scene');
    for (const s of [-1, 1]) shrub(s * 3.41, 11.73, .53);
    bench(2.03, 12.67, Math.PI * .5);
    G('emissive');
    D(.88, .167, 13.10, .50, C.lime);
    for (let x = -2; x <= 2; x += .65) D(x, .155, 16.10, .088, C.purple);
    G('scene');

    return {
      roof: { x: 0, y: 6.25, z: -1.6, w: 38.6, h: .22, d: 29, color: C.purple },
      zones: [
        { id: 'tetris', x: -6, z: 16, label: 'Tetris · PLAY', number: '▦', color: C.lime },
        { id: 'spacewar', x: 6, z: 16, label: 'Space War · PLAY', number: '✦', color: C.cyan },
        { id: 'taxi', x: -10.8, z: 10.1, label: 'The Taxi Project', number: '01', color: C.yellow },
        { id: 'japan', x: -13, z: -2.5, label: 'Privilege Club Japan', number: '02', color: C.rose },
        { id: 'usa', x: 0, z: -9.45, label: 'Privilege Club USA', number: '03', color: C.purple },
        { id: 'elite', x: 13, z: -2.4, label: 'Elite Night', number: '04', color: C.gold },
        { id: 'aimc', x: 13, z: 10.5, label: 'AIMC 2026', number: '05', color: C.purple },
        { id: 'contact', x: .88, z: 13.10, label: 'Let’s make it happen', number: '06', color: C.lime }
      ],
      bounds: { minX: -20, maxX: 20, minZ: -16, maxZ: 17 },
      spawn: { x: 0, z: 16.3 }
    };
  }
  window.ATJWorld = { build };
})();
