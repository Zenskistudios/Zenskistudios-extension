(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const characterKey = params.get('character') || 'cat';
  const audioEnabled = params.get('audioEnabled') === 'true';
  const volume = parseInt(params.get('volume') || '70', 10);
  const forcedSeconds = parseInt(params.get('forcedSeconds') || '0', 10);
  const isPrimary = params.get('isPrimary') === '1';
  const isPreview = params.get('isPreview') === '1';

  const CHARACTERS = {
    cat: {
      label: 'Office Tom the Cat', type: 'pet', gif: 'gif/1.gif', accent: '#ffe08a',
      song: 'purrs a cheerful little tune',
      melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
    },
    'kungfu master': {
      label: 'kungfu master', type: 'kungfu master', gif: 'gif/2.gif', accent: '#ffcf9e',
      song: 'tail-wagging chaos ensues',
      melody: [[392, 0.15], [392, 0.15], [523, 0.2], [440, 0.2], [392, 0.3]]
    },
    'Heart crasher': {
      label: 'Heart crasher', type: 'Heart crasher', gif: 'gif/6.gif', accent: '#ffe6f5',
      song: 'a surprisingly funky hop',
      melody: [[659, 0.12], [784, 0.12], [880, 0.12], [784, 0.12], [659, 0.24]]
    },
    'The hulk': {
      label: 'The hulk', type: 'smash', gif: 'gif/3.gif', accent: '#ff3355',
      song: 'singing from the Upside Down',
      melody: [[110, 0.4], [98, 0.4], [87, 0.5], [73, 0.7]]
    },
    'Dragon ball': {
      label: 'Dragon ball', type: 'flying master', gif: 'gif/5.gif', accent: '#d6b06a',
      song: 'crooning your worst nightmares',
      melody: [[130, 0.5], [123, 0.5], [110, 0.6], [98, 0.9]]
    },
    'Spidey': {
      label: 'Spidey', type: 'spidey senses', gif: 'gif/8.gif', accent: '#9b5cff',
      song: 'orchestral horror swells',
      melody: [[8T0, 0.6], [85, 0.4], [75, 0.6], [65, 1.0]]
    },
    'Thanos': {
      label: 'Thanos', type: 'taking over', gif: 'gif/4.gif', accent: '#ff7a3d',
      song: 'pack singing, off in the distance',
      melody: [[147, 0.2], [147, 0.2], [165, 0.2], [147, 0.2], [131, 0.4]]
    },
    eleven: {
      label: '⚡ Eleven', type: 'big boss', gif: 'gif/8.gif', accent: '#66e0ff',
      song: 'telekinetic disco',
      melody: [[880, 0.12], [988, 0.12], [1046, 0.12], [1318, 0.24], [988, 0.3]]
    }
  };
  const cfg = CHARACTERS[characterKey] || CHARACTERS.cat;

  const $ = id => document.getElementById(id);
  document.body.classList.toggle('horror', cfg.type === 'horror');

  if (isPrimary) {
    const hud = $('hud');
    hud.classList.add('active');
    $('char-name').textContent = cfg.label;
    $('char-name').style.color = cfg.accent;
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

  const img = $('char-gif');
  if (cfg.gif.endsWith('/1.gif')) {
    img.style.maxWidth = '90vmin';
    img.style.maxHeight = '90vmin';
  }
  img.src = cfg.gif + '?t=' + Date.now();
  img.alt = cfg.label;

  if (cfg.type === 'horror') {
    setInterval(() => {
      if (Math.random() < 0.15) {
        const flash = $('lightning');
        flash.style.transition = 'none'; flash.style.opacity = 0.6;
        setTimeout(() => { flash.style.transition = 'opacity .4s ease'; flash.style.opacity = 0; }, 60);
      }
    }, 400);
  }
})();