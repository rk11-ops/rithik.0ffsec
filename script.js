(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  $('#year').textContent = new Date().getFullYear();

  /* ---------- theme variants ---------- */
  const root = document.documentElement;
  const setTheme = t => {
    root.setAttribute('data-theme', t);
    $$('[data-theme-set]').forEach(b => b.classList.toggle('on', b.dataset.themeSet === t));
    store.set('rc-theme', t);
  };
  const saved = store.get('rc-theme');
  if (['red', 'toxic', 'ice'].includes(saved)) setTheme(saved);
  $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => { setTheme(b.dataset.themeSet); toast('Variant → ' + b.textContent.trim()); }));

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- text splitting ---------- */
  $$('.split').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="transition-delay:${i * 70}ms">${esc(w)}</span></span>`).join(' ');
  });

  /* ---------- scramble ---------- */
  const GL = 'ABCDEF0123456789#$%&*<>/\\_';
  function scramble(el, text, dur = 700) {
    if (reduce) { el.textContent = text; return; }
    const start = performance.now();
    (function f(now) {
      const p = clamp((now - start) / dur);
      el.textContent = text.split('').map((c, i) => c === ' ' ? ' ' : (i < p * text.length ? c : GL[(Math.random() * GL.length) | 0])).join('');
      if (p < 1) requestAnimationFrame(f);
    })(start);
  }

  /* ---------- loader ---------- */
  const loader = $('#loader');
  document.body.classList.add('is-loading');
  const log = $('#loader-log');
  const lines = [
    ['[ ok ] ', 'scope loaded: authorized only'],
    ['[ ok ] ', 'recon modules online'],
    ['[ ok ] ', 'evidence vault mounted'],
    ['[ .. ] ', 'rendering target: rithik-sec.local']
  ];
  function runLoader(done) {
    if (reduce) { loader.remove(); document.body.classList.remove('is-loading'); done(); return; }
    let n = 0; const fill = $('#loader-fill'), pct = $('#loader-pct');
    const total = 1500, t0 = performance.now();
    lines.forEach((l, i) => setTimeout(() => { log.innerHTML += `<b>${l[0]}</b>${l[1]}\n`; }, i * 330));
    (function tick(now) {
      n = clamp((now - t0) / total);
      const e = 1 - Math.pow(1 - n, 3);
      fill.style.width = e * 100 + '%';
      pct.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (n < 1) requestAnimationFrame(tick);
      else {
        loader.classList.add('done');
        document.body.classList.remove('is-loading');
        done();
        setTimeout(() => loader.remove(), 1000);
      }
    })(t0);
  }

  /* ---------- hero state machine ---------- */
  const hero = $('#hero');
  const stages = $$('.stage');
  const stFind = $('#st-find'), stPatch = $('#st-patch'), stState = $('#st-state');
  const pFill = $('#pipe-fill'), pPacket = $('#pipe-packet');
  const STEP = 0.16, T0 = 0.06;
  function heroUpdate() {
    const r = hero.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    let find = 0, patch = 0, scanning = false;
    stages.forEach((s, i) => {
      const t = T0 + i * STEP;
      const bar = s.querySelector('.stage-bar i'), st = s.querySelector('[data-st]');
      s.classList.remove('s-scan', 's-hit', 's-done');
      let label = 'queued', w = 0;
      if (p >= t + 0.12) { s.classList.add('s-done'); label = 'patched'; w = 100; find++; patch++; }
      else if (p >= t + 0.07) { s.classList.add('s-hit'); label = 'finding'; w = 100; find++; }
      else if (p >= t) { s.classList.add('s-scan'); label = 'scanning'; w = clamp((p - t) / 0.07) * 100; scanning = true; }
      if (st.textContent !== label) st.textContent = label;
      bar.style.width = w + '%';
    });
    stFind.textContent = find; stPatch.textContent = patch;
    let state = 'idle', cls = 'st-idle';
    if (patch === 5) { state = 'complete'; cls = 'st-done'; }
    else if (scanning) { state = 'scanning'; cls = 'st-scan'; }
    else if (find > patch) { state = 'finding'; cls = 'st-hit'; }
    else if (p > T0) { state = 'running'; cls = 'st-scan'; }
    if (stState.textContent !== state) { stState.textContent = state; stState.className = cls; }
    const prog = clamp((p - T0) / (STEP * 4 + 0.12 + 0.02));
    pFill.style.width = prog * 100 + '%';
    pPacket.style.left = prog * 100 + '%';
    hero.classList.toggle('fire', p > 0.02);
  }

  /* ---------- progress, nav, parallax, velocity skew ---------- */
  const prog = $('#progress'), nav = $('#nav');
  const nums = $$('.sec-num');
  const tick = $('#tickers');
  let lastY = scrollY, vel = 0, curSkew = 0;
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (scrollY / h * 100) + '%';
    nav.classList.toggle('scrolled', scrollY > 30);
    nav.classList.toggle('hide', scrollY > lastY + 4 && scrollY > 500 && !$('#nav-links').classList.contains('open'));
    if (scrollY < lastY - 4) nav.classList.remove('hide');
    vel = scrollY - lastY; lastY = scrollY;
    heroUpdate();
    if (!reduce) nums.forEach(n => { const r = n.parentElement.getBoundingClientRect(); n.style.transform = `translateY(${(r.top * -0.18).toFixed(1)}px)`; });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  (function velLoop() {
    curSkew = lerp(curSkew, clamp(vel, -40, 40) * -0.18, 0.12);
    vel *= 0.9;
    if (tick && !reduce) tick.style.transform = `skewX(${curSkew.toFixed(2)}deg)`;
    requestAnimationFrame(velLoop);
  })();

  /* active nav link */
  const links = $$('.nav-links a');
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('.sec').forEach(s => secIO.observe(s));

  /* mobile nav */
  const tg = $('#nav-toggle'), nl = $('#nav-links');
  tg.addEventListener('click', () => { const o = nl.classList.toggle('open'); tg.setAttribute('aria-expanded', o); });
  links.forEach(a => a.addEventListener('click', () => { nl.classList.remove('open'); tg.setAttribute('aria-expanded', 'false'); }));

  /* ---------- reveal + split + counters + typed terminals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal,.split').forEach(el => io.observe(el));

  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    cio.unobserve(el);
    if (reduce) { el.textContent = to; return; }
    (function f(now) {
      const p = clamp((now - t0) / 1400);
      el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * to);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  const fmtTerm = t => esc(t).split('\n').map(l =>
    l.startsWith('$') ? `<span class="ps">$</span>${l.slice(1)}` :
    l.startsWith('✓') ? `<span class="okk">✓</span>${l.slice(1)}` : l).join('\n');
  const tio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const code = e.target.querySelector('code'); const full = code.dataset.full;
    tio.unobserve(e.target);
    if (reduce) { code.innerHTML = fmtTerm(full); return; }
    let i = 0;
    (function type() {
      i += 2;
      code.innerHTML = fmtTerm(full.slice(0, i)) + '<span class="cur"></span>';
      if (i < full.length) setTimeout(type, 16);
      else code.innerHTML = fmtTerm(full) + '<span class="cur"></span>';
    })();
  }), { threshold: .5 });
  $$('.phase').forEach(p => {
    const code = p.querySelector('code'); code.dataset.full = code.textContent.trim();
    code.innerHTML = ''; tio.observe(p);
  });

  /* ---------- card spotlight + tilt ---------- */
  $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
      if (!reduce && e.pointerType === 'mouse') c.style.transform = `perspective(900px) rotateX(${(.5 - y) * 4}deg) rotateY(${(x - .5) * 5}deg)`;
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });

  /* ---------- tool tile spotlight ---------- */
  $$('.tool').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* ---------- magnetic buttons ---------- */
  if (!reduce) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- cursor ---------- */
  const cur = $('#cursor');
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    document.body.classList.add('has-cursor');
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
    document.addEventListener('pointerover', e => cur.classList.toggle('hover', !!e.target.closest('a,button,input,textarea,select,.tilt')));
    (function f() { cx = lerp(cx, tx, .22); cy = lerp(cy, ty, .22); cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(f); })();
  }

  /* ---------- glitch name ---------- */
  const name = $('#name');
  function glitch() { name.classList.add('on'); setTimeout(() => name.classList.remove('on'), 360); }
  name.addEventListener('pointerenter', glitch);
  if (!reduce) setInterval(() => { if (scrollY < innerHeight) glitch(); }, 5200);

  /* ---------- network canvas ---------- */
  const cv = $('#net'), ctx = cv.getContext('2d');
  let W, H, pts = [], mouse = { x: -999, y: -999 };
  function sizeCv() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; cv._d = d;
    const n = Math.round(clamp(innerWidth / 16, 28, 90));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35 * d, vy: (Math.random() - .5) * .35 * d }));
  }
  sizeCv(); addEventListener('resize', sizeCv);
  addEventListener('pointermove', e => { mouse.x = e.clientX * cv._d; mouse.y = e.clientY * cv._d; });
  function draw() {
    const rgb = getComputedStyle(root).getPropertyValue('--ac-rgb').trim() || '255,45,61';
    ctx.clearRect(0, 0, W, H);
    const d = cv._d, L = 150 * d;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (md < 160 * d) { p.x += (p.x - mouse.x) * .004; p.y += (p.y - mouse.y) * .004; }
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      ctx.fillStyle = `rgba(${rgb},.7)`; ctx.fillRect(a.x - d, a.y - d, 2 * d, 2 * d);
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < L) { ctx.strokeStyle = `rgba(${rgb},${(1 - dist / L) * .35})`; ctx.lineWidth = d * .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 200 * d) { ctx.strokeStyle = `rgba(${rgb},${(1 - md / (200 * d)) * .7})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
    }
    requestAnimationFrame(draw);
  }
  if (!reduce) draw();

  /* ---------- interactive terminal ---------- */
  const out = $('#term-out'), inp = $('#term-input');
  const FLAG = 'RC{every_layer_has_a_weak_spot}';
  const print = (html, cls = '') => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; };
  const cmds = {
    help: () => 'commands: <span class="ps">whoami</span> · <span class="ps">skills</span> · <span class="ps">tools</span> · <span class="ps">certs</span> · <span class="ps">projects</span> · <span class="ps">scope</span> · <span class="ps">contact</span> · <span class="ps">theme &lt;red|toxic|ice&gt;</span> · <span class="ps">clear</span>',
    whoami: () => 'Rithik Chauhan — VAPT analyst. Web · API · Mobile · Thick client.',
    skills: () => 'SAST · DAST · web application VAPT · API security · source-code analysis · network traffic analysis · mobile security · password &amp; authentication testing · recon &amp; OSINT',
    tools: () => 'Burp Suite, OWASP ZAP, Postman, SQLmap, Nuclei, Nikto, Wapiti, FFUF, Feroxbuster · Nmap, Wireshark, Metasploit Framework, testssl.sh, RouterSploit · OpenText Fortify · Frida, MobSF, ADB, Fastboot · Hydra, John the Ripper · Sherlock, Mosint, Seeker · Kali Linux · PentestGPT, Ollama',
    certs: () => 'THM Jr Pen Tester · THM Red Teaming · NSDC Python · Hackviser CORE (HV-CORE-DBVLVBXG)',
    projects: () => 'ReconForge · Clickjacking PoC Lab · Web &amp; API Security · Mobile Security Research · PentestingEverything',
    scope: () => '<span class="okk">✓</span> authorized testing only. no client data. evidence over noise.',
    contact: () => 'linkedin.com/in/rithik-chauhan · github.com/rk11-ops',
    flag: () => `<span class="okk">${FLAG}</span>`,
    sudo: () => '<span class="mu">nice try. this incident will be reported. (to nobody.)</span>',
    ls: () => 'about/  method/  work/  toolkit/  contact/  .flag',
    clear: () => { out.innerHTML = ''; return null; }
  };
  print('<span class="mu">// interactive shell — illustrative only, nothing is scanned.</span>');
  print('type <span class="ps">help</span> to list commands.');
  const hist = []; let hi = 0;
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { inp.value = hi < hist.length - 1 ? hist[++hi] : ''; hi = Math.min(hi + 1, hist.length); e.preventDefault(); }
    else if (e.key === 'Enter') {
      const raw = inp.value.trim(); inp.value = '';
      if (!raw) return;
      hist.push(raw); hi = hist.length;
      print(`<span class="ps">rithik@sec:~$</span> ${esc(raw)}`);
      const [c, ...a] = raw.split(/\s+/);
      if (c === 'theme') { const t = a[0]; if (['red', 'toxic', 'ice'].includes(t)) { setTheme(t); print('variant → ' + t); } else print('usage: theme red|toxic|ice'); return; }
      if (c === 'flag') flagFound();
      const r = cmds[c.toLowerCase()];
      if (r) { const o = r(); if (o) print(o); } else print(`<span class="mu">command not found: ${esc(c)} — try</span> <span class="ps">help</span>`);
    }
  });
  $('#term-box').addEventListener('click', () => inp.focus({ preventScroll: true }));

  /* ---------- flag ---------- */
  const fb = $('#flag-btn');
  function flagFound() { fb.classList.add('found'); fb.textContent = FLAG; toast('🚩 flag captured'); }
  fb.addEventListener('click', () => { if (fb.classList.contains('found')) return; flagFound(); scramble(fb, FLAG, 900); });

  /* ---------- contact form (static site: composes + copies, opens LinkedIn) ---------- */
  const form = $('#form'), msg = $('#form-msg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    msg.className = 'form-msg';
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email) || d.message.trim().length < 5) { msg.classList.add('err'); msg.textContent = '✕ please fill name, a valid email and a message.'; return; }
    const text = `Topic: ${d.topic}\nName: ${d.name}\nEmail: ${d.email}\n\n${d.message}`;
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (err) {}
    msg.textContent = (copied ? '✓ message copied to clipboard — ' : '✓ ') + 'opening LinkedIn so you can send it.';
    toast('Message ready → LinkedIn');
    window.open('https://www.linkedin.com/in/rithik-chauhan/', '_blank', 'noopener');
    form.reset();
  });

  /* ---------- certificate modal ---------- */
  const modal = $('#modal'); let lastFocus;
  const openM = () => { lastFocus = document.activeElement; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); $('.modal-x', modal).focus(); };
  const closeM = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); lastFocus && lastFocus.focus(); };
  $$('[data-open-certificates]').forEach(b => b.addEventListener('click', openM));
  $$('[data-close]', modal).forEach(b => b.addEventListener('click', closeM));
  addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeM(); });

  /* ---------- boot ---------- */
  onScroll();
  runLoader(() => {
    document.body.classList.add('is-ready');
    root.classList.add('is-ready');
    const n = $('#name a'); scramble(n, 'RITHIK CHAUHAN', 900);
  });
})();
