/* =========================================================
   STILLO D'ÁGUA — Interactions
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- PRELOADER + HERO INTRO ---------- */
  function startHero() {
    const hero = $('#inicio');
    if (!hero) return;
    $$('[data-split]', hero).forEach((el, i) => {
      el.style.transitionDelay = 250 + i * 90 + 'ms';
    });
    requestAnimationFrame(() => hero.classList.add('is-in'));
  }
  window.addEventListener('load', () => {
    const pre = $('#preloader');
    const done = () => { pre && pre.classList.add('is-done'); startHero(); };
    setTimeout(done, reduced ? 200 : 1500);
  });
  // Fallback if load already fired
  if (document.readyState === 'complete') {
    setTimeout(() => { const p = $('#preloader'); p && p.classList.add('is-done'); startHero(); }, 600);
  }

  /* ---------- YEAR ---------- */
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- CUSTOM CURSOR + MAGNETIC ---------- */
  if (!isTouch) {
    document.body.classList.add('has-cursor');
    const ring = $('#cursor'), dot = $('#cursorDot');
    let rx = innerWidth / 2, ry = innerHeight / 2, dx = rx, dy = ry, cx = rx, cy = ry;
    window.addEventListener('mousemove', e => {
      cx = e.clientX; cy = e.clientY;
      ring.classList.add('is-active'); dot.classList.add('is-active');
    });
    (function loop() {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      dx += (cx - dx) * 0.45; dy += (cy - dy) * 0.45;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$('a, button, [data-tilt], [data-lightbox], .swatch').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });

    // Magnetic
    $$('[data-magnetic]').forEach(el => {
      const strength = 0.4;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * strength}px,${my * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- SCROLL PROGRESS + NAV ---------- */
  const nav = $('#nav'), siteTop = $('#siteTop'), progress = $('#scrollProgress'), fab = $('#fab');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (y / h * 100) + '%';
    if (nav) nav.classList.toggle('is-scrolled', y > 60);
    if (siteTop) {
      siteTop.classList.toggle('compact', y > 60);            // recolhe o top bar
      siteTop.classList.toggle('is-hidden', y > 400 && y > lastY && !mobileOpen);
    }
    if (fab) fab.classList.toggle('is-visible', y > 600);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- MOBILE MENU ---------- */
  const burger = $('#navBurger'), menu = $('#mobileMenu');
  let mobileOpen = false;
  function toggleMenu(force) {
    mobileOpen = force !== undefined ? force : !mobileOpen;
    burger.classList.toggle('is-open', mobileOpen);
    burger.setAttribute('aria-expanded', mobileOpen);
    menu.classList.toggle('is-open', mobileOpen);
    menu.setAttribute('aria-hidden', !mobileOpen);
    document.body.classList.toggle('is-locked', mobileOpen);
  }
  burger && burger.addEventListener('click', () => toggleMenu());
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- IN-VIEW ENGINE (scroll-based, robust on reload/jump) ---------- */
  const viewChecks = [];
  let viewRaf = false;
  function runViewChecks() {
    viewRaf = false;
    for (let i = viewChecks.length - 1; i >= 0; i--) {
      try { if (viewChecks[i]()) viewChecks.splice(i, 1); } catch (e) { viewChecks.splice(i, 1); }
    }
    if (!viewChecks.length) window.removeEventListener('scroll', queueViewChecks);
  }
  function queueViewChecks() { if (!viewRaf) { viewRaf = true; requestAnimationFrame(runViewChecks); } }
  window.addEventListener('scroll', queueViewChecks, { passive: true });
  window.addEventListener('resize', queueViewChecks);

  /* ---------- REVEAL ---------- */
  const revealEls = $$('[data-reveal]');
  if (reduced) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    revealEls.forEach(el => viewChecks.push(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88) {            // in view OR scrolled past
        const d = el.getAttribute('data-reveal-delay');
        if (d) el.style.transitionDelay = d + 'ms';
        el.classList.add('is-visible');
        return true;
      }
      return false;
    }));
  }

  /* ---------- COUNTERS ---------- */
  function animateCount(el) {
    if (el.hasAttribute('data-plain')) return; // keep literal (e.g. year)
    const target = parseInt(el.getAttribute('data-count'), 10);
    const dur = 1600; const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  $$('[data-count]').forEach(el => viewChecks.push(() => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { animateCount(el); return true; }
    return false;
  }));

  // initial sweeps — cover first paint, late layout, and mid-page reloads
  runViewChecks();
  setTimeout(runViewChecks, 300);
  window.addEventListener('load', () => setTimeout(runViewChecks, reduced ? 0 : 1700));

  /* ---------- PARALLAX ---------- */
  const parallaxEls = $$('[data-parallax]');
  if (!reduced && parallaxEls.length) {
    function para() {
      const vh = innerHeight;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        const r = el.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translateY(${-offset}px)`;
      });
      requestAnimationFrame(para);
    }
    requestAnimationFrame(para);
  }

  /* ---------- TILT ---------- */
  if (!isTouch && !reduced) {
    $$('[data-tilt]').forEach(el => {
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 5}deg) rotateX(${-py * 5}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- CONFIGURATOR (BATHTUBS) ---------- */
  const tubImg = $('#tubImage'), tubName = $('#tubName'), tubLine = $('#tubLine'),
        tubTags = $('#tubTags'), tubGlow = $('#tubGlow');
  const imgWrap = tubImg ? tubImg.closest('.configurator__imgwrap') : null;
  const copyBlock = $('.configurator__copy');
  $$('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      if (sw.classList.contains('is-active')) return;
      $$('.swatch').forEach(s => { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
      sw.classList.add('is-active'); sw.setAttribute('aria-selected', 'true');
      const { name, line, tags, img, color } = sw.dataset;
      imgWrap && imgWrap.classList.add('is-swapping');
      copyBlock && copyBlock.classList.add('is-swapping');
      if (tubGlow) tubGlow.style.setProperty('--c', color);
      setTimeout(() => {
        const pre = new Image();
        pre.onload = () => {
          tubImg.src = img; tubImg.alt = 'Banheira ' + name;
          tubName.textContent = name; tubLine.textContent = line; tubTags.textContent = tags;
          imgWrap && imgWrap.classList.remove('is-swapping');
          copyBlock && copyBlock.classList.remove('is-swapping');
        };
        pre.src = img;
      }, 350);
    });
  });

  /* ---------- LIGHTBOX ---------- */
  const lb = $('#lightbox'), lbImg = $('#lightboxImg'), lbClose = $('#lightboxClose');
  $$('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      lbImg.src = el.getAttribute('data-lightbox');
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
    });
  });
  function closeLb() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); document.body.classList.remove('is-locked'); }
  lbClose && lbClose.addEventListener('click', closeLb);
  lb && lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); if (mobileOpen) toggleMenu(false); } });

  /* ---------- ACTIVE NAV LINK ---------- */
  const navLinks = $$('#navLinks a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { threshold: 0.5, rootMargin: '-20% 0px -40% 0px' });
    sections.forEach(s => sio.observe(s));
  }

  /* ---------- CONTACT FORM -> WHATSAPP ---------- */
  const form = $('#contatoForm');
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = $('#cName').value.trim();
    const tel = $('#cPhone').value.trim();
    const interesse = $('#cInterest').value;
    const msg = $('#cMsg').value.trim();
    let text = `Olá! Sou ${nome || 'um interessado'}.`;
    text += ` Interesse: ${interesse}.`;
    if (tel) text += ` Meu contato: ${tel}.`;
    if (msg) text += ` ${msg}`;
    text += ' (Vim pelo site da Stillo D\'Água.)';
    window.open('https://wa.me/5547991651004?text=' + encodeURIComponent(text), '_blank');
  });

  /* ---------- SMOOTH ANCHOR (offset for nav) ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    });
  });
})();
