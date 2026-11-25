/* NEXUS RESIDENCE — 4-pokojový byt ve stylu Airbnb (Three.js, bez buildu).
   Táhni = otočení, ťukni na bod / tlačítko = plynulý přelet kamery. */

(function () {
  var errBox = document.getElementById('err');
  function fail(msg) {
    if (!errBox) return;
    errBox.innerHTML = '<div><b>Tohle zařízení neumí WebGL.</b><br>Otevři prosím odkaz v Chrome (ne v náhledu souboru).<br><br><span style="opacity:.5;font-size:11px">' + msg + '</span></div>';
    errBox.style.display = 'grid';
  }
  window.onerror = function (m, s, l, c) { fail(m + ' @' + l + ':' + c); };
  if (typeof THREE === 'undefined') { fail('Three.js se nenačetl (chybí three.min.js vedle index.html).'); return; }

  try {
    var HIGH = (new URLSearchParams(window.location.search).get('q') === 'high');

    /* ---------------- základ ---------------- */
    var canvas = document.getElementById('c');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: HIGH, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HIGH ? 1.5 : 1.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.powerPreference = 'high-performance';

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

    /* ---------------- post-processing (bloom) ---------------- */
    var composer = null;
    function setupComposer() {
      if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) return;
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      var bloom = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), HIGH ? 0.55 : 0.35, 0.4, 0.82);
      composer.addPass(bloom);
    }
    setupComposer();

    /* ---------------- HDRI prostředí ---------------- */
    if (HIGH && THREE.RGBELoader && THREE.PMREMGenerator) {
      try {
        var pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        new THREE.RGBELoader().load('hdri/dusk.hdr', function (hdr) {
          try { scene.environment = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); } catch (e) {}
        }, undefined, function () {});
      } catch (e) {}
    }

    /* ---------------- světlo ---------------- */
    scene.add(new THREE.HemisphereLight(0xcfdff7, 0x241f1a, 0.42));
    var key = new THREE.DirectionalLight(0xfff0d6, 1.85);
    key.position.set(10, 16, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(HIGH ? 1024 : 512, HIGH ? 1024 : 512);
    key.shadow.camera.left = -14; key.shadow.camera.right = 14;
    key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
    key.shadow.camera.near = 1; key.shadow.camera.far = 70;
    key.shadow.bias = -0.0007;
    key.shadow.radius = 3;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x8fb4e8, 0.3);
    fill.position.set(-12, 8, -10);
    scene.add(fill);
    var sun = new THREE.PointLight(0xffcf9a, 0.9, 16, 2);
    sun.position.set(0.4, 2.6, 1.6);
    scene.add(sun);
    var lampLight = new THREE.PointLight(0xffc07a, 0.55, 7, 2);
    lampLight.position.set(4.2, 1.7, 0.6);
    scene.add(lampLight);

    /* ---------------- procedurální textury ---------------- */
    function tex(w, h, draw, rx, ry) {
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx || 1, ry || 1);
      t.anisotropy = HIGH ? 2 : 1;
      t.encoding = THREE.sRGBEncoding;
      return t;
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    function woodTexture(rx, ry) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = '#9d7448'; g.fillRect(0, 0, w, h);
        var rows = 8, ph = h / rows;
        for (var r = 0; r < rows; r++) {
          var offset = (r % 2) * 128;
          for (var x = -256; x < w + 256; x += 256) {
            var px = x + offset;
            var shade = 150 + Math.floor(rnd(-24, 22));
            g.fillStyle = 'rgb(' + shade + ',' + Math.round(shade * 0.76) + ',' + Math.round(shade * 0.55) + ')';
            g.fillRect(px + 1, r * ph + 1, 254, ph - 2);
            g.strokeStyle = 'rgba(55,32,15,.16)';
            g.lineWidth = 1;
            for (var i = 0; i < 10; i++) {
              g.beginPath();
              var yy = r * ph + rnd(3, ph - 3);
              g.moveTo(px, yy);
              g.bezierCurveTo(px + 80, yy + rnd(-4, 4), px + 170, yy + rnd(-4, 4), px + 254, yy + rnd(-3, 3));
              g.stroke();
            }
          }
          g.fillStyle = 'rgba(40,24,12,.34)';
          g.fillRect(0, r * ph, w, 2);
        }
      }, rx, ry);
    }
    function bumpWood(rx, ry) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
        var rows = 8, ph = h / rows;
        for (var r = 0; r < rows; r++) {
          var offset = (r % 2) * 128;
          for (var x = -256; x < w + 256; x += 256) {
            var px = x + offset;
            var pv = 118 + Math.floor(rnd(-16, 16));
            g.fillStyle = 'rgba(' + pv + ',' + pv + ',' + pv + ',1)';
            g.fillRect(px + 1, r * ph + 1, 254, ph - 2);
            g.strokeStyle = 'rgba(40,40,40,.55)';
            for (var i = 0; i < 12; i++) {
              g.beginPath();
              var yy = r * ph + rnd(3, ph - 3);
              g.moveTo(px, yy);
              g.bezierCurveTo(px + 80, yy + rnd(-4, 4), px + 170, yy + rnd(-4, 4), px + 254, yy + rnd(-3, 3));
              g.stroke();
            }
          }
          g.fillStyle = 'rgba(30,30,30,.85)';
          g.fillRect(0, r * ph, w, 2);
        }
      }, rx, ry);
    }
    function marbleTexture(rx, ry) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = '#e7e0d5'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 30; i++) {
          g.beginPath();
          var x = rnd(0, w), y = rnd(0, h);
          g.moveTo(x, y);
          for (var k = 0; k < 4; k++) { x += rnd(-150, 150); y += rnd(-150, 150); g.lineTo(x, y); }
          g.strokeStyle = 'rgba(120,112,102,' + rnd(0.05, 0.18).toFixed(2) + ')';
          g.lineWidth = rnd(0.6, 2.4);
          g.stroke();
        }
      }, rx, ry);
    }
    function bumpMarble(rx, ry) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 30; i++) {
          g.beginPath();
          var x = rnd(0, w), y = rnd(0, h);
          g.moveTo(x, y);
          for (var k = 0; k < 4; k++) { x += rnd(-150, 150); y += rnd(-150, 150); g.lineTo(x, y); }
          g.strokeStyle = 'rgba(60,60,60,' + rnd(0.2, 0.5).toFixed(2) + ')';
          g.lineWidth = rnd(0.8, 2.4);
          g.stroke();
        }
      }, rx, ry);
    }
    function fabricTexture(base, rx, ry) {
      return tex(256, 256, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 5200; i++) {
          g.fillStyle = 'rgba(' + (Math.random() > .5 ? '255,255,255,' : '0,0,0,') + rnd(0.02, 0.07).toFixed(3) + ')';
          g.fillRect(rnd(0, w), rnd(0, h), 1.6, 1.6);
        }
      }, rx, ry);
    }
    function bumpNoise(rx, ry) {
      return tex(256, 256, function (g, w, h) {
        g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 9000; i++) {
          var v = Math.floor(rnd(90, 170));
          g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.5)';
          g.fillRect(rnd(0, w), rnd(0, h), 1.8, 1.8);
        }
      }, rx, ry);
    }
    function rugTexture() {
      return tex(256, 256, function (g, w, h) {
        g.fillStyle = '#8d7660'; g.fillRect(0, 0, w, h);
        for (var y = 0; y < h; y += 6) {
          g.fillStyle = y % 12 ? 'rgba(255,255,255,.06)' : 'rgba(40,28,18,.12)';
          g.fillRect(0, y, w, 3);
        }
        for (var i = 0; i < 2600; i++) {
          g.fillStyle = 'rgba(255,255,255,' + rnd(0.02, 0.1).toFixed(3) + ')';
          g.fillRect(rnd(0, w), rnd(0, h), 1.5, 1.5);
        }
      }, 2, 2);
    }
    function skyTexture() {
      return tex(1024, 512, function (g, w, h) {
        var sky = g.createLinearGradient(0, 0, 0, h * 0.6);
        sky.addColorStop(0, '#1a3568');
        sky.addColorStop(0.38, '#4a72b0');
        sky.addColorStop(0.7, '#d48a6a');
        sky.addColorStop(1, '#f5b88a');
        g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.6);
        var sun = g.createRadialGradient(w * 0.72, h * 0.46, 2, w * 0.72, h * 0.46, h * 0.34);
        sun.addColorStop(0, 'rgba(255,248,220,1)');
        sun.addColorStop(0.18, 'rgba(255,220,170,.75)');
        sun.addColorStop(0.5, 'rgba(255,180,130,.25)');
        sun.addColorStop(1, 'rgba(255,180,130,0)');
        g.fillStyle = sun; g.fillRect(0, 0, w, h * 0.6);
        var haze = g.createLinearGradient(0, h * 0.42, 0, h * 0.62);
        haze.addColorStop(0, 'rgba(255,200,160,0)');
        haze.addColorStop(1, 'rgba(255,190,150,.45)');
        g.fillStyle = haze; g.fillRect(0, 0, w, h * 0.62);
        g.fillStyle = 'rgba(14,24,44,.92)';
        var bx = 0;
        while (bx < w) {
          var bw = rnd(10, 46), bh = rnd(24, 110);
          g.fillRect(bx, h * 0.6 - bh, bw, bh);
          g.fillStyle = 'rgba(255,210,140,.6)';
          for (var wy = h * 0.6 - bh + 5; wy < h * 0.6 - 3; wy += 8) {
            for (var wx = bx + 3; wx < bx + bw - 3; wx += 6) {
              if (Math.random() > 0.55) g.fillRect(wx, wy, 2, 3);
            }
          }
          g.fillStyle = 'rgba(14,24,44,.92)';
          bx += bw + rnd(2, 8);
        }
        var sea = g.createLinearGradient(0, h * 0.6, 0, h);
        sea.addColorStop(0, '#2f5a8a');
        sea.addColorStop(0.4, '#1b3a62');
        sea.addColorStop(1, '#0a1830');
        g.fillStyle = sea; g.fillRect(0, h * 0.6, w, h * 0.4);
        var refl = g.createRadialGradient(w * 0.72, h * 0.62, 2, w * 0.72, h * 0.62, h * 0.3);
        refl.addColorStop(0, 'rgba(255,220,170,.7)');
        refl.addColorStop(0.25, 'rgba(255,200,150,.35)');
        refl.addColorStop(1, 'rgba(255,200,150,0)');
        g.fillStyle = refl; g.fillRect(0, h * 0.6, w, h * 0.4);
        for (var i = 0; i < 140; i++) {
          var y = h * 0.62 + Math.random() * h * 0.36;
          g.fillStyle = 'rgba(255,215,170,' + rnd(0.04, 0.2).toFixed(3) + ')';
          g.fillRect(rnd(0, w), y, rnd(12, 80), rnd(1, 2.2));
        }
      }, 1, 1);
    }
    function aoTexture() {
      var cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      var g = cv.getContext('2d');
      var grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,0,0,.62)');
      grd.addColorStop(0.5, 'rgba(0,0,0,.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      var t = new THREE.CanvasTexture(cv);
      t.encoding = THREE.sRGBEncoding;
      return t;
    }

    function std(o) {
      if (o.envMapIntensity === undefined) o.envMapIntensity = HIGH ? 0.35 : 0;
      return new THREE.MeshStandardMaterial(o);
    }
    var M = {
      floor: std({ map: woodTexture(4, 4), bumpMap: HIGH ? bumpWood(4, 4) : null, bumpScale: HIGH ? 0.003 : 0, roughness: 0.66, metalness: 0 }),
      wood: std({ map: woodTexture(1, 1), bumpMap: HIGH ? bumpWood(1, 1) : null, bumpScale: HIGH ? 0.003 : 0, roughness: 0.6 }),
      woodDark: std({ color: 0x4d3524, roughness: 0.55 }),
      wall: std({ color: 0xe1d8c8, roughness: 0.97 }),
      wall2: std({ color: 0xd7cdbb, roughness: 0.97 }),
      cream: std({ color: 0xe3d7c4, roughness: 0.85 }),
      white: std({ color: 0xf3eee4, roughness: 0.5 }),
      marble: std({ map: marbleTexture(2, 2), bumpMap: HIGH ? bumpMarble(2, 2) : null, bumpScale: HIGH ? 0.004 : 0, roughness: 0.32, metalness: 0.05 }),
      fabric: std({ map: fabricTexture('#d6c7b1', 2, 2), bumpMap: HIGH ? bumpNoise(3, 3) : null, bumpScale: HIGH ? 0.011 : 0, roughness: 1 }),
      fabric2: std({ map: fabricTexture('#b8a891', 2, 2), bumpMap: HIGH ? bumpNoise(3, 3) : null, bumpScale: HIGH ? 0.011 : 0, roughness: 1 }),
      rug: std({ map: rugTexture(), roughness: 1 }),
      dark: std({ color: 0x1d1f24, roughness: 0.3, metalness: 0.3 }),
      metal: std({ color: 0x8d939a, roughness: 0.3, metalness: 0.85 }),
      brass: std({ color: 0xb8894f, roughness: 0.28, metalness: 0.9 }),
      green: std({ color: 0x3f5c3c, roughness: 1 }),
      green2: std({ color: 0x314a30, roughness: 1 }),
      terracotta: std({ color: 0x9d6a4c, roughness: 0.9 }),
      olive: std({ color: 0x6b6a52, roughness: 0.95 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe3f2, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, envMapIntensity: HIGH ? 0.8 : 0 }),
      emitWarm: std({ color: 0xfdf3e2, emissive: 0xffc98c, emissiveIntensity: 1.25, roughness: 0.6 })
    };

    function box(w, h, d, m, x, y, z, o) {
      o = o || {};
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      if (o.ry) mesh.rotation.y = o.ry;
      mesh.castShadow = o.cast !== false;
      mesh.receiveShadow = o.recv !== false;
      scene.add(mesh);
      return mesh;
    }
    function cyl(rt, rb, h, m, x, y, z, seg) {
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }
    function sph(r, m, x, y, z, detail) {
      var mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail === undefined ? 0 : detail), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }

    /* ---------------- PBR podlaha (Poly Haven, CC0) ---------------- */
    var floorTexLoader = new THREE.TextureLoader();
    floorTexLoader.load('textures/floor_diff.jpg', function (t) {
      t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 10);
      t.anisotropy = HIGH ? 4 : 2;
      M.floor.map = t;
      M.floor.needsUpdate = true;
    });
    floorTexLoader.load('textures/floor_nor.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 10);
      M.floor.normalMap = t;
      M.floor.normalScale = new THREE.Vector2(1.2, 1.2);
      M.floor.needsUpdate = true;
    });
    floorTexLoader.load('textures/floor_rough.jpg', function (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 10);
      M.floor.roughnessMap = t;
      M.floor.roughness = 1.0;
      M.floor.needsUpdate = true;
    });

    /* ---------------- půdorys (W=5, 10x10 m) ---------------- */
    var W = 5, H = 2.9;

    box(W * 2, 0.26, W * 2, M.floor, 0, -0.13, 0, { cast: false });
    box(W * 2, H, 0.2, M.wall, 0, H / 2, -W, { cast: false });
    box(0.2, H, W * 2, M.wall2, -W, H / 2, 0, { cast: false });
    box(W * 2 + 0.04, 0.05, 0.26, M.woodDark, 0, H + 0.02, -W, { cast: false });
    box(0.26, 0.05, W * 2 + 0.04, M.woodDark, -W, H + 0.02, 0, { cast: false });

    /* ---------------- okno s výhledem (parallax pozadí) ---------------- */
    var backdropTex = skyTexture();
    var backdropMat = new THREE.MeshBasicMaterial({ map: backdropTex, fog: false });
    var backdrop = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), backdropMat);
    backdrop.position.set(-1.0, 1.45, -9.0);
    scene.add(backdrop);

    var texLoader = new THREE.TextureLoader();
    texLoader.load('img/window.jpg', function (t) { t.encoding = THREE.sRGBEncoding; backdropMat.map = t; backdropMat.needsUpdate = true; }, undefined, function () {
      texLoader.load('img/window.png', function (t) { t.encoding = THREE.sRGBEncoding; backdropMat.map = t; backdropMat.needsUpdate = true; }, undefined, function () {});
    });

    box(3.6, 0.1, 0.16, M.dark, -1.0, 0.27, -W + 0.14);
    box(3.6, 0.1, 0.16, M.dark, -1.0, 2.63, -W + 0.14);
    box(0.1, 2.46, 0.16, M.dark, -2.85, 1.45, -W + 0.14);
    box(0.1, 2.46, 0.16, M.dark, 0.85, 1.45, -W + 0.14);
    box(0.055, 2.4, 0.12, M.dark, -1.0, 1.45, -W + 0.14);
    box(2.55, 2.3, 0.02, M.glass, -1.0, 1.45, -W + 0.17, { cast: false, recv: false });
    box(0.34, 2.55, 0.12, M.fabric, -3.0, 1.4, -W + 0.32);
    box(0.34, 2.55, 0.12, M.fabric, 1.0, 1.4, -W + 0.32);

    /* ---------------- koupelna (vzadu vlevo) ---------------- */
    box(2.7, 0.04, 2.6, M.marble, -3.65, 0.02, -3.7, { cast: false });
    box(0.14, 1.0, 2.6, M.wall2, -2.28, 0.5, -3.7);
    box(1.8, 0.5, 0.82, M.white, -3.9, 0.27, -4.5);
    box(1.6, 0.1, 0.62, std({ color: 0xcfe0ea, roughness: 0.18, metalness: 0.15 }), -3.9, 0.48, -4.5, { cast: false });
    cyl(0.022, 0.022, 0.26, M.brass, -4.7, 0.66, -4.5);
    box(0.9, 0.82, 0.5, M.woodDark, -4.75, 0.41, -2.9);
    box(0.95, 0.05, 0.55, M.marble, -4.75, 0.84, -2.9);
    cyl(0.16, 0.13, 0.12, M.white, -4.75, 0.92, -2.9);
    cyl(0.018, 0.018, 0.22, M.brass, -4.93, 1.02, -2.9);
    box(0.04, 0.85, 0.7, std({ color: 0xcddbe6, roughness: 0.05, metalness: 0.95 }), -W + 0.14, 1.55, -2.9, { cast: false, recv: false });
    // pračka
    box(0.62, 0.86, 0.62, M.white, -2.55, 0.43, -4.5);
    box(0.62, 0.04, 0.62, std({ color: 0xb8bec6, roughness: 0.4, metalness: 0.3 }), -2.55, 0.88, -4.5, { cast: false });
    cyl(0.16, 0.16, 0.04, std({ color: 0x2a2e34, roughness: 0.2, metalness: 0.5 }), -2.55, 0.72, -4.18);
    // ručníky a fény
    box(0.3, 0.42, 0.08, M.olive, -2.35, 1.3, -3.3);
    box(0.26, 0.1, 0.2, M.white, -4.75, 0.87, -2.5);
    box(0.22, 0.08, 0.16, M.cream, -4.75, 0.95, -2.52);
    cyl(0.03, 0.03, 0.18, std({ color: 0xd9cfc0, roughness: 0.5 }), -4.6, 0.95, -4.3);
    // rostlinka
    cyl(0.05, 0.04, 0.08, M.terracotta, -3.5, 1.77, -4.7);
    sph(0.07, M.green, -3.5, 1.85, -4.7, 0);

    /* ---------------- kuchyně (vzadu střed) ---------------- */
    box(3.6, 0.9, 0.62, M.cream, 0.2, 0.45, -W + 0.35);
    box(3.7, 0.06, 0.68, M.marble, 0.2, 0.93, -W + 0.35);
    box(3.3, 0.74, 0.34, M.cream, 0.3, 2.22, -W + 0.24);
    box(3.35, 0.025, 0.35, M.brass, 0.3, 1.84, -W + 0.25, { cast: false });
    box(0.75, 0.02, 0.45, std({ color: 0x15171b, roughness: 0.22, metalness: 0.45 }), 1.0, 0.96, -W + 0.35, { cast: false });
    box(0.62, 0.02, 0.4, std({ color: 0x7f868d, roughness: 0.3, metalness: 0.7 }), -0.6, 0.96, -W + 0.35, { cast: false });
    cyl(0.02, 0.02, 0.32, M.brass, -0.6, 1.1, -W + 0.2);
    box(0.03, 0.03, 0.18, M.brass, -0.6, 1.25, -W + 0.28);
    // espresso + konvice
    box(0.22, 0.28, 0.18, std({ color: 0x1a1c20, roughness: 0.25, metalness: 0.4 }), 1.55, 1.08, -W + 0.4);
    cyl(0.06, 0.06, 0.2, M.metal, 1.85, 1.04, -W + 0.4);
    box(0.4, 0.03, 0.28, M.wood, -1.2, 0.96, -W + 0.4, { ry: 0.08 });
    // ostrůvek
    box(2.0, 0.88, 0.92, M.woodDark, 0.0, 0.44, -1.95);
    box(2.12, 0.07, 1.02, M.marble, 0.0, 0.92, -1.95);
    box(1.9, 0.06, 0.8, M.cream, 0.0, 0.2, -1.95, { cast: false });
    for (var s = 0; s < 3; s++) {
      var sx = -0.65 + s * 0.66;
      cyl(0.18, 0.18, 0.05, M.woodDark, sx, 0.62, -1.1);
      cyl(0.035, 0.035, 0.6, M.metal, sx, 0.31, -1.1);
      cyl(0.16, 0.2, 0.03, M.metal, sx, 0.02, -1.1);
    }
    for (var l = 0; l < 3; l++) {
      cyl(0.055, 0.055, 0.03, M.metal, -0.6 + l * 0.6, 2.34, -1.95);
      cyl(0.1, 0.12, 0.15, M.emitWarm, -0.6 + l * 0.6, 2.25, -1.95);
    }
    // miska s ovocem
    cyl(0.2, 0.14, 0.09, std({ color: 0xf1ece2, roughness: 0.7 }), 0.0, 0.99, -1.8);
    sph(0.06, std({ color: 0xc86b3f, roughness: 0.75 }), -0.04, 1.06, -1.8, 0);
    sph(0.055, std({ color: 0x8a9a5b, roughness: 0.75 }), 0.05, 1.05, -1.85, 0);

    /* ---------------- hostinský pokoj (vzadu vpravo) ---------------- */
    box(2.6, 0.04, 2.6, M.rug, 3.65, 0.025, -3.7, { cast: false });
    box(1.5, 0.34, 2.0, M.fabric2, 3.7, 0.17, -4.3);
    box(1.4, 0.3, 1.9, M.white, 3.7, 0.46, -4.3);
    box(0.14, 0.95, 1.9, M.fabric2, 2.9, 0.6, -4.3);
    // noční stolek + lampička
    box(0.4, 0.4, 0.4, M.wood, 2.95, 0.2, -2.9);
    cyl(0.09, 0.12, 0.22, M.emitWarm, 2.95, 0.52, -2.9);
    // pracovní stůl + židle
    box(1.2, 0.06, 0.6, M.wood, 4.0, 0.74, -2.6);
    box(1.1, 0.04, 0.5, M.woodDark, 4.0, 0.2, -2.6, { cast: false });
    box(0.42, 0.05, 0.42, M.fabric2, 4.0, 0.44, -1.9);
    box(0.42, 0.4, 0.06, M.fabric2, 4.0, 0.65, -1.65);
    box(0.05, 0.42, 0.05, M.woodDark, 3.8, 0.21, -1.7);
    box(0.05, 0.42, 0.05, M.woodDark, 4.2, 0.21, -1.7);
    // WiFi router + knížky
    box(0.22, 0.04, 0.16, std({ color: 0x1a1c20, roughness: 0.3 }), 3.0, 0.42, -2.95);
    box(0.28, 0.03, 0.2, std({ color: 0xe8e0d2, roughness: 0.9 }), 3.0, 0.46, -2.95, { ry: 0.2 });
    // skříň
    box(0.5, 1.9, 1.4, M.woodDark, 4.75, 0.95, -3.8);
    // lampa
    cyl(0.16, 0.2, 0.04, M.metal, 3.7, 0.02, -2.6);
    cyl(0.022, 0.022, 1.5, M.metal, 3.7, 0.77, -2.6);
    cyl(0.18, 0.24, 0.24, M.emitWarm, 3.7, 1.55, -2.6);

    /* ---------------- obývák (vpředu střed/vpravo) ---------------- */
    box(4.2, 0.045, 3.4, M.rug, 1.8, 0.025, 1.6, { cast: false });

    // sofa (čelem k oknu)
    box(3.2, 0.38, 1.05, M.fabric, 1.8, 0.3, 3.4);
    box(3.2, 0.62, 0.22, M.fabric, 1.8, 0.68, 3.83);
    box(0.24, 0.56, 1.05, M.fabric, 0.18, 0.49, 3.4);
    box(0.24, 0.56, 1.05, M.fabric, 3.42, 0.49, 3.4);
    box(0.9, 0.13, 0.86, M.white, 0.85, 0.56, 3.32);
    box(0.9, 0.13, 0.86, M.white, 1.8, 0.56, 3.32);
    box(0.9, 0.13, 0.86, M.white, 2.75, 0.56, 3.32);
    box(0.36, 0.36, 0.12, M.terracotta, 2.95, 0.78, 3.7, { ry: 0.3 });
    box(0.36, 0.36, 0.12, M.olive, 0.65, 0.78, 3.7, { ry: -0.25 });
    [[0.18, 2.9], [3.42, 2.9], [0.18, 3.9], [3.42, 3.9]].forEach(function (p) {
      box(0.06, 0.12, 0.06, M.woodDark, p[0], 0.06, p[1]);
    });

    // konferenční stolek
    box(1.6, 0.07, 0.9, M.wood, 1.8, 0.45, 1.6);
    [[0.07, 1.2], [1.53, 1.2], [0.07, 2.0], [1.53, 2.0]].forEach(function (p) {
      box(0.055, 0.42, 0.055, M.woodDark, p[0], 0.21, p[1]);
    });
    box(0.3, 0.045, 0.38, std({ color: 0xefe7d9, roughness: 0.8 }), 1.45, 0.51, 1.6);
    box(0.28, 0.04, 0.36, std({ color: 0xc9b79c, roughness: 0.8 }), 1.47, 0.56, 1.63);
    cyl(0.09, 0.11, 0.14, M.terracotta, 2.15, 0.55, 1.6);
    // knížky
    box(0.32, 0.03, 0.24, std({ color: 0xe8e0d2, roughness: 0.9 }), 1.95, 0.5, 1.5, { ry: 0.18 });
    box(0.3, 0.03, 0.22, std({ color: 0x8496a6, roughness: 0.9 }), 1.97, 0.53, 1.52, { ry: -0.12 });

    // křeslo u okna
    box(0.92, 0.34, 0.92, M.fabric2, -0.4, 0.27, 0.3);
    box(0.92, 0.5, 0.18, M.fabric2, -0.4, 0.6, -0.07);
    box(0.18, 0.48, 0.92, M.fabric2, -0.77, 0.49, 0.3);
    box(0.18, 0.48, 0.92, M.fabric2, -0.03, 0.49, 0.3);

    // stojací lampa
    cyl(0.17, 0.21, 0.04, M.metal, 4.4, 0.02, 0.6);
    cyl(0.022, 0.022, 1.65, M.metal, 4.4, 0.85, 0.6);
    cyl(0.2, 0.3, 0.3, M.emitWarm, 4.4, 1.72, 0.6);

    // rostlina
    cyl(0.24, 0.17, 0.44, M.terracotta, 4.4, 0.22, 4.2);
    sph(0.4, M.green, 4.4, 0.78, 4.2, 1);
    sph(0.28, M.green2, 4.15, 1.02, 4.05, 1);
    sph(0.22, M.green, 4.6, 0.95, 4.35, 1);

    // TV + konzole na příčce
    box(0.16, 1.0, 1.7, M.dark, 0.0, 1.6, 2.5, { cast: false });
    box(0.1, 0.88, 1.55, std({ color: 0x0b0d10, roughness: 0.15, metalness: 0.5 }), 0.0, 1.6, 2.5, { cast: false, recv: false });
    box(0.28, 0.3, 1.75, M.woodDark, 0.18, 0.15, 2.5);

    // pracovní koutek (Airbnb)
    box(1.1, 0.06, 0.55, M.wood, 4.4, 0.74, 2.6);
    box(1.0, 0.04, 0.45, M.woodDark, 4.4, 0.2, 2.6, { cast: false });
    box(0.42, 0.05, 0.42, M.fabric2, 4.4, 0.44, 1.9);
    box(0.42, 0.4, 0.06, M.fabric2, 4.4, 0.65, 1.65);
    box(0.05, 0.42, 0.05, M.woodDark, 4.2, 0.21, 1.7);
    box(0.05, 0.42, 0.05, M.woodDark, 4.6, 0.21, 1.7);
    // laptop
    box(0.34, 0.02, 0.24, std({ color: 0x2a2d33, roughness: 0.3, metalness: 0.5 }), 4.4, 0.78, 2.6);
    box(0.34, 0.22, 0.02, std({ color: 0x1a1c20, roughness: 0.2, metalness: 0.4 }), 4.4, 0.9, 2.72, { ry: 0.15 });

    /* ---------------- ložnice (vpředu vlevo) ---------------- */
    box(3.6, 0.04, 3.4, M.rug, -2.8, 0.025, 1.6, { cast: false });
    box(2.2, 0.34, 2.4, M.woodDark, -3.6, 0.17, 2.6);
    box(2.1, 0.3, 2.3, M.white, -3.6, 0.46, 2.6);
    box(0.16, 1.05, 2.4, M.fabric2, -4.8, 0.75, 2.6);
    box(0.54, 0.15, 0.82, M.white, -4.45, 0.69, 1.95);
    box(0.54, 0.15, 0.82, M.white, -4.45, 0.69, 3.25);
    box(1.3, 0.1, 2.3, M.olive, -2.7, 0.65, 2.6);
    box(0.42, 0.42, 0.42, M.wood, -1.8, 0.21, 1.2);
    cyl(0.09, 0.12, 0.24, M.emitWarm, -1.8, 0.55, 1.2);
    box(0.42, 0.42, 0.42, M.wood, -1.8, 0.21, 4.0);
    cyl(0.09, 0.12, 0.24, M.emitWarm, -1.8, 0.55, 4.0);
    // skříň
    box(0.5, 1.9, 2.6, M.woodDark, -4.75, 0.95, 2.6);
    // sklenice a knížka
    cyl(0.03, 0.03, 0.09, M.glass, -1.65, 0.47, 1.1);
    box(0.2, 0.03, 0.14, std({ color: 0x2f3540, roughness: 0.9 }), -1.8, 0.44, 1.3, { ry: -0.2 });

    /* ---------------- CC0 model z Poly Haven (Shelf_01) ---------------- */
    if (THREE.GLTFLoader) {
      var gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load('models/shelf/Shelf_01_1k.gltf', function (gltf) {
        var shelf = gltf.scene;
        shelf.scale.set(0.001, 0.001, 0.001);
        shelf.position.set(3.9, 0, 4.0);
        shelf.rotation.y = -Math.PI / 2;
        shelf.traverse(function (c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        scene.add(shelf);
      }, undefined, function (e) { /* tichy fallback na boxy */ });
    }

    /* ---------------- detaily a kontaktní stíny ---------------- */
    var aoTex = aoTexture();
    function aoBlob(w, d, x, z, y, op) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: op || 0.5, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      scene.add(m);
    }
    aoBlob(3.8, 1.9, 1.8, 3.4, 0.062, 0.5);
    aoBlob(2.1, 1.3, 1.8, 1.6, 0.062, 0.4);
    aoBlob(3.2, 3.6, -3.6, 2.6, 0.045, 0.45);
    aoBlob(2.8, 1.4, 0.0, -1.95, 0.05, 0.45);
    aoBlob(1.3, 1.3, -0.4, 0.3, 0.05, 0.35);
    aoBlob(1.0, 1.0, 4.4, 4.2, 0.05, 0.35);
    aoBlob(1.8, 2.2, 3.7, -3.7, 0.045, 0.4);
    aoBlob(1.0, 1.0, 4.4, 2.6, 0.05, 0.35);

    // koupelna detaily
    box(0.26, 0.1, 0.2, M.white, -4.75, 0.87, -2.5);
    box(0.22, 0.08, 0.16, M.cream, -4.75, 0.95, -2.52);
    cyl(0.03, 0.03, 0.15, std({ color: 0xd9cfc0, roughness: 0.5 }), -3.95, 0.59, -4.18);
    cyl(0.03, 0.03, 0.12, std({ color: 0xbfae97, roughness: 0.5 }), -3.86, 0.57, -4.14);

    /* ---------------- pohledy ---------------- */
    var VIEWS = {
      plan:   { theta: 0.6, phi: 0.78, r: 24, t: [0, 0.55, 0] },
      living: { theta: 0.36, phi: 1.16, r: 11, t: [1.6, 1.0, 2.0] },
      bed:    { theta: 0.92, phi: 1.14, r: 9.5, t: [-3.4, 0.75, 2.6] },
      bath:   { theta: 0.62, phi: 1.06, r: 8.5, t: [-3.6, 0.9, -3.6] },
      guest:  { theta: 1.35, phi: 1.1, r: 8.5, t: [3.7, 0.75, -3.6] }
    };
    var BASE_R = {};
    for (var vk in VIEWS) BASE_R[vk] = VIEWS[vk].r;

    var INFO = {
      plan:   ['4-pokojový byt · Airbnb ready', 'Celkem ~110 m² · 4+kk · výhled na záliv · pracovní koutek, pračka, espresso'],
      living: ['Obývák & kuchyně', 'Otevřený prostor, smart TV, pracovní koutek, mramorová deska, barový ostrůvek'],
      bed:    ['Ložnice', 'Dubové obložení, šatna, noční stolky, výhled na moře'],
      bath:   ['Koupelna', 'Travertin, vana u okna, pračka, mosazné baterie, fény'],
      guest:  ['Hostinský pokoj', 'Pracovní stůl, WiFi, skříň, výhled na záliv']
    };

    var HOTSPOTS = [
      { p: [1.8, 1.3, 2.5], label: 'Obývák & kuchyně', view: 'living' },
      { p: [-3.6, 1.05, 2.6], label: 'Ložnice', view: 'bed' },
      { p: [-3.8, 1.55, -3.6], label: 'Koupelna', view: 'bath' },
      { p: [3.7, 1.05, -3.6], label: 'Hostinský pokoj', view: 'guest' }
    ];

    var labelsEl = document.getElementById('labels');
    HOTSPOTS.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'hs';
      el.innerHTML = '<i></i>' + h.label;
      el.addEventListener('click', function (e) { e.stopPropagation(); setView(h.view); });
      labelsEl.appendChild(el);
      h.el = el;
      h.v = new THREE.Vector3(h.p[0], h.p[1], h.p[2]);
    });

    /* ---------------- kamera ---------------- */
    var cur = { theta: VIEWS.plan.theta, phi: VIEWS.plan.phi, r: VIEWS.plan.r, t: new THREE.Vector3().fromArray(VIEWS.plan.t) };
    var goal = { theta: cur.theta, phi: cur.phi, r: cur.r, t: cur.t.clone() };
    var activeView = 'plan';
    var lastTouch = performance.now();

    var panel = document.getElementById('panel');
    var hint = document.getElementById('hint');
    var qbtn = document.getElementById('qbtn');
    if (qbtn) {
      qbtn.textContent = HIGH ? 'Plynule' : 'Vysoká kvalita';
      qbtn.addEventListener('click', function () {
        var u = new URL(window.location.href);
        if (HIGH) u.searchParams.delete('q'); else u.searchParams.set('q', 'high');
        window.location.href = u.toString();
      });
    }

    function setCam(theta, phi, r, t) {
      var sp = Math.sin(phi), cp = Math.cos(phi);
      camera.position.set(t.x + r * sp * Math.sin(theta), t.y + r * cp, t.z + r * sp * Math.cos(theta));
      camera.lookAt(t.x, t.y, t.z);
    }
    function setView(name) {
      var v = VIEWS[name];
      if (!v) return;
      activeView = name;
      goal.theta = v.theta; goal.phi = v.phi; goal.r = v.r;
      goal.t.fromArray(v.t);
      lastTouch = performance.now();
      [].forEach.call(document.querySelectorAll('nav button'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-view') === name);
      });
      var info = INFO[name];
      panel.querySelector('h2').textContent = info[0];
      panel.querySelector('p').textContent = info[1];
      panel.classList.toggle('on', name !== 'plan');
      hint.style.opacity = name === 'plan' ? '1' : '0';
    }

    /* ---------------- nav ---------------- */
    var nav = document.querySelector('nav');
    nav.innerHTML = '';
    ['plan:Půdorys', 'living:Obývák', 'bed:Ložnice', 'guest:Hostinský', 'bath:Koupelna'].forEach(function (s) {
      var parts = s.split(':');
      var b = document.createElement('button');
      b.setAttribute('data-view', parts[0]);
      b.textContent = parts[1];
      if (parts[0] === 'plan') b.classList.add('on');
      b.addEventListener('click', function () { setView(parts[0]); });
      nav.appendChild(b);
    });

    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY };
      lastTouch = performance.now();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      goal.theta -= (e.clientX - drag.x) * 0.006;
      goal.phi = Math.max(0.22, Math.min(1.42, goal.phi - (e.clientY - drag.y) * 0.004));
      drag.x = e.clientX; drag.y = e.clientY;
      lastTouch = performance.now();
    });
    function endDrag() { drag = null; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);

    /* ---------------- přizpůsobení obrazovce ---------------- */
    var tmp = new THREE.Vector3();
    var CORNERS = [];
    [-W, W].forEach(function (x) {
      [0, H].forEach(function (y) {
        [-W, W].forEach(function (z) { CORNERS.push(new THREE.Vector3(x, y, z)); });
      });
    });

    function fitPlan() {
      var p = VIEWS.plan;
      var t = new THREE.Vector3().fromArray(p.t);
      var r = 26;
      for (var i = 0; i < 4; i++) {
        setCam(p.theta, p.phi, r, t);
        var mx = 0, my = 0;
        CORNERS.forEach(function (c) {
          tmp.copy(c).project(camera);
          mx = Math.max(mx, Math.abs(tmp.x));
          my = Math.max(my, Math.abs(tmp.y));
        });
        var s = Math.max(mx / 1.02, my / 0.62);
        r = r * s;
        if (Math.abs(s - 1) < 0.015) break;
      }
      p.r = r;
    }

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = camera.aspect < 1 ? 44 : 38;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(w, h);
      var af = camera.aspect < 1 ? Math.pow(1 / camera.aspect, 0.55) : Math.pow(1 / camera.aspect, 0.35);
      for (var k in VIEWS) {
        if (k === 'plan') continue;
        VIEWS[k].r = BASE_R[k] * af;
        if (activeView === k) goal.r = VIEWS[k].r;
      }
      fitPlan();
      if (activeView === 'plan') goal.r = VIEWS.plan.r;
    }
    window.addEventListener('resize', resize);
    resize();
    cur.theta = goal.theta; cur.phi = goal.phi; cur.r = goal.r; cur.t.copy(goal.t);

    /* ---------------- načítání ---------------- */
    var prog = document.getElementById('prog');
    var pct = document.getElementById('pct');
    var loader = document.getElementById('loader');
    var loaded = 0;
    var fake = 0;
    var fakeTimer = setInterval(function () {
      fake = Math.min(92, fake + 8 + Math.random() * 10);
      prog.style.width = fake + '%';
      if (fake > 55) pct.textContent = 'Světla a materiály';
      if (fake > 78) pct.textContent = 'Poslední detaily';
    }, 90);
    function ready() {
      if (loaded) return;
      loaded = 1;
      clearInterval(fakeTimer);
      prog.style.width = '100%';
      pct.textContent = 'Hotovo';
      setTimeout(function () { loader.classList.add('done'); }, 380);
      setView('plan');
    }

    /* ---------------- smyčka ---------------- */
    var clock = new THREE.Clock();
    var frames = 0;
    function tick() {
      var dt = Math.min(clock.getDelta(), 0.05);
      var now = performance.now();
      if (!drag && now - lastTouch > 4500) goal.theta += 0.045 * dt;
      var k = 1 - Math.pow(0.0016, dt);
      cur.theta += (goal.theta - cur.theta) * k;
      cur.phi += (goal.phi - cur.phi) * k;
      cur.r += (goal.r - cur.r) * k;
      cur.t.lerp(goal.t, k);
      setCam(cur.theta, cur.phi, cur.r, cur.t);
      HOTSPOTS.forEach(function (h) {
        tmp.copy(h.v).project(camera);
        var vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && h.view !== activeView;
        h.el.style.opacity = vis ? '1' : '0';
        h.el.style.pointerEvents = vis ? 'auto' : 'none';
        h.el.style.left = ((tmp.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        h.el.style.top = ((-tmp.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      });
      if (composer) composer.render(); else renderer.render(scene, camera);
      frames++;
      if (frames === 2) ready();
      requestAnimationFrame(tick);
    }
    tick();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
})();