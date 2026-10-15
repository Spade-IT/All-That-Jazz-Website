#!/usr/bin/env python3
"""Bundle the two ATJ pages without a package install or network request."""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

for page in ('index.html', 'contact.html'):
    html = (SRC / page).read_text()
    scripts = []
    def style(match):
        return '<style>\n' + (SRC / match[1]).read_text() + '\n</style>'
    def script(match):
        # Inline scripts are placed after the DOM, including formerly deferred scripts.
        code = (SRC / match[1]).read_text().replace('</script', '<\\/script')
        scripts.append('<script>\n' + code + '\n</script>')
        return ''
    html = re.sub(r'<link rel="stylesheet" href="([^\"]+)">', style, html)
    html = re.sub(r'<script src="([^\"]+)"(?: defer)?></script>', script, html)
    html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
    (DIST / page).write_text(html)

archive = ROOT / 'All_That_Jazz_3D_Website.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as out:
    for page in ('index.html', 'contact.html'):
        out.write(DIST / page, page)
    for path in sorted(SRC.iterdir()):
        if path.is_file(): out.write(path, 'src/' + path.name)
    for name in ('build.py', 'README.txt', 'verify.mjs', 'verify-house.mjs'):
        path = ROOT / name
        if path.exists(): out.write(path, name)
print(f'Built exactly two standalone pages. Archive: {archive}')
for page in DIST.iterdir():
    print(f'  {page.name}: {page.stat().st_size:,} bytes')
