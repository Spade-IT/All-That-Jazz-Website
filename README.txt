ALL THAT JAZZ — THE EXPERIENCE HOUSE (V3)

OPEN THE WEBSITE
Extract this ZIP. Open index.html in a modern browser. Keep contact.html in
the same folder. No installation, internet connection, API key or server is
needed. The source and recognition links open external websites only if clicked.

EXACTLY TWO PAGES
1. index.html — playable 3D venue, five project stories, live interactive radar,
   guided tour, smart wall cutaway & X-ray occlusion, Tetris and Space War.
2. contact.html — event brief builder and Instagram contact handoff.

WHAT IS NEW IN V3
1. Smart Wall Cutaway & Character-Behind-Wall Occlusion:
   - Separated exterior house walls (front, back, left, right) and coffered roof
     dynamically fade to a translucent architectural cutaway whenever they sit
     between the camera and your character.
   - Screen-space dithered Camera-to-Avatar Occlusion Lens in the WebGL fragment
     shader automatically opens a soft, glowing viewing window through interior
     pavilion backdrops, pillars, arcade cabinets and sculptures.
   - Two-pass X-Ray Avatar Silhouette (depthFunc GREATER pass) renders a subtle
     neon-lime/violet Fresnel outline whenever your character steps behind any
     solid structure so you never lose sight of your character.
2. Graphic Quality & Multi-Zone Stage Lighting:
   - Upgraded WebGL shader with three-point studio lighting, Blinn-Phong specular
     highlights, Fresnel rim lighting, ground contact ambient occlusion (AO),
     procedural terrazzo floor grain and fluted wall micro-detail.
   - Six real-time colored point lights bathe each pavilion and the character in
     warm stage radiance (Marigold Amber for Taxi, Sakura Rose for Japan,
     Electric Violet for USA, Champagne Gold for Elite Night, Keynote Indigo for
     AIMC, and Lime/Gold for the central sculpture).
3. Live 3D Animations & Smooth Physics:
   - Animated 3D centerpieces in every zone: levitating central orb, orbiting
     30-segment gold ring, Pujo sunburst, drifting sakura blossoms, pulsing USA
     equalizer bars, rotating Elite Night crown, AIMC stage ring and floating
     arcade holograms.
   - Articulated multi-joint character animation with idle breathing, subtle head
     look-around, torso counter-twist, turn banking and velocity inertia.
   - Continuous doorway camera blending (eliminating abrupt camera snaps when
     crossing the front threshold), doorway corner funneling, lookahead waypoint
     steering and sliding collision across all walls and interior obstacles.
4. Interactive Venue Radar & Audio/Arcade Upgrades:
   - Real-time 2D floor plan radar in the HUD showing the house layout, visited
     rooms, active walking path and player view cone (click anywhere on the
     radar to walk there).
   - Warm 5-voice A-minor 9th ambient lounge synth pad routed through a low-pass
     filter.
   - Enhanced Space War arcade with particle explosion bursts, shield aura and
     parallax starfield.

CONTROLS
WASD / arrow keys: walk after entering the venue.
Click an open floor area or the mini-radar: walk there. Drag: orbit. Wheel: zoom.
E: open the nearby project, arcade cabinet or contact area.
Numbered room buttons: walk to that room. Guide me: automatic room-by-room tour.
TPP / FPP button or V changes perspective. Map opens a cutaway house overview.
Escape closes a story, directory, help or arcade dialog.

EDIT AND REBUILD
All editable sources are in src/. Main files:
  app.js       Project copy, recognition, illustrations, radar and interactions.
  world.js     Procedural 3D event spaces, cutaway wall groups and animations.
  engine.js    WebGL renderer, multi-light shader, X-ray avatar and navigation.
  spacewar.js  Space War arcade mechanics with particle bursts.
  tetris.js    Self-contained Tetris arcade component.
  index.html / style.css      Main page and responsive styling.
  contact.html / contact.css / contact.js      Contact page.
Run python3 build.py to regenerate the two standalone files in dist/ and ZIP.
Run node verify.mjs and node verify-house.mjs for automated checks.
