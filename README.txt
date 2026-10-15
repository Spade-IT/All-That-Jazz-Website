ALL THAT JAZZ — THE EXPERIENCE HOUSE

OPEN THE WEBSITE
Extract this ZIP. Open index.html in a modern browser. Keep contact.html in
the same folder. No installation, internet connection, API key or server is
needed. The source and recognition links open external websites only if clicked.

EXACTLY TWO PAGES
1. index.html — playable 3D venue, five project stories, guided tour, Tetris and Space War.
2. contact.html — event brief builder and Instagram contact handoff.

CONTROLS
WASD / arrow keys: walk after entering the venue.
Click an open floor area: walk there. Drag: orbit the camera. Wheel: zoom.
E: open the nearby project or contact area.
Numbered room buttons: walk to that room. Guide me: automatic room-by-room tour.
TPP / FPP button or V changes perspective. Map opens a cutaway house overview.
The Enter the house / Go outside button routes through the open front doorway.
The house walls block walking. The roof cuts away when inside or in map view.
Games are available from the intro, Games dock, patio labels, and quick buttons.
Space War: A/D or left/right to move, Space to fire, P to pause.
Space War has waves, score, three lives, restart and touch controls.
Mobile has touch movement controls.
Sound is off by default; the music-note button enables procedural ambient audio.
Tetris: arrows to move, up/X clockwise, Z counterclockwise, Space hard drop,
P pause. Touch controls, restart, ghost piece and local best score are included.
Escape closes a story, directory, help or arcade dialog.

EDIT AND REBUILD
All editable sources are in src/. Main files:
  app.js       Project copy, recognition, illustrations and website interactions.
  world.js     Procedural 3D event spaces and room entrance coordinates.
  engine.js    WebGL renderer, avatar, camera and navigation.
  spacewar.js  Space War arcade mechanics.
  tetris.js    Self-contained arcade component.
  index.html / style.css      Main page and responsive styling.
  contact.html / contact.css / contact.js      Contact page.
Run python3 build.py to regenerate the two standalone files in dist/ and ZIP.
Run node verify.mjs
node verify-house.mjs for the mocked DOM integration checks if included.

CONTENT AND ASSETS
The venue is an original, stylized interpretation, not a reconstruction or
photographic record of these events. Illustrations, geometry and audio are
generated locally by source code. No third-party assets, web fonts or CDNs.
The wordmark treatment is a typographic concept, not a supplied official logo.

Five project entries draw on the research supplied in this conversation:
  Asian Paints The Taxi Project 2025 — Kolkata brand activation.
  Asian Paints Privilege Club Japan 2025 — destination celebration.
  Asian Paints Privilege Club Super Premium Members USA 2025.
  Asian Paints Elite Night 2025 — domestic MICE.
  AIMC / All India Marketing Conclave 2026.
Recognition source: https://www.eemaindia.com/eemaxglobal/winners.php
Taxi collaboration source:
https://www.linkedin.com/posts/svsingh_sometimes-the-best-brand-stories-are-already-activity-7369775280980144132-YBsp
User-supplied contact: https://www.instagram.com/allthatjazz_atj/
These links have not been re-fetched during this website build.

ENQUIRIES AND PUBLICATION
The form validates details and generates a copyable/downloadable text brief.
It does not send enquiries or store contact information on a server. Visitors
can connect through the supplied Instagram account to share their brief.
No unverified email address, phone number or office address is included.

The files are ready for static hosting and also deployed as a private Site.
Before public launch, confirm the company's identity and project credits,
replace the conceptual wordmark with official brand assets, and add a verified
contact endpoint if direct enquiry delivery is desired. Set the real domain
in canonical/social metadata after choosing it. Rankings are not guaranteed.

VERIFICATION
Syntax, procedural geometry, navigation routes, overview framing, Tetris logic
and contact form behavior were checked with local deterministic/mocked tests.
Browser rendering was not tested: the managed workspace does not provide the
approved browser preview capability. Review in the target browser before launch.

WEBGL FALLBACK
If WebGL cannot initialize, every project remains accessible in the project
directory. The contact page works without WebGL. With JavaScript disabled,
the first page presents a static project summary and contact link.

PRIVACY
Visited projects and best Tetris score are saved only in local browser storage.
Storage failures (for example, private browsing restrictions) are handled.
There are no analytics, trackers or automatic external network requests.
