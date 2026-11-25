# Jak udělat „3D web 2027“ (jako to video)

Video ukazuje hotovou **interaktivní 3D prodejní stránku**: průlet domem, isometrický
půdorys a klikací místnosti s hotspoty. Nástroje v něm vidět nejsou — tohle je
nejpravděpodobnější postup, kterým se takový výsledek dělá.

---

## 1. Nejrychlejší cesta (bez programování): Spline

**spline.design** — 3D scéna běžící v prohlížeči, zdarma, ovládá se jako hra.

1. Nový soubor → vpravo nahoře přepni na **Web** (ne Apple/Android).
2. **Scéna:** vlož model pokoje. Zdroje:
   - hotové: Sketchfab, Poly Haven (free), Spline Community (hledej „apartment“, „interior“),
   - vlastní: Blender → export **.glb** → přetáhni do Spline,
   - AI: **Meshy.ai** / **Tripo** (z fotky nebo textu udělá 3D objekt) — hodí se na jednotlivé kusy nábytku, ne na celý byt.
3. **Materiály a světlo:** přetáhni HDRI z polyhaven.com (např. „sunset“) do scény,
   zapni stíny, přidej Area Light. Tím se z „plastového“ modelu stane fotorealistický dojem.
4. **Kamery:** přidej 3–4 objekty Camera (Půdorys, Obývák, Ložnice, Koupelna).
   Každé kameře nastav pohled, pak na ni přidej Event:
   *Mouse Down → Transition → na danou kameru* (přechod 1–1,5 s, easing).
5. **Hotspoty:** malý Sphere/Text s popiskem („Ložnice“) + Event na klik → přechod na kameru.
   Přesně to dělá ten dojem „webu, který se dá procházet“.
6. **Pohyb při načtení:** na scénu dej Event *Start → Transition → kamera Půdorys*
   (nebo „Loop“ rotaci o 5°), aby se web hýbal sám.
7. **Export:** *Export → Web (iframe/embed)*, nebo to rovnou publikuj na spline.design
   a odkaz vlož do Frameru/Webflow/Notionu.

> Spline zdarma = vodoznak a omezené exporty; placené od ~9 $/měs.

## 2. Web kolem scény: Framer

**framer.com** — drag & drop, nejrychlejší cesta k pěknému webu, zdarma.

- vlož **Embed** (iframe) se svou Spline scénou na celou obrazovku,
- nad ni dej texty: název projektu, „30. patro“, cena, tlačítko Kontakt,
- přidej **scroll animace** a přechody — tím web působí draze,
- publikuj na vlastní doménu (free verze = framer.website).

Alternativa pro vývojáře: **Next.js + react-three-fiber** (Three.js) — plná kontrola,
ale je to programování. Nebo Webflow, pokud už ho znáš.

## 3. Fotorealistické interiéry (ten „AI“ dojem)

Dva způsoby:

- **Render z Blenderu** (Cycles): nejkvalitnější, ale hodiny práce.
- **AI obrázky**: Midjourney / Flux / Google ImageFX na fotky interiérů a výhledů,
  pak je ve Spline použij jako textury nebo jako pozadí místností.
  Rychlé a vypadá to skoro stejně jako v tom videu.

## 4. Průletové video (ten pohyb věží a chodbami)

- **Kling 2.x** nebo **Runway Gen-4** nebo **Veo 3**: nahraješ jeden render/obrázek
  a napíšeš „camera flies up the facade of a skyscraper at dusk, cinematic“.
- Střih a titulky: CapCut (na telefonu stačí).
- Hudba: Suno / Udio, hlas: ElevenLabs.

## 5. Checklist na jeden večer

1. Vyber místnost (ne celý dům) — nejdřív jedna scéna, ať to vypadá dobře.
2. Postav/ stáhni scénu, nasviť ji HDRI + Area Light.
3. 3 kamery + přechody, 2–3 hotspoty.
4. Embed do Frameru, přidej nadpis a tlačítko.
5. Nahraj 15s screen recording (to je přesně to video z Instagramu) a pošli to dál.

## 6. Na co si dát pozor

- **Výkon:** scéna musí mít pod ~5 MB a 60 fps i na mobilu. Míň polygonů, komprimované textury (WebP/KTX2).
- **Loading screen:** 3D se načítá — bez něj lidé odejdou.
- **Mobil:** vždy testuj na telefonu, ne jen na monitoru.
- **UX:** vždy tlačítko „zpět na půdorys“ — v tom videu je taky.
- **Na telefonu to nepostavíš.** Spline, Blender i Framer chtějí počítač; telefon je jen na ukázku a kontrolu.

## 7. Orientační ceny

| Nástroj | Zdarma | Placené |
|---|---|---|
| Spline | ano (vodoznak) | ~9 $/měs |
| Framer | ano (framer.website) | ~5 $/měs |
| Meshy / Tripo | omezeně | ~20 $/měs |
| Midjourney | ne | ~10 $/měs |
| Kling / Runway | omezeně | ~10–15 $/měs |

**Minimum pro start: 0 Kč** (Spline free + Framer free + Poly Haven + ImageFX).
