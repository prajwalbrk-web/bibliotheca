#!/usr/bin/env python3
"""Builds www/ : the library as a fully offline web app (no CDN needed).
Reads ../head.html and ../app.js (the site source) and copies vendor libs + fonts."""
import os, re, shutil, json
H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(H, 'src')
W = os.path.join(H, 'www')
shutil.rmtree(W, ignore_errors=True)
os.makedirs(W + '/vendor'); os.makedirs(W + '/fonts'); os.makedirs(W + '/icons')

head = open(os.path.join(SRC, 'head.html')).read()
js = open(os.path.join(SRC, 'app.js')).read()

# ---- fonts (bundled, latin subset)
FD = os.path.join(H, 'node_modules/@fontsource')
fonts = [
 ('Cormorant Garamond', 'cormorant-garamond', [(500, 'normal'), (600, 'normal'), (700, 'normal'), (500, 'italic'), (600, 'italic')]),
 ('Lora', 'lora', [(400, 'normal'), (500, 'normal'), (600, 'normal'), (400, 'italic')]),
 ('Josefin Sans', 'josefin-sans', [(400, 'normal'), (600, 'normal')]),
 ('Special Elite', 'special-elite', [(400, 'normal')]),
]
css = ''
for fam, pkg, vs in fonts:
    for wt, sty in vs:
        fn = f'{pkg}-latin-{wt}-{sty}.woff2'
        shutil.copy(os.path.join(FD, pkg, 'files', fn), W + '/fonts/' + fn)
        css += f"@font-face{{font-family:'{fam}';font-style:{sty};font-weight:{wt};font-display:swap;src:url(fonts/{fn}) format('woff2')}}\n"
open(W + '/fonts.css', 'w').write(css)

head = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', head)
head = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', '<link rel="stylesheet" href="fonts.css">', head)
head = head.replace('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'vendor/xlsx.full.min.js')

# ---- vendor libs
for f in os.listdir(H + '/vendor'):
    shutil.copy(H + '/vendor/' + f, W + '/vendor/' + f)

# ---- icons + pwa
for src, dst in [('icon-only.png', 'icon-1024.png')]:
    shutil.copy(H + '/assets/' + src, W + '/icons/' + dst)
try:
    from PIL import Image
    im = Image.open(H + '/assets/icon-only.png').convert('RGB')
    for s in (192, 512):
        im.resize((s, s), Image.LANCZOS).save(f'{W}/icons/icon-{s}.png')
except Exception as e:
    print('PIL missing, using 1024 icon only', e)
    for s in (192, 512):
        shutil.copy(H + '/assets/icon-only.png', f'{W}/icons/icon-{s}.png')
json.dump({
    "name": "Bibliotheca", "short_name": "Bibliotheca",
    "description": "A personal digital library with animated shelves, a page-turning PDF reader and a book scanner.",
    "start_url": "./index.html", "scope": "./", "display": "standalone", "orientation": "any",
    "background_color": "#170e08", "theme_color": "#170e08",
    "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}, open(W + '/manifest.webmanifest', 'w'), indent=1)
open(W + '/sw.js', 'w').write("""const V='rr-v1';const CORE=['./','./index.html','./fonts.css','./manifest.webmanifest','./vendor/xlsx.full.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match('./index.html'))))});
""")

# ---- native file saving (Excel export) when running inside the Android app
native = r"""
async function nativeSave(name,data){
  const C=window.Capacitor,P=C&&C.Plugins;
  if(C&&C.isNativePlatform&&C.isNativePlatform()&&P&&P.Filesystem&&P.Share){
    let bin='';const u=new Uint8Array(data);for(let i=0;i<u.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));
    const r=await P.Filesystem.writeFile({path:name,data:btoa(bin),directory:'CACHE'});
    await P.Share.share({title:name,url:r.uri,dialogTitle:'Save or send your catalogue'});return;
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=name;document.body.appendChild(a);a.click();a.remove();
}
async function initExport(){"""
assert 'async function initExport(){' in js
js = js.replace('async function initExport(){', native.strip('\n'), 1)
old = "else XLSX.writeFile(wb,'bibliotheca-catalogue.xlsx');"
assert old in js
js = js.replace(old, "else await nativeSave('bibliotheca-catalogue.xlsx',new Uint8Array(data));", 1)

head = head.replace('<title>', '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#170e08"><meta name="apple-mobile-web-app-capable" content="yes"><link rel="apple-touch-icon" href="icons/icon-192.png"><title>', 1)
if '<meta name="viewport"' not in head:
    head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + head
sw = "<script>if('serviceWorker' in navigator&&!window.Capacitor&&/^https?:/.test(location.protocol)&&location.hostname!=='localhost'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}</script>"
open(W + '/index.html', 'w').write(head + "\n<script>\n" + js + "\n</script>\n" + sw + "\n")
print('www built:', sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(W) for f in fs) // 1024, 'KB')
