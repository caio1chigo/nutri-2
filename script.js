(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loader = document.querySelector('#loader');
  const menu = document.querySelector('#navigation');
  const burger = document.querySelector('.burger');
  let finished = false;
  let observer;
  let counterObserver;
  let maxTimer;
  let readyTimer;
  const activeCounters = new Map();
  const targets = [...document.querySelectorAll('[data-reveal]')];
  const counters = [...document.querySelectorAll('[data-count]')];
  const start = performance.now();
  const format = n => new Intl.NumberFormat('pt-BR').format(n);

  function closeMenu() {
    if (!menu || !burger) return;
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
  }
  if (menu && burger) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); burger.focus(); }
    });
    window.addEventListener('resize', () => { if (innerWidth > 1000) closeMenu(); });
  }

  document.querySelectorAll('.demo-contact').forEach(button => {
    button.addEventListener('click', () => {
      const status = document.querySelector('.contact-status');
      if (status) status.textContent = 'Projeto demonstrativo: o agendamento ainda não está disponível.';
    });
  });

  function finalCounter(el) {
    el.textContent = format(Number(el.dataset.count)) + (el.dataset.suffix || '');
    const id = activeCounters.get(el);
    if (id) cancelAnimationFrame(id);
    activeCounters.delete(el);
  }
  function count(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = 'true';
    if (reduce.matches) { finalCounter(el); return; }
    const value = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const started = performance.now();
    const duration = 1600;
    el.textContent = '0' + suffix;
    function step(now) {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(value * eased)) + suffix;
      if (t < 1) activeCounters.set(el, requestAnimationFrame(step));
      else { activeCounters.delete(el); finalCounter(el); }
    }
    activeCounters.set(el, requestAnimationFrame(step));
  }
  function showAll() {
    root.classList.remove('motion-ready');
    targets.forEach(el => el.classList.add('is-visible'));
    if (observer) observer.disconnect();
    if (counterObserver) counterObserver.disconnect();
    counters.forEach(finalCounter);
  }
  function prepare() {
    if (reduce.matches || !('IntersectionObserver' in window)) return false;
    document.querySelectorAll('[data-stagger]').forEach(group => {
      [...group.children].forEach((el, i) => el.style.setProperty('--delay', `${i * 110}ms`));
    });
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });
    counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { count(entry.target); counterObserver.unobserve(entry.target); }
      });
    }, { threshold: .5 });
    root.classList.add('motion-ready');
    // Commit the hidden starting positions before adding is-visible later.
    void document.body.offsetWidth;
    return true;
  }
  let prepared = false;
  try { prepared = prepare(); } catch (error) { showAll(); }

  function begin() {
    if (reduce.matches || !prepared) { showAll(); return; }
    // Hero text is explicitly released after the loading screen fades away.
    const heroCopy = document.querySelector('.hero-copy');
    if (heroCopy) heroCopy.classList.add('is-visible');
    targets.forEach(el => { if (el !== heroCopy) observer.observe(el); });
    counters.forEach(el => counterObserver.observe(el));
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(maxTimer); clearTimeout(readyTimer);
    if (loader && !reduce.matches) {
      loader.classList.add('is-finished');
      setTimeout(() => {
        loader.remove();
        try { begin(); } catch (error) { showAll(); }
      }, 470);
    } else {
      if (loader) loader.remove();
      try { begin(); } catch (error) { showAll(); }
    }
  }
  if (reduce.matches) finish();
  else {
    try {
      if (loader) loader.classList.add('is-active');
      const image = document.querySelector('.hero-media img, .article-cover');
      const imageReady = new Promise(resolve => {
        if (!image || image.complete) resolve();
        else {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }
      });
      const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.all([imageReady, fontsReady]).then(() => {
        readyTimer = setTimeout(finish, Math.max(0, 650 - (performance.now() - start)));
      }).catch(finish);
      maxTimer = setTimeout(finish, 2600);
    } catch (error) { finish(); showAll(); }
  }
  // Reveal focused content immediately for keyboard navigation.
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !finished) { finish(); showAll(); }
  }, true);
  document.addEventListener('focusin', e => {
    if (!finished) { finish(); showAll(); }
    const target = e.target.closest('[data-reveal]');
    if (target) target.classList.add('is-visible');
  });
  const motionChanged = e => {
    if (e.matches) { finish(); showAll(); }
  };
  if (reduce.addEventListener) reduce.addEventListener('change', motionChanged);
})();