# Nexus Residence — 3D prezentace nemovitosti

Interaktivní 3D web ve stylu „Websites in 2027“: 4-pokojový byt (4+kk, ~110 m²) ve stylu Airbnb
s pracovním koutkem, pračkou, espresssem a smart TV. Čisté Three.js, žádný build, žádné závislosti na serveru.

## Ovládání

- **táhni** = otočení scény
- **ťukni na hotspot** nebo na tlačítko dole = přelet na místnost
- po 4,5 s nečinnosti se scéna sama pomalu otáčí

## Soubory

| soubor | co to je |
|---|---|
| `index.html` | stránka, UI, styl |
| `demo.js` | celá 3D scéna (geometrie, světla, kamery, hotspoty) |
| `three.min.js` | Three.js r147 (lokálně, aby web fungoval i offline) |
| `jak-na-3d-web.md` | postup, jak takový web postavit (Spline / Framer / AI) |

## Jak to otevřít

- **online:** otevři odkaz GitHub Pages v Chrome
- **offline:** stáhni celou složku a otevři `index.html` v Chrome
  (musí být u toho `demo.js` a `three.min.js`)

## Jak to upravit

- barvy a materiály: objekt `M` v `demo.js`
- místnosti a nábytek: sekce `půdorys`, `kuchyně`, `obývák`, `ložnice`, `koupelna`
- pohledy kamery: objekt `VIEWS` (theta = úhel kolem, phi = výška, r = vzdálenost)
- popisky a hotspoty: `HOTSPOTS` a `INFO`

## Co dál (na pořádný „klientský“ web)

1. fotorealistické textury nebo AI rendery interiérů (Midjourney, Flux)
2. vlastní model z Blenderu (export .glb, načtení přes GLTFLoader)
3. hosting: GitHub Pages (tady), Vercel nebo Netlify
4. vlastní doména a analytika
