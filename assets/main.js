/* Shared portfolio behavior. Every feature is optional on the case-study pages. */
(() => {
  'use strict';

  const init = () => {
    const root = document.documentElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const storyViewport = matchMedia('(min-width: 901px) and (min-height: 760px)');
    const mobileViewport = matchMedia('(max-width: 1050px)');
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const twoDigits = value => String(value).padStart(2, '0');
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const nav = document.getElementById('nav');
    const menu = nav?.querySelector('nav');
    const toggle = nav?.querySelector('.nav-toggle');
    const navLinks = [...document.querySelectorAll('.nav nav a')];
    const hero = document.querySelector('#home.hero');
    let frame = 0;
    const controllers = [];

    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(update);
    };
    const listenMedia = (query, callback) => {
      if (query.addEventListener) query.addEventListener('change', callback);
      else query.addListener(callback);
    };
    const setMenu = (open, restoreFocus = false) => {
      if (!nav || !toggle) return;
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (restoreFocus) toggle.focus({ preventScroll: true });
    };
    if (nav && menu && toggle) {
      if (!menu.id) menu.id = 'primary-nav';
      toggle.setAttribute('aria-controls', menu.id);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
      navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
          event.preventDefault();
          setMenu(false, true);
        }
      });
      document.addEventListener('pointerdown', event => {
        if (nav.classList.contains('is-open') && !nav.contains(event.target)) setMenu(false);
      });
      document.addEventListener('focusin', event => {
        if (nav.classList.contains('is-open') && !nav.contains(event.target)) setMenu(false);
      });
      listenMedia(mobileViewport, () => { if (!mobileViewport.matches) setMenu(false); });
    }

    /* Section positions, rather than observer entry order, keep long sticky
       scenes and direct #links represented correctly in the navigation. */
    const sectionLinks = navLinks.map(link => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#') || href.length < 2) return null;
      try {
        const section = document.getElementById(decodeURIComponent(href.slice(1)));
        return section ? { link, section } : null;
      } catch { return null; }
    }).filter(Boolean);
    const updateNavigation = () => {
      nav?.classList.toggle('is-solid', !hero || scrollY > 28);
      if (!sectionLinks.length) return;
      const probe = scrollY + Math.min(innerHeight * 0.35, 300);
      const ordered = sectionLinks.map(entry => ({
        ...entry, top: entry.section.getBoundingClientRect().top + scrollY,
      })).sort((a, b) => a.top - b.top);
      let active = null;
      ordered.forEach(entry => { if (entry.top <= probe) active = entry.section.id; });
      if (scrollY + innerHeight >= root.scrollHeight - 5) active = ordered.at(-1).section.id;
      sectionLinks.forEach(({ link, section }) => {
        const selected = section.id === active;
        link.classList.toggle('is-active', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    /* A scene uses the same scroll range for automatic progression and manual
       controls. A short lock keeps a clicked panel steady during smooth travel. */
    const makeScene = (scene, count, select) => {
      let lock = null;
      let unlockTimer = 0;
      const geometry = () => {
        const top = scene.getBoundingClientRect().top + scrollY;
        const header = nav?.getBoundingClientRect().height || 76;
        const start = top - header;
        return { start, distance: Math.max(1, scene.offsetHeight - innerHeight + header) };
      };
      const sticky = () => storyViewport.matches && !reducedMotion.matches;
      const release = () => {
        lock = null;
        clearTimeout(unlockTimer);
        schedule();
      };
      const goTo = index => {
        index = clamp(index, 0, count - 1);
        select(index);
        if (!sticky() || count < 2) return;
        const range = geometry();
        const target = Math.max(0, range.start + range.distance * index / (count - 1));
        lock = { target, until: performance.now() + 1800 };
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(release, 1900);
        window.scrollTo({ top: target, behavior: 'smooth' });
      };
      const progress = () => {
        const range = geometry();
        return clamp((scrollY - range.start) / range.distance);
      };
      const updateScene = () => {
        if (!sticky()) return;
        if (lock) {
          if (Math.abs(scrollY - lock.target) < 3 || performance.now() > lock.until) release();
          else return;
        }
        select(Math.round(progress() * (count - 1)), true);
      };
      const controller = { scene, goTo, update: updateScene, release, progress, sticky };
      controllers.push(controller);
      return controller;
    };

    const projectScene = document.querySelector('[data-project-scene]');
    let projects = null;
    if (projectScene) {
      const tabs = [...projectScene.querySelectorAll('[data-project-tabs] [role="tab"]')];
      const panels = [...projectScene.querySelectorAll('.project-panel[data-project-index]')];
      const previous = projectScene.querySelector('.project-prev');
      const next = projectScene.querySelector('.project-next');
      const currentLabels = [...projectScene.querySelectorAll('[data-project-current]')];
      const totalLabels = [...projectScene.querySelectorAll('[data-project-total]')];
      let current = 0;
      let renderedIndex = -1;
      let renderedReduced = null;
      if (panels.length && tabs.length === panels.length) {
        const keepTabVisible = tab => {
          const strip = tab.closest('[data-project-tabs]');
          if (!strip || strip.scrollWidth <= strip.clientWidth) return;
          const bounds = strip.getBoundingClientRect();
          const tabBounds = tab.getBoundingClientRect();
          if (tabBounds.left < bounds.left) strip.scrollLeft += tabBounds.left - bounds.left;
          else if (tabBounds.right > bounds.right) strip.scrollLeft += tabBounds.right - bounds.right;
        };
        const select = (index, automatic = false) => {
          index = clamp(index, 0, panels.length - 1);
          /* Scrolling must not hide a panel while someone is using its links. */
          if (automatic && index !== current && panels[current].contains(document.activeElement)) return;
          if (index === renderedIndex && reducedMotion.matches === renderedReduced) return;
          current = index;
          renderedIndex = index;
          renderedReduced = reducedMotion.matches;
          panels.forEach((panel, i) => {
            panel.hidden = !reducedMotion.matches && i !== current;
            panel.classList.toggle('is-active', i === current);
          });
          tabs.forEach((tab, i) => {
            const selected = i === current;
            tab.classList.toggle('is-active', selected);
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
          });
          if (!automatic && !reducedMotion.matches) keepTabVisible(tabs[current]);
          currentLabels.forEach(label => { label.textContent = twoDigits(current + 1); });
          totalLabels.forEach(label => { label.textContent = twoDigits(panels.length); });
          projectScene.style.setProperty('--project-progress', String((current + 1) / panels.length));
          if (previous) previous.disabled = current === 0;
          if (next) next.disabled = current === panels.length - 1;
        };
        projects = makeScene(projectScene, panels.length, select);
        projects.refresh = () => select(current);
        projects.indexFor = target => panels.findIndex(panel => panel === target || panel.contains(target));
        tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => projects.goTo(index));
          tab.addEventListener('keydown', event => {
            let target;
            if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') target = 0;
            else if (event.key === 'End') target = tabs.length - 1;
            else return;
            event.preventDefault();
            tabs[target].focus({ preventScroll: true });
            projects.goTo(target);
          });
        });
        previous?.addEventListener('click', () => projects.goTo(current - 1));
        next?.addEventListener('click', () => projects.goTo(current + 1));
        select(0);
      }
    }

    const processScene = document.querySelector('[data-process-scene]');
    let process = null;
    if (processScene) {
      const steps = [...processScene.querySelectorAll('.process-step[data-step-index]')];
      const triggers = [...processScene.querySelectorAll('.process-step-trigger[data-step-index]')];
      const labels = [...processScene.querySelectorAll('[data-process-current]')];
      let current = 0;
      let renderedIndex = -1;
      if (steps.length) {
        const select = index => {
          current = clamp(index, 0, steps.length - 1);
          if (current === renderedIndex) return;
          renderedIndex = current;
          steps.forEach((step, i) => {
            const selected = i === current;
            step.classList.toggle('is-active', selected);
            if (selected) step.setAttribute('aria-current', 'step');
            else step.removeAttribute('aria-current');
          });
          triggers.forEach(trigger => trigger.setAttribute('aria-pressed',
            String(Number(trigger.dataset.stepIndex) === current)));
          labels.forEach(label => { label.textContent = twoDigits(current + 1); });
          processScene.style.setProperty('--process-progress', String((current + 1) / steps.length));
        };
        process = makeScene(processScene, steps.length, select);
        process.refresh = () => select(current);
        triggers.forEach(trigger => trigger.addEventListener('click',
          () => process.goTo(Number(trigger.dataset.stepIndex))));
        select(0);
      }
    }

    /* Wheel or touch input takes precedence over a control's smooth scroll. */
    const releaseScenes = () => controllers.forEach(controller => controller.release());
    addEventListener('wheel', releaseScenes, { passive: true });
    addEventListener('touchstart', releaseScenes, { passive: true });
    addEventListener('keydown', event => {
      if (['PageDown', 'PageUp', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) releaseScenes();
    });

    /* Reveals are a progressive enhancement: the content starts visible, and
       stays visible under reduced motion or without IntersectionObserver. */
    const reveals = [...document.querySelectorAll('[data-reveal]')];
    let revealObserver = null;
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });
    }
    reveals.forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (reducedMotion.matches || !revealObserver || (bounds.top < innerHeight && bounds.bottom >= 0)) {
        element.classList.add('is-visible');
      } else revealObserver.observe(element);
    });

    /* A seeded, scroll-drawn field echoes the movement from scattered signals
       to a clearer pattern. It has no endless animation loop or pointer trap. */
    const canvas = document.getElementById('signal-field');
    const ctx = canvas?.getContext('2d');
    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasDirty = true;
    let lastCanvasDraw = 0;
    const resizeCanvas = () => {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvasWidth * ratio);
      canvas.height = Math.round(canvasHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvasDirty = true;
      schedule();
    };
    const drawField = timestamp => {
      if (!canvas || !ctx || !canvasWidth || !canvasHeight) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      if (!canvasDirty && (reducedMotion.matches || timestamp - lastCanvasDraw < 45)) return;
      lastCanvasDraw = timestamp;
      canvasDirty = false;
      const order = reducedMotion.matches ? 0.6 : clamp((innerHeight - rect.top) / (innerHeight + rect.height));
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const columns = Math.max(5, Math.ceil(canvasWidth / 60));
      const rows = Math.max(4, Math.ceil(canvasHeight / 60));
      const spacingX = canvasWidth / columns;
      const spacingY = canvasHeight / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const i = row * columns + col;
          const jitter = (1 - order) * 24;
          const x = (col + 0.5) * spacingX + Math.sin(i * 7.31) * jitter;
          const y = (row + 0.5) * spacingY + Math.cos(i * 5.17) * jitter;
          ctx.fillStyle = i % 37 === 0 ? 'rgba(216,160,29,.35)' : 'rgba(3,39,76,.13)';
          ctx.beginPath();
          ctx.arc(x, y, i % 37 === 0 ? 2.1 : 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    if (canvas && ctx) {
      resizeCanvas();
      if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
    }

    /* Timeline filters and accordions retain the portfolio's original content
       and keep collapsed rows out of keyboard navigation. */
    const timeline = document.querySelector('.tl');
    const timelineItems = timeline ? [...timeline.querySelectorAll('.tl-item')] : [];
    const timelineCleanup = new WeakMap();
    const setTimelineOpen = (item, open) => {
      const head = item.querySelector('.tl-head');
      const body = item.querySelector('.tl-body');
      const inner = item.querySelector('.tl-inner');
      if (!head || !body || !inner) return;
      timelineCleanup.get(item)?.();
      const from = body.getBoundingClientRect().height;
      item.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
      if ('inert' in body) body.inert = !open;
      if (reducedMotion.matches) {
        body.style.height = open ? 'auto' : '0px';
        return;
      }
      body.style.height = `${from}px`;
      void body.offsetHeight;
      const finish = () => {
        if (item.classList.contains('is-open')) body.style.height = 'auto';
        body.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
        timelineCleanup.delete(item);
      };
      const onEnd = event => { if (event.propertyName === 'height') finish(); };
      const fallback = setTimeout(finish, 650);
      body.addEventListener('transitionend', onEnd);
      const nextFrame = requestAnimationFrame(() => {
        body.style.height = open ? `${inner.offsetHeight}px` : '0px';
      });
      timelineCleanup.set(item, () => {
        cancelAnimationFrame(nextFrame);
        body.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      });
    };
    if (timelineItems.length) {
      const chips = [...document.querySelectorAll('.tl-chip')];
      const count = document.querySelector('.tl-count');
      const labels = { all: 'everything', work: 'work', edu: 'education', lead: 'leadership' };
      const tally = filter => filter === 'all' ? timelineItems.length
        : timelineItems.filter(item => item.dataset.kind === filter).length;
      timelineItems.forEach((item, index) => {
        const head = item.querySelector('.tl-head');
        const body = item.querySelector('.tl-body');
        if (!head || !body) return;
        if (!body.id) body.id = `timeline-detail-${index + 1}`;
        head.setAttribute('aria-controls', body.id);
        head.setAttribute('aria-expanded', 'false');
        if ('inert' in body) body.inert = true;
        head.addEventListener('click', () => setTimelineOpen(item, !item.classList.contains('is-open')));
      });
      const apply = filter => {
        timelineItems.forEach(item => {
          const show = filter === 'all' || item.dataset.kind === filter;
          if (!show && item.classList.contains('is-open')) setTimelineOpen(item, false);
          item.hidden = !show;
        });
        chips.forEach(chip => {
          const active = chip.dataset.filter === filter;
          chip.classList.toggle('is-on', active);
          chip.setAttribute('aria-pressed', String(active));
        });
        if (count) count.textContent = filter === 'all'
          ? `Showing all ${tally(filter)} — pick a row to open it.`
          : `Showing ${tally(filter)} under ${labels[filter] || filter}.`;
      };
      chips.forEach(chip => {
        const number = chip.querySelector('b');
        if (number) number.textContent = tally(chip.dataset.filter);
        chip.addEventListener('click', () => apply(chip.dataset.filter));
      });
      apply('all');
    }

    /* Preserve the case studies' full-size chart viewer. The closed dialog is
       hidden and inert, so its close button cannot enter the page's tab order. */
    const charts = [...document.querySelectorAll('.chart img')];
    if (charts.length) {
      const viewer = document.createElement('div');
      viewer.className = 'fv';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', 'Figure viewer');
      viewer.setAttribute('aria-describedby', 'figure-viewer-caption');
      viewer.setAttribute('aria-hidden', 'true');
      viewer.hidden = true;
      viewer.inert = true;
      /* .fv declares display:flex, which can override the browser's [hidden]
         rule on pages that use only the shared case-study stylesheet. */
      viewer.style.display = 'none';
      viewer.innerHTML = '<button class="fv-close" type="button" aria-label="Close figure">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" '
        + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
        + '<path d="m6 6 12 12M18 6 6 18"/></svg></button>'
        + '<img class="fv-img" alt="">'
        + '<p class="fv-cap" id="figure-viewer-caption"></p>';
      document.body.appendChild(viewer);

      const image = viewer.querySelector('.fv-img');
      const caption = viewer.querySelector('.fv-cap');
      const closeButton = viewer.querySelector('.fv-close');
      let lastFocus = null;
      const openViewer = chart => {
        lastFocus = chart;
        image.src = chart.currentSrc || chart.src;
        /* The caption holds the description once; a duplicate image alt
           would make screen readers announce the same paragraph twice. */
        image.alt = '';
        caption.textContent = chart.alt || '';
        viewer.hidden = false;
        viewer.inert = false;
        viewer.removeAttribute('aria-hidden');
        viewer.style.removeProperty('display');
        viewer.classList.add('is-open');
        document.body.classList.add('fv-lock');
        closeButton.focus({ preventScroll: true });
      };
      const closeViewer = () => {
        viewer.classList.remove('is-open');
        viewer.hidden = true;
        viewer.inert = true;
        viewer.setAttribute('aria-hidden', 'true');
        viewer.style.display = 'none';
        document.body.classList.remove('fv-lock');
        if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
      };

      charts.forEach(chart => {
        chart.tabIndex = 0;
        chart.setAttribute('role', 'button');
        chart.setAttribute('aria-haspopup', 'dialog');
        chart.setAttribute('aria-label', 'Expand figure' + (chart.alt ? ': ' + chart.alt.slice(0, 80) : ''));
        chart.addEventListener('click', () => openViewer(chart));
        chart.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openViewer(chart);
          }
        });
      });
      closeButton.addEventListener('click', closeViewer);
      viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); });
      addEventListener('keydown', event => {
        if (!viewer.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          closeViewer();
        } else if (event.key === 'Tab') {
          event.preventDefault();
          closeButton.focus({ preventScroll: true });
        }
      });
      document.addEventListener('focusin', event => {
        if (viewer.classList.contains('is-open') && !viewer.contains(event.target)) {
          closeButton.focus({ preventScroll: true });
        }
      });
    }

    const handleHash = () => {
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
      catch { return; }
      if (!target) return;
      target.closest('[data-reveal]')?.classList.add('is-visible');
      if (projects) {
        const index = projects.indexFor(target);
        if (index >= 0) projects.goTo(index);
      }
      schedule();
    };
    addEventListener('hashchange', handleHash);

    function update(timestamp) {
      frame = 0;
      updateNavigation();
      if (hero) hero.style.setProperty('--hero-progress', reducedMotion.matches ? '0'
        : String(clamp(scrollY / Math.max(hero.offsetHeight, 1))));
      controllers.forEach(controller => controller.update());
      drawField(timestamp);
    }
    const changeMode = () => {
      root.classList.toggle('has-motion', !reducedMotion.matches);
      if (reducedMotion.matches) reveals.forEach(element => element.classList.add('is-visible'));
      controllers.forEach(controller => { controller.release(); controller.refresh?.(); });
      timelineItems.forEach(item => {
        const body = item.querySelector('.tl-body');
        if (body) body.style.height = item.classList.contains('is-open') ? 'auto' : '0px';
      });
      canvasDirty = true;
      schedule();
    };
    listenMedia(reducedMotion, changeMode);
    listenMedia(storyViewport, changeMode);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', () => { resizeCanvas(); schedule(); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else { canvasDirty = true; schedule(); }
    });
    document.fonts?.ready.then(schedule);
    root.classList.add('js');
    changeMode();
    handleHash();
    schedule();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
