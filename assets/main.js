/* Shared by index.html and the case study pages. Every block below is guarded,
   because the case study pages have a nav but no hero, typewriter, or sections. */

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const nav = document.getElementById('nav');
const links = [...document.querySelectorAll('.nav nav a')];

/* Nav goes solid once the hero is behind us. Pages without a hero stay solid. */
const hero = document.querySelector('.hero');
if (nav && hero) {
  const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.72);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
}

/* Mobile menu */
const toggle = document.querySelector('.nav-toggle');
if (nav && toggle) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

/* Highlight the section you're looking at. Only same-page "#id" links qualify —
   the case study nav points at index.html#id, which isn't a valid selector. */
const spySections = links
  .map(a => {
    const href = a.getAttribute('href') || '';
    return href.startsWith('#') && href.length > 1 ? document.querySelector(href) : null;
  })
  .filter(Boolean);

if (spySections.length) {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spySections.forEach(s => spy.observe(s));
}

/* Typewriter. Under reduced-motion it just shows the first line. */
const typed = document.getElementById('typed');
if (typed) {
  const lines = [
    'Welcome.',
    'Cognitive science meets data.',
    'Analysis that ends in a decision.',
  ];

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.textContent = lines[0];
  } else {
    let li = 0, ci = 0, deleting = false;
    const tick = () => {
      const line = lines[li];
      ci += deleting ? -1 : 1;
      typed.textContent = line.slice(0, ci);

      let wait = deleting ? 40 : 75;
      if (!deleting && ci === line.length) { deleting = true; wait = 2100; }
      // short blank gap — a long one reads as a broken/empty hero
      else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; wait = 180; }
      setTimeout(tick, wait);
    };
    tick();
  }
}

/* ── Interactive timeline (#background) ──────────────────────────────────
   Rows open to show what the work involved; chips filter the list down.
   Guarded like everything else here — the case study pages have no timeline. */
const tl = document.querySelector('.tl');
if (tl) {
  const items = [...tl.querySelectorAll('.tl-item')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Height is measured rather than guessed: a max-height large enough for the
     longest row makes every shorter row ease at the wrong speed. */
  const setOpen = (item, open) => {
    const head = item.querySelector('.tl-head');
    const body = item.querySelector('.tl-body');
    const inner = item.querySelector('.tl-inner');
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    if (reduce) { body.style.height = open ? 'auto' : '0'; return; }
    if (open) {
      body.style.height = inner.offsetHeight + 'px';
      /* Let it settle to auto so a window resize can't leave it clipped. */
      body.addEventListener('transitionend', function done(e) {
        if (e.propertyName !== 'height') return;
        if (item.classList.contains('is-open')) body.style.height = 'auto';
        body.removeEventListener('transitionend', done);
      });
    } else {
      body.style.height = inner.offsetHeight + 'px';
      requestAnimationFrame(() => { body.style.height = '0'; });
    }
  };

  items.forEach(item => {
    const head = item.querySelector('.tl-head');
    head.addEventListener('click', () => setOpen(item, !item.classList.contains('is-open')));
  });

  /* Filters. The count line is the accessible announcement — the chips
     themselves only carry their own tally. */
  const chips = [...document.querySelectorAll('.tl-chip')];
  const count = document.querySelector('.tl-count');
  const tally = (f) => f === 'all' ? items.length : items.filter(i => i.dataset.kind === f).length;
  chips.forEach(c => { const b = c.querySelector('b'); if (b) b.textContent = tally(c.dataset.filter); });

  const LABEL = { all: 'everything', work: 'work', edu: 'education', lead: 'leadership' };
  const apply = (f) => {
    items.forEach(i => {
      const show = f === 'all' || i.dataset.kind === f;
      i.hidden = !show;
      if (!show && i.classList.contains('is-open')) setOpen(i, false);
    });
    chips.forEach(c => c.classList.toggle('is-on', c.dataset.filter === f));
    if (count) {
      const n = tally(f);
      count.textContent = f === 'all'
        ? `Showing all ${n} — pick a row to open it.`
        : `Showing ${n} under ${LABEL[f]}.`;
    }
  };

  chips.forEach(c => c.addEventListener('click', () => apply(c.dataset.filter)));
  apply('all');
}
