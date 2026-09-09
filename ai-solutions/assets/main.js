/* AI Solutions @ Berkeley — nav behaviour, scrollspy, and scroll-in reveals.
   Every block is guarded so this file is safe to drop on any page. */

/* Marks the document as scripted, which is what arms the reveal animation.
   Without it the .reveal sections simply render in place. */
document.documentElement.classList.add('js');

const nav = document.getElementById('nav');
const links = [...document.querySelectorAll('.nav nav a')];

/* The nav is transparent over the hero and goes solid once you're past it.
   A page without a hero starts solid. */
if (nav) {
  const hero = document.querySelector('.hero');
  if (hero) {
    const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > hero.offsetHeight * 0.6);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  } else {
    nav.classList.add('is-solid');
  }
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

/* Underline whichever section you're looking at. Only same-page "#id" links
   qualify — an "index.html#id" link from a subpage isn't a valid selector. */
const spied = links
  .map(a => {
    const href = a.getAttribute('href') || '';
    return href.startsWith('#') && href.length > 1 ? document.querySelector(href) : null;
  })
  .filter(Boolean);

if (spied.length) {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spied.forEach(s => spy.observe(s));
}

/* Fade sections in as they arrive. Reduced-motion users get them already
   visible via CSS, so skip the observer entirely rather than fighting it. */
const revealables = [...document.querySelectorAll('.reveal')];
if (revealables.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  revealables.forEach(el => io.observe(el));
} else {
  revealables.forEach(el => el.classList.add('is-in'));
}

/* Footer year */
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
