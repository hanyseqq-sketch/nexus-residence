/* NEXUS RESIDENCE — interaktivní 3D prezentace (Three.js, bez buildu).
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
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HIGH ? 1.5 : 1.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.powerPreference = 'high-performance';

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

    /* ---------------- HDRI prostředí (Poly Haven, CC0) ---------------- */
    if (HIGH && THREE.RGBELoader && THREE.PMREMGenerator) {
      try {
        var pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        new THREE.RGBELoader().load('hdri/dusk.hdr', function (hdr) {
          try {
            scene.environment = pmrem.fromEquirectangular(hdr).texture;
            hdr.dispose();
          } catch (e) {}
        }, undefined, function () {});
      } catch (e) {}
    }

    /* ---------------- světlo ---------------- */
    scene.add(new THREE.HemisphereLight(0xcfdff7, 0x241f1a, 0.42));

    var key = new THREE.DirectionalLight(0xfff0d6, 1.85);
    key.position.set(9, 15, 11);
    key.castShadow = true;
    key.shadow.mapSize.set(HIGH ? 1024 : 512, HIGH ? 1024 : 512);
    key.shadow.camera.left = -13; key.shadow.camera.right = 13;
    key.shadow.camera.top = 13; key.shadow.camera.bottom = -13;
    key.shadow.camera.near = 1; key.shadow.camera.far = 60;
    key.shadow.bias = -0.0007;
    key.shadow.radius = 3.5;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0x8fb4e8, 0.3);
    fill.position.set(-11, 7, -9);
    scene.add(fill);

    var sun = new THREE.PointLight(0xffcf9a, 0.9, 15, 2);
    sun.position.set(0.4, 2.5, 1.4);
    scene.add(sun);

    var lampLight = new THREE.PointLight(0xffc07a, 0.55, 6, 2);
    lampLight.position.set(3.7, 1.6, 0.4);
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

    function marbleTexture(rx, ry) {
      return tex(512, 512, function (g, w, h) {
        g.fillStyle = '#e7e0d5'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 30; i++) {
          g.beginPath();
          var x = rnd(0, w), y = rnd(0, h);
          g.moveTo(x, y);
          for (var k = 0; k < 4; k++) {
            x += rnd(-150, 150); y += rnd(-150, 150);
            g.lineTo(x, y);
          }
          g.strokeStyle = 'rgba(120,112,102,' + rnd(0.05, 0.18).toFixed(2) + ')';
          g.lineWidth = rnd(0.6, 2.4);
          g.stroke();
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

    function fabricTexture(base, rx, ry) {
      return tex(256, 256, function (g, w, h) {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 5200; i++) {
          g.fillStyle = 'rgba(' + (Math.random() > .5 ? '255,255,255,' : '0,0,0,') + rnd(0.02, 0.07).toFixed(3) + ')';
          g.fillRect(rnd(0, w), rnd(0, h), 1.6, 1.6);
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
      return tex(768, 512, function (g, w, h) {
        var sky = g.createLinearGradient(0, 0, 0, h * 0.62);
        sky.addColorStop(0, '#1d3f74');
        sky.addColorStop(0.4, '#5d84bd');
        sky.addColorStop(0.72, '#d99a7e');
        sky.addColorStop(1, '#ffc99b');
        g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);

        var glow = g.createRadialGradient(w * 0.66, h * 0.57, 4, w * 0.66, h * 0.57, h * 0.5);
        glow.addColorStop(0, 'rgba(255,236,205,.95)');
        glow.addColorStop(1, 'rgba(255,236,205,0)');
        g.fillStyle = glow; g.fillRect(0, 0, w, h * 0.62);

        var bx = 0;
        while (bx < w) {
          var bw = rnd(14, 44), bh = rnd(18, 92);
          g.fillStyle = 'rgba(10,20,38,.94)';
          g.fillRect(bx, h * 0.62 - bh, bw, bh);
          g.fillStyle = 'rgba(255,214,150,.55)';
          for (var wy = h * 0.62 - bh + 6; wy < h * 0.62 - 4; wy += 9) {
            for (var wx = bx + 4; wx < bx + bw - 4; wx += 7) {
              if (Math.random() > 0.6) g.fillRect(wx, wy, 2.4, 3.4);
            }
          }
          bx += bw + rnd(3, 10);
        }

        var sea = g.createLinearGradient(0, h * 0.62, 0, h);
        sea.addColorStop(0, '#2b4a72');
        sea.addColorStop(0.5, '#142744');
        sea.addColorStop(1, '#091324');
        g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h * 0.38);
        for (var i = 0; i < 100; i++) {
          var y = h * 0.63 + Math.random() * h * 0.34;
          g.fillStyle = 'rgba(255,205,160,' + rnd(0.03, 0.18).toFixed(3) + ')';
          g.fillRect(rnd(0, w), y, rnd(10, 70), rnd(1, 2.4));
        }
      }, 1, 1);
    }

    /* ---------------- materiály ---------------- */
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
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xcfe3f2, roughness: 0.08, metalness: 0, transparent: true,
        opacity: 0.16, side: THREE.DoubleSide
      }),
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

    /* ---------------- půdorys ---------------- */
    var W = 4.5, H = 2.9;

    box(W * 2, 0.26, W * 2, M.floor, 0, -0.13, 0, { cast: false });
    box(W * 2, H, 0.2, M.wall, 0, H / 2, -W, { cast: false });
    box(0.2, H, W * 2, M.wall2, -W, H / 2, 0, { cast: false });
    // tmavá hrana řezu
    box(W * 2 + 0.04, 0.05, 0.26, M.woodDark, 0, H + 0.02, -W, { cast: false });
    box(0.26, 0.05, W * 2 + 0.04, M.woodDark, -W, H + 0.02, 0, { cast: false });

    // sokl
    box(W * 2, 0.1, 0.06, M.white, 0, 0.05, -W + 0.13, { cast: false });
    box(0.06, 0.1, W * 2, M.white, -W + 0.13, 0.05, 0, { cast: false });

    /* ---------------- okno s výhledem ---------------- */
    var view = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.3),
      new THREE.MeshBasicMaterial({ map: skyTexture() })
    );
    view.position.set(-1.05, 1.45, -W + 0.11);
    scene.add(view);

    box(2.9, 0.1, 0.16, M.dark, -1.05, 0.27, -W + 0.14);
    box(2.9, 0.1, 0.16, M.dark, -1.05, 2.63, -W + 0.14);
    box(0.1, 2.46, 0.16, M.dark, -2.5, 1.45, -W + 0.14);
    box(0.1, 2.46, 0.16, M.dark, 0.4, 1.45, -W + 0.14);
    box(0.055, 2.4, 0.12, M.dark, -1.05, 1.45, -W + 0.14);

    box(0.3, 2.55, 0.12, M.fabric, -2.62, 1.4, -W + 0.32);
    box(0.3, 2.55, 0.12, M.fabric, 0.52, 1.4, -W + 0.32);

    /* ---------------- koupelna (vzadu vlevo) ---------------- */
    box(2.05, 0.04, 2.0, M.marble, -3.37, 0.02, -3.4, { cast: false });
    box(0.14, 1.0, 2.0, M.wall2, -2.34, 0.5, -3.4);

    box(1.75, 0.5, 0.82, M.white, -3.45, 0.27, -4.02);
    box(1.55, 0.1, 0.62, std({ color: 0xcfe0ea, roughness: 0.18, metalness: 0.15 }), -3.45, 0.48, -4.02, { cast: false });
    cyl(0.022, 0.022, 0.26, M.brass, -4.2, 0.66, -4.02);

    box(0.85, 0.8, 0.46, M.woodDark, -4.1, 0.4, -2.75);
    box(0.9, 0.05, 0.5, M.marble, -4.1, 0.82, -2.75);
    cyl(0.16, 0.13, 0.12, M.white, -4.1, 0.9, -2.75);
    cyl(0.018, 0.018, 0.22, M.brass, -4.28, 1.0, -2.75);
    box(0.04, 0.85, 0.7, std({ color: 0xcddbe6, roughness: 0.05, metalness: 0.95 }), -W + 0.14, 1.55, -2.75, { cast: false, recv: false });

    box(0.3, 0.42, 0.08, M.olive, -2.55, 1.3, -3.1);
    box(0.5, 0.06, 0.18, M.wood, -3.5, 1.7, -4.3);

    /* ---------------- kuchyně ---------------- */
    box(3.85, 0.9, 0.62, M.cream, 2.32, 0.45, -W + 0.35);
    box(3.95, 0.06, 0.68, M.marble, 2.32, 0.93, -W + 0.35);
    box(3.55, 0.74, 0.34, M.cream, 2.45, 2.22, -W + 0.24);
    box(3.6, 0.025, 0.35, M.brass, 2.45, 1.84, -W + 0.25, { cast: false });

    box(0.75, 0.02, 0.45, std({ color: 0x15171b, roughness: 0.22, metalness: 0.45 }), 3.15, 0.96, -W + 0.35, { cast: false });
    box(0.62, 0.02, 0.4, std({ color: 0x7f868d, roughness: 0.3, metalness: 0.7 }), 1.35, 0.96, -W + 0.35, { cast: false });
    cyl(0.02, 0.02, 0.32, M.brass, 1.35, 1.1, -W + 0.2);
    box(0.03, 0.03, 0.18, M.brass, 1.35, 1.25, -W + 0.28);

    box(2.0, 0.88, 0.92, M.woodDark, 2.2, 0.44, -1.95);
    box(2.12, 0.07, 1.02, M.marble, 2.2, 0.92, -1.95);
    box(1.9, 0.06, 0.8, M.cream, 2.2, 0.2, -1.95, { cast: false });
    for (var s = 0; s < 3; s++) {
      var sx = 1.55 + s * 0.66;
      cyl(0.18, 0.18, 0.05, M.woodDark, sx, 0.62, -1.1);
      cyl(0.035, 0.035, 0.6, M.metal, sx, 0.31, -1.1);
      cyl(0.16, 0.2, 0.03, M.metal, sx, 0.02, -1.1);
    }
    for (var l = 0; l < 3; l++) {
      cyl(0.055, 0.055, 0.03, M.metal, 1.6 + l * 0.6, 2.34, -1.95);
      cyl(0.1, 0.12, 0.15, M.emitWarm, 1.6 + l * 0.6, 2.25, -1.95);
    }

    /* ---------------- obývák ---------------- */
    box(3.7, 0.045, 2.9, M.rug, 0.7, 0.025, 1.05, { cast: false });

    box(2.95, 0.38, 1.05, M.fabric, 0.7, 0.3, 2.75);
    box(2.95, 0.62, 0.22, M.fabric, 0.7, 0.68, 3.18);
    box(0.24, 0.56, 1.05, M.fabric, -0.79, 0.49, 2.75);
    box(0.24, 0.56, 1.05, M.fabric, 2.19, 0.49, 2.75);
    box(0.84, 0.13, 0.86, M.white, -0.2, 0.56, 2.66);
    box(0.84, 0.13, 0.86, M.white, 0.7, 0.56, 2.66);
    box(0.84, 0.13, 0.86, M.white, 1.6, 0.56, 2.66);
    box(0.36, 0.36, 0.12, M.terracotta, 1.75, 0.78, 3.05, { ry: 0.3 });
    box(0.36, 0.36, 0.12, M.olive, -0.1, 0.78, 3.05, { ry: -0.25 });
    [[-0.7, 2.3], [2.1, 2.3], [-0.7, 3.2], [2.1, 3.2]].forEach(function (p) {
      box(0.06, 0.12, 0.06, M.woodDark, p[0], 0.06, p[1]);
    });

    box(1.5, 0.07, 0.88, M.wood, 0.7, 0.45, 1.0);
    [[0.03, 0.62], [1.37, 0.62], [0.03, 1.38], [1.37, 1.38]].forEach(function (p) {
      box(0.055, 0.42, 0.055, M.woodDark, p[0], 0.21, p[1]);
    });
    box(0.28, 0.045, 0.36, std({ color: 0xefe7d9, roughness: 0.8 }), 0.42, 0.51, 1.0);
    box(0.26, 0.04, 0.34, std({ color: 0xc9b79c, roughness: 0.8 }), 0.44, 0.56, 1.03);
    cyl(0.09, 0.11, 0.14, M.terracotta, 1.1, 0.55, 1.02);

    box(0.92, 0.34, 0.92, M.fabric2, -1.55, 0.27, 0.15);
    box(0.92, 0.5, 0.18, M.fabric2, -1.55, 0.6, -0.22);
    box(0.18, 0.48, 0.92, M.fabric2, -1.92, 0.49, 0.15);
    box(0.18, 0.48, 0.92, M.fabric2, -1.18, 0.49, 0.15);

    cyl(0.17, 0.21, 0.04, M.metal, 3.7, 0.02, 0.4);
    cyl(0.022, 0.022, 1.65, M.metal, 3.7, 0.85, 0.4);
    cyl(0.2, 0.3, 0.3, M.emitWarm, 3.7, 1.72, 0.4);

    cyl(0.24, 0.17, 0.44, M.terracotta, 3.75, 0.22, 3.5);
    sph(0.4, M.green, 3.75, 0.78, 3.5, 1);
    sph(0.28, M.green2, 3.55, 1.02, 3.35, 1);
    sph(0.22, M.green, 3.95, 0.95, 3.62, 1);

    // TV + konzole na levé stěně
    box(0.06, 0.92, 1.62, M.dark, -W + 0.13, 1.62, 0.95, { cast: false });
    box(0.03, 0.8, 1.5, std({ color: 0x0b0d10, roughness: 0.15, metalness: 0.5 }), -W + 0.1, 1.62, 0.95, { cast: false, recv: false });
    box(0.34, 0.34, 1.9, M.woodDark, -W + 0.3, 0.17, 0.95);

    /* ---------------- jídelna ---------------- */
    cyl(0.72, 0.72, 0.06, M.wood, 0.2, 0.74, -0.9, 36);
    cyl(0.09, 0.13, 0.72, M.woodDark, 0.2, 0.36, -0.9);
    cyl(0.22, 0.26, 0.02, M.woodDark, 0.2, 0.02, -0.9);
    cyl(0.018, 0.018, 0.95, M.metal, 0.2, 2.42, -0.9);
    cyl(0.15, 0.19, 0.18, M.emitWarm, 0.2, 1.9, -0.9);

    function chair(x, z) {
      var dx = x - 0.2, dz = z + 0.9, L = Math.hypot(dx, dz) || 1;
      dx /= L; dz /= L;
      var ry = Math.atan2(dx, dz);
      box(0.44, 0.06, 0.44, M.fabric2, x, 0.44, z, { ry: ry });
      box(0.44, 0.4, 0.06, M.fabric2, x + dx * 0.19, 0.65, z + dz * 0.19, { ry: ry });
      box(0.05, 0.42, 0.05, M.woodDark, x - 0.15, 0.21, z - 0.15);
      box(0.05, 0.42, 0.05, M.woodDark, x + 0.15, 0.21, z + 0.15);
      box(0.05, 0.42, 0.05, M.woodDark, x - 0.15, 0.21, z + 0.15);
      box(0.05, 0.42, 0.05, M.woodDark, x + 0.15, 0.21, z - 0.15);
    }
    chair(1.3, -0.9);
    chair(-0.9, -0.9);
    chair(0.2, 0.22);
    chair(0.2, -2.02);

    /* ---------------- ložnice ---------------- */
    box(2.6, 0.32, 2.15, M.woodDark, -3.05, 0.16, 2.35);
    box(2.5, 0.3, 2.05, M.white, -3.05, 0.46, 2.35);
    box(0.16, 1.05, 2.25, M.fabric2, -W + 0.2, 0.75, 2.35);
    box(0.54, 0.15, 0.82, M.white, -3.9, 0.69, 1.93);
    box(0.54, 0.15, 0.82, M.white, -3.9, 0.69, 2.77);
    box(1.3, 0.1, 2.05, M.olive, -2.5, 0.65, 2.35);
    box(0.42, 0.42, 0.42, M.wood, -1.62, 0.21, 1.15);
    cyl(0.09, 0.12, 0.24, M.emitWarm, -1.62, 0.55, 1.15);
    // kobereček a lavice u postele
    box(0.95, 0.03, 2.5, M.rug, -1.45, 0.016, 2.35, { cast: false });
    box(0.36, 0.4, 1.5, M.fabric2, -1.6, 0.2, 2.35);

    /* ---------------- detaily a kontaktní stíny ---------------- */
    var aoTex = aoTexture();
    function aoBlob(w, d, x, z, y, op) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
        map: aoTex, transparent: true, opacity: op || 0.5, depthWrite: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      scene.add(m);
    }
    aoBlob(3.5, 1.6, 0.7, 2.75, 0.062, 0.5);
    aoBlob(1.9, 1.2, 0.7, 1.0, 0.062, 0.4);
    aoBlob(3.0, 2.6, -3.05, 2.35, 0.045, 0.45);
    aoBlob(2.5, 1.4, 2.2, -1.95, 0.05, 0.45);
    aoBlob(1.2, 1.2, -1.55, 0.15, 0.05, 0.35);
    aoBlob(0.9, 0.9, 3.75, 3.5, 0.05, 0.35);

    // sklo v okně
    box(2.55, 2.3, 0.02, M.glass, -1.05, 1.45, -W + 0.17, { cast: false, recv: false });

    // obývák: knížky, miska, ovoce, přehoz
    box(0.32, 0.03, 0.24, std({ color: 0xe8e0d2, roughness: 0.9 }), 0.95, 0.5, 0.92, { ry: 0.18 });
    box(0.3, 0.03, 0.22, std({ color: 0x8496a6, roughness: 0.9 }), 0.97, 0.53, 0.94, { ry: -0.12 });
    cyl(0.11, 0.07, 0.06, std({ color: 0xf1ece2, roughness: 0.7 }), 0.3, 0.52, 1.12);
    sph(0.045, std({ color: 0xc86b3f, roughness: 0.75 }), 0.3, 0.57, 1.12, 0);
    sph(0.04, std({ color: 0xd8b25a, roughness: 0.75 }), 0.36, 0.56, 1.15, 0);
    box(0.55, 0.06, 0.9, M.olive, 1.95, 0.62, 2.7, { ry: 0.06 });

    // kuchyně: láhve, prkénko, konvice
    cyl(0.045, 0.05, 0.3, M.glass, 1.95, 1.09, -W + 0.42);
    cyl(0.04, 0.04, 0.24, M.glass, 2.05, 1.06, -W + 0.36);
    box(0.4, 0.03, 0.28, M.wood, 2.85, 0.96, -W + 0.4, { ry: 0.08 });
    cyl(0.1, 0.12, 0.18, M.metal, 3.55, 1.02, -W + 0.4);

    // ostrůvek: miska s ovocem
    cyl(0.2, 0.14, 0.09, std({ color: 0xf1ece2, roughness: 0.7 }), 2.0, 0.99, -1.8);
    sph(0.06, std({ color: 0xc86b3f, roughness: 0.75 }), 1.96, 1.06, -1.8, 0);
    sph(0.055, std({ color: 0x8a9a5b, roughness: 0.75 }), 2.05, 1.05, -1.85, 0);

    // ložnice: knížka a sklenice
    box(0.2, 0.03, 0.14, std({ color: 0x2f3540, roughness: 0.9 }), -1.62, 0.44, 1.3, { ry: -0.2 });
    cyl(0.03, 0.03, 0.09, M.glass, -1.48, 0.47, 1.18);

    // koupelna: lahvičky, ručníky, rostlinka
    cyl(0.03, 0.03, 0.15, std({ color: 0xd9cfc0, roughness: 0.5 }), -3.95, 0.59, -4.18);
    cyl(0.03, 0.03, 0.12, std({ color: 0xbfae97, roughness: 0.5 }), -3.86, 0.57, -4.14);
    box(0.26, 0.1, 0.2, M.white, -4.1, 0.87, -2.6);
    box(0.22, 0.08, 0.16, M.cream, -4.1, 0.95, -2.62);
    cyl(0.05, 0.04, 0.08, M.terracotta, -3.5, 1.77, -4.3);
    sph(0.07, M.green, -3.5, 1.85, -4.3, 0);

    /* ---------------- pohledy ---------------- */
    var VIEWS = {
      plan:   { theta: 0.62, phi: 0.78, r: 20,   t: [0, 0.55, 0] },
      living: { theta: 0.36, phi: 1.16, r: 9.6,  t: [0.5, 1.0, 1.5] },
      bed:    { theta: 0.92, phi: 1.14, r: 8.6,  t: [-3.0, 0.75, 2.3] },
      bath:   { theta: 0.66, phi: 1.06, r: 7.6,  t: [-3.2, 0.9, -3.3] }
    };
    var BASE_R = {};
    for (var vk in VIEWS) BASE_R[vk] = VIEWS[vk].r;

    var INFO = {
      plan:   ['Půdorys', 'Celkem 142 m² · 30. patro · 3+kk s výhledem na záliv'],
      living: ['Obývák & kuchyně', '48 m² · otevřený prostor, mramorová deska, barový ostrůvek'],
      bed:    ['Ložnice', '24 m² · dubové obložení, šatna, ráno slunce nad mořem'],
      bath:   ['Koupelna', '12 m² · travertin, vana u okna, mosazné baterie']
    };

    var HOTSPOTS = [
      { p: [0.7, 1.3, 1.2],    label: 'Obývák & kuchyně', view: 'living' },
      { p: [-3.0, 1.05, 2.35], label: 'Ložnice',          view: 'bed' },
      { p: [-3.3, 1.55, -3.3], label: 'Koupelna',         view: 'bath' }
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
      camera.position.set(
        t.x + r * sp * Math.sin(theta),
        t.y + r * cp,
        t.z + r * sp * Math.cos(theta)
      );
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

    [].forEach.call(document.querySelectorAll('nav button'), function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
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
      var r = 22;
      for (var i = 0; i < 4; i++) {
        setCam(p.theta, p.phi, r, t);
        var mx = 0, my = 0;
        CORNERS.forEach(function (c) {
          tmp.copy(c).project(camera);
          mx = Math.max(mx, Math.abs(tmp.x));
          my = Math.max(my, Math.abs(tmp.y));
        });
        var s = Math.max(mx / 1.02, my / 0.60);
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

      var af = camera.aspect < 1
        ? Math.pow(1 / camera.aspect, 0.55)
        : Math.pow(1 / camera.aspect, 0.35);
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

      renderer.render(scene, camera);
      frames++;
      if (frames === 2) ready();
      requestAnimationFrame(tick);
    }
    tick();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
})();
