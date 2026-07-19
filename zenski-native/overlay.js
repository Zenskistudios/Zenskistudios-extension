(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const characterKey = params.get('character') || 'cat';
  const audioEnabled = params.get('audioEnabled') === 'true';
  const volume = parseInt(params.get('volume') || '70', 10);
  const forcedSeconds = parseInt(params.get('forcedSeconds') || '0', 10);
  const isPrimary = params.get('isPrimary') === '1';
  const isPreview = params.get('isPreview') === '1';

  /* =====================================================================
     CHARACTER DEFINITIONS
     ===================================================================== */
  const CHARACTERS = {
    cat: {
      label: '🐱 Whiskers the Cat', type: 'pet', color: 0xfbbf24, glow: 0xffe08a,
      song: 'purrs a cheerful little tune', dance: 'bounce',
      melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
    },
    dog: {
      label: '🐶 Biscuit the Dog', type: 'pet', color: 0xc98450, glow: 0xffcf9e,
      song: 'tail-wagging chaos ensues', dance: 'wag',
      melody: [[392, 0.15], [392, 0.15], [523, 0.2], [440, 0.2], [392, 0.3]]
    },
    rabbit: {
      label: '🐰 Bun-Bun the Rabbit', type: 'pet', color: 0xf3d6e8, glow: 0xffe6f5,
      song: 'a surprisingly funky hop', dance: 'hop',
      melody: [[659, 0.12], [784, 0.12], [880, 0.12], [784, 0.12], [659, 0.24]]
    },
    demogorgon: {
      label: '👹 Demogorgon', type: 'horror', color: 0x6b1f2a, glow: 0xff3355,
      song: 'singing from the Upside Down', dance: 'petal',
      melody: [[110, 0.4], [98, 0.4], [87, 0.5], [73, 0.7]]
    },
    vecna: {
      label: '🧠 Vecna', type: 'horror', color: 0x5a4632, glow: 0xd6b06a,
      song: 'crooning your worst nightmares', dance: 'sway',
      melody: [[130, 0.5], [123, 0.5], [110, 0.6], [98, 0.9]]
    },
    mindflayer: {
      label: '🕷️ Mind Flayer', type: 'horror', color: 0x2a1533, glow: 0x9b5cff,
      song: 'orchestral horror swells', dance: 'tentacle',
      melody: [[80, 0.6], [85, 0.4], [75, 0.6], [65, 1.0]]
    },
    demodogs: {
      label: '🐕 Demo-dogs', type: 'horror', color: 0x3c2a1e, glow: 0xff7a3d,
      song: 'pack singing, off in the distance', dance: 'pack',
      melody: [[147, 0.2], [147, 0.2], [165, 0.2], [147, 0.2], [131, 0.4]]
    },
    eleven: {
      label: '⚡ Eleven', type: 'pet', color: 0xff5fb0, glow: 0x66e0ff,
      song: 'telekinetic disco', dance: 'orbit',
      melody: [[880, 0.12], [988, 0.12], [1046, 0.12], [1318, 0.24], [988, 0.3]]
    }
  };
  const cfg = CHARACTERS[characterKey] || CHARACTERS.cat;

  const $ = id => document.getElementById(id);
  document.body.classList.toggle('horror', cfg.type === 'horror');

  /* =====================================================================
     HUD — only the primary monitor's window shows controls/countdown
     ===================================================================== */
  if (isPrimary) {
    const hud = $('hud');
    hud.classList.add('active');
    $('char-name').textContent = cfg.label;
    $('char-name').style.color = '#' + cfg.glow.toString(16).padStart(6, '0');
    $('char-song').textContent = cfg.label.split(' ').slice(1).join(' ') + ' ' + cfg.song;

    const resumeBtn = $('resume-btn');
    if (isPreview) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = 'Close preview';
      resumeBtn.onclick = () => window.zenski.requestPreviewClose();
      $('safety-note').style.display = 'none';
    } else {
      $('forced-banner').style.display = 'block';
      $('safety-note').style.display = 'block';
      resumeBtn.textContent = 'Resume work';
      resumeBtn.onclick = () => window.zenski.requestResume();

      if (forcedSeconds > 0) {
        $('countdown').style.display = 'block';
        $('countdown-label').style.display = 'block';
        let remaining = forcedSeconds;
        resumeBtn.disabled = true;
        const tick = () => {
          const m = String(Math.floor(remaining / 60)).padStart(2, '0');
          const s = String(remaining % 60).padStart(2, '0');
          $('countdown').textContent = `${m}:${s}`;
        };
        tick();
        const interval = setInterval(() => {
          remaining -= 1;
          tick();
          if (remaining <= 0) {
            clearInterval(interval);
            resumeBtn.disabled = false;
          }
        }, 1000);
      } else {
        resumeBtn.disabled = false;
      }
    }
  }

  /* =====================================================================
     AUDIO
     ===================================================================== */
  let audioCtx = null;
  function playMelody(melody) {
    if (!audioEnabled || !melody || !melody.length) return 0;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    let t = audioCtx.currentTime;
    melody.forEach(([freq, dur]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime((volume / 100) * 0.2, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
      t += dur;
    });
    return t - audioCtx.currentTime;
  }
  if (audioEnabled) {
    const dur = playMelody(cfg.melody);
    if (dur) setInterval(() => playMelody(cfg.melody), (dur + 0.6) * 1000);
  }

  /* =====================================================================
     THREE.JS SCENE
     ===================================================================== */
  const mount = $('three-mount');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 7);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a0033, 0.9));
  const key = new THREE.PointLight(0xffffff, 1.1, 20);
  key.position.set(3, 5, 4);
  scene.add(key);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.15 }, opts || {}));
  }

  function buildCharacter(k) {
    const c = CHARACTERS[k];
    const g = new THREE.Group();
    const bodyMat = mat(c.color);
    const glowMat = mat(c.glow, { emissive: c.glow, emissiveIntensity: 0.6, roughness: 0.3 });
    g.userData.parts = {};

    if (['cat', 'dog', 'rabbit'].includes(k)) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), bodyMat);
      body.scale.set(1, 0.85, 1.1); body.position.y = 1.1;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), bodyMat);
      head.position.set(0, 1.95, 0.55);
      const earGeo = k === 'rabbit'
        ? new THREE.CylinderGeometry(0.08, 0.14, 0.9, 8)
        : new THREE.ConeGeometry(0.22, 0.4, 8);
      const earL = new THREE.Mesh(earGeo, bodyMat); earL.position.set(-0.28, k === 'rabbit' ? 2.75 : 2.3, 0.5);
      const earR = earL.clone(); earR.position.x = 0.28;
      if (k === 'rabbit') { earL.rotation.z = 0.12; earR.rotation.z = -0.12; }
      const tail = new THREE.Mesh(new THREE.SphereGeometry(k === 'rabbit' ? 0.25 : 0.18, 12, 12), bodyMat);
      tail.position.set(0, 1.05, k === 'rabbit' ? -0.95 : -1.0);
      const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.55, 10);
      const legs = [-0.4, 0.4].map(x => [-0.35, 0.35].map(z => {
        const l = new THREE.Mesh(legGeo, bodyMat); l.position.set(x, 0.35, z); return l;
      })).flat();
      const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const eyeMat = mat(0x1a1025, { emissive: 0x1a1025, emissiveIntensity: 0.2 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.18, 2.0, 1.0);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.18;
      g.add(body, head, earL, earR, tail, eyeL, eyeR, ...legs);
      g.userData.parts = { body, head, earL, earR, tail, legs };
    }
    else if (k === 'demogorgon' || k === 'demodogs') {
      const isPack = k === 'demodogs';
      const bodyGeo = isPack
        ? new THREE.SphereGeometry(0.55, 20, 20)
        : new THREE.CylinderGeometry(0.5, 0.65, 1.6, 16);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = isPack ? 0.7 : 1.1;
      const petals = [];
      const petalCount = 6;
      for (let i = 0; i < petalCount; i++) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.95, 6, 1, true), glowMat);
        p.position.set(0, isPack ? 1.15 : 2.0, 0);
        p.userData.baseRot = (i / petalCount) * Math.PI * 2;
        petals.push(p); g.add(p);
      }
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
      const legs = isPack ? [-0.3, 0.3].map(x => {
        const l = new THREE.Mesh(legGeo, bodyMat); l.position.set(x, 0.3, 0.2); l.rotation.x = 0.2; return l;
      }) : [];
      g.add(body, ...legs);
      g.userData.parts = { body, petals, legs };
      if (isPack) {
        for (let i = 0; i < 2; i++) {
          const clone = g.clone(true);
          clone.position.set((i === 0 ? -1.6 : 1.6), 0, -0.6 - i * 0.3);
          clone.scale.setScalar(0.75);
          clone.userData.isPackMate = true;
          g.add(clone);
        }
      }
    }
    else if (k === 'vecna') {
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.5, 12), bodyMat);
      torso.position.y = 1.6;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), bodyMat);
      head.position.y = 2.55; head.scale.set(0.85, 1.15, 0.95);
      const armGeo = new THREE.CylinderGeometry(0.1, 0.14, 1.3, 8);
      const armL = new THREE.Mesh(armGeo, bodyMat); armL.position.set(-0.55, 1.7, 0); armL.rotation.z = 0.5;
      const armR = armL.clone(); armR.position.x = 0.55; armR.rotation.z = -0.5;
      const clawMat = mat(cfg.glow, { emissive: cfg.glow, emissiveIntensity: 0.9 });
      const clawGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
      const clawsL = [0, 1, 2].map(i => { const c2 = new THREE.Mesh(clawGeo, clawMat); c2.position.set(-1.0 - 0.05 * i, 1.05 - 0.08 * i, 0.05 * i); c2.rotation.z = 1.1; return c2; });
      const clawsR = clawsL.map(c2 => { const cc = c2.clone(); cc.position.x *= -1; return cc; });
      const eyeGlow = new THREE.PointLight(c.glow, 1.2, 3);
      eyeGlow.position.set(0, 2.6, 0.3);
      g.add(torso, head, armL, armR, ...clawsL, ...clawsR, eyeGlow);
      g.userData.parts = { torso, head, armL, armR };
    }
    else if (k === 'mindflayer') {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 20), bodyMat);
      core.position.y = 2.2;
      const tentacles = [];
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        let x = Math.cos(ang) * 0.6, z = Math.sin(ang) * 0.6;
        for (let s = 0; s < 4; s++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - s * 0.02, 0.16 - s * 0.02, 0.55, 8), bodyMat);
          seg.position.set(x, 2.0 - s * 0.5, z);
          seg.userData.segIndex = s; seg.userData.tIndex = i;
          tentacles.push(seg); g.add(seg);
        }
      }
      g.add(core);
      g.userData.parts = { core, tentacles };
    }
    else if (k === 'eleven') {
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.2, 12), bodyMat);
      torso.position.y = 1.5;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), bodyMat);
      head.position.y = 2.35;
      const armGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.0, 8);
      const armL = new THREE.Mesh(armGeo, bodyMat); armL.position.set(-0.45, 1.65, 0);
      const armR = armL.clone(); armR.position.x = 0.45;
      const orbGeo = new THREE.IcosahedronGeometry(0.14, 0);
      const orbMat = mat(c.glow, { emissive: c.glow, emissiveIntensity: 1 });
      const orbits = [];
      for (let i = 0; i < 6; i++) {
        const o = new THREE.Mesh(orbGeo, orbMat.clone());
        o.userData.angle = (i / 6) * Math.PI * 2;
        o.userData.radius = 1.4 + (i % 2) * 0.3;
        o.userData.speedMul = 1 + (i % 3) * 0.3;
        orbits.push(o); g.add(o);
      }
      const glowLight = new THREE.PointLight(c.glow, 1.4, 6);
      glowLight.position.set(0, 1.8, 0);
      g.add(torso, head, armL, armR, glowLight);
      g.userData.parts = { torso, head, armL, armR, orbits };
    }
    return g;
  }

  function animateCharacter(group, c, t) {
    const p = group.userData.parts;
    switch (c.dance) {
      case 'bounce': {
        group.position.y = Math.abs(Math.sin(t * 4)) * 0.35;
        group.rotation.y = Math.sin(t * 2) * 0.5;
        if (p.tail) p.tail.rotation.y = Math.sin(t * 8) * 0.8;
        if (p.earL) { p.earL.rotation.z = Math.sin(t * 6) * 0.15; p.earR.rotation.z = -Math.sin(t * 6) * 0.15; }
        break;
      }
      case 'wag': {
        group.rotation.y = Math.sin(t * 3) * 0.3;
        group.position.y = Math.abs(Math.sin(t * 6)) * 0.15;
        if (p.tail) p.tail.rotation.y = Math.sin(t * 14) * 1.1;
        if (p.head) p.head.rotation.z = Math.sin(t * 3) * 0.15;
        break;
      }
      case 'hop': {
        const hop = Math.max(0, Math.sin(t * 3.2));
        group.position.y = hop * 0.9;
        group.scale.y = 1 - hop * 0.15;
        group.scale.x = group.scale.z = 1 + hop * 0.08;
        if (p.earL) { p.earL.rotation.x = -hop * 0.6; p.earR.rotation.x = -hop * 0.6; }
        break;
      }
      case 'petal': {
        (p.petals || []).forEach((petal, i) => {
          const open = (Math.sin(t * 2.2) + 1) / 2;
          petal.position.set(
            Math.cos(petal.userData.baseRot) * open * 0.5,
            (p.legs && p.legs.length ? 1.15 : 2.0) + Math.cos(t * 3 + i) * 0.05,
            Math.sin(petal.userData.baseRot) * open * 0.5
          );
          petal.rotation.z = petal.userData.baseRot + open * 0.6;
        });
        group.position.y = Math.sin(t * 5) * 0.05;
        group.rotation.y += 0.004;
        break;
      }
      case 'sway': {
        group.rotation.z = Math.sin(t * 1.2) * 0.08;
        group.rotation.y = Math.sin(t * 0.7) * 0.4;
        if (p.armL) p.armL.rotation.x = Math.sin(t * 1.5) * 0.4;
        if (p.armR) p.armR.rotation.x = -Math.sin(t * 1.5) * 0.4;
        group.position.y = Math.sin(t * 1.2) * 0.06;
        break;
      }
      case 'tentacle': {
        group.position.y = Math.sin(t * 0.8) * 0.1;
        group.rotation.y += 0.003;
        (p.tentacles || []).forEach(seg => {
          const i = seg.userData.tIndex, s = seg.userData.segIndex;
          seg.rotation.x = Math.sin(t * 2.5 + i * 0.9 + s * 0.6) * (0.25 + s * 0.1);
          seg.rotation.z = Math.cos(t * 2 + i) * 0.2;
        });
        break;
      }
      case 'pack': {
        group.position.y = Math.abs(Math.sin(t * 5)) * 0.2;
        group.rotation.y = Math.sin(t * 2) * 0.6;
        (p.petals || []).forEach((petal, i) => {
          const open = (Math.sin(t * 3 + i) + 1) / 2;
          petal.rotation.z = petal.userData.baseRot + open * 0.5;
        });
        (group.children || []).forEach(c2 => {
          if (c2.userData.isPackMate) c2.position.y = Math.abs(Math.sin(t * 5 + 1)) * 0.15;
        });
        break;
      }
      case 'orbit': {
        group.position.y = Math.sin(t * 1.6) * 0.15 + 0.1;
        if (p.armL) p.armL.rotation.z = 0.3 + Math.sin(t * 2) * 0.2;
        if (p.armR) p.armR.rotation.z = -0.3 - Math.sin(t * 2) * 0.2;
        (p.orbits || []).forEach(o => {
          const a = o.userData.angle + t * o.userData.speedMul;
          o.position.set(Math.cos(a) * o.userData.radius, 1.8 + Math.sin(t * 2 + a) * 0.4, Math.sin(a) * o.userData.radius);
          o.rotation.x += 0.05; o.rotation.y += 0.03;
        });
        break;
      }
    }
  }

  function buildParticles(color) {
    const count = 140;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.05, transparent: true, opacity: 0.75 }));
  }

  const group = buildCharacter(characterKey);
  scene.add(group);
  const particles = buildParticles(cfg.glow);
  scene.add(particles);

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    animateCharacter(group, cfg, t);
    particles.rotation.y = t * 0.05;
    if (cfg.type === 'horror' && Math.random() < 0.004) {
      const flash = $('lightning');
      flash.style.transition = 'none'; flash.style.opacity = 0.6;
      setTimeout(() => { flash.style.transition = 'opacity .4s ease'; flash.style.opacity = 0; }, 60);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
