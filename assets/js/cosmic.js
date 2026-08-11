(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pageProgress = document.querySelector('[data-page-progress]');
  const header = document.querySelector('[data-header]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  let previousScroll = window.scrollY;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  /* Intro: short enough to feel intentional, not blocking. */
  const loader = document.querySelector('[data-loader]');
  if (loader) {
    const loaderCount = loader.querySelector('[data-loader-count]');
    const loaderProgress = loader.querySelector('[data-loader-progress]');
    const loaderWord = loader.querySelector('[data-loader-word]');
    const words = ['Perceive', 'Represent', 'Understand'];
    const duration = reducedMotion ? 120 : 1200;
    const startedAt = performance.now();
    let activeWord = 0;

    const completeLoader = () => {
      loader.classList.add('is-complete');
      document.body.classList.add('is-ready');
      window.setTimeout(() => loader.remove(), 900);
    };

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const number = Math.round(eased * 100);
      const nextWord = Math.min(words.length - 1, Math.floor(progress * words.length));
      if (loaderCount) loaderCount.textContent = String(number).padStart(3, '0');
      if (loaderProgress) loaderProgress.style.width = `${eased * 100}%`;
      if (loaderWord && nextWord !== activeWord) {
        activeWord = nextWord;
        loaderWord.textContent = words[activeWord];
      }
      if (progress < 1) requestAnimationFrame(tick);
      else completeLoader();
    };
    requestAnimationFrame(tick);
    window.addEventListener('load', () => window.setTimeout(() => {
      if (!loader.classList.contains('is-complete')) completeLoader();
    }, 1800), { once: true });
  } else {
    document.body.classList.add('is-ready');
  }

  /* Navigation and reading progress. */
  const updateChrome = () => {
    const y = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (pageProgress) pageProgress.style.transform = `scaleX(${scrollable > 0 ? y / scrollable : 0})`;
    if (header && !document.body.classList.contains('nav-open')) {
      const shouldHide = y > previousScroll && y > 260;
      header.classList.toggle('is-hidden', shouldHide);
    }
    previousScroll = y;
  };
  window.addEventListener('scroll', updateChrome, { passive: true });
  updateChrome();

  const closeNavigation = () => {
    navLinks?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('nav-open');
  };

  navToggle?.addEventListener('click', () => {
    const open = !navLinks?.classList.contains('open');
    navLinks?.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('nav-open', open);
  });
  navLinks?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation();
  });

  const samePageLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const observedSections = [...document.querySelectorAll('main section[id]')];
  if (samePageLinks.length && observedSections.length) {
    const activateSection = () => {
      const marker = window.scrollY + window.innerHeight * .34;
      let active = observedSections[0]?.id;
      observedSections.forEach((section) => {
        if (section.offsetTop <= marker) active = section.id;
      });
      samePageLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${active}`));
    };
    window.addEventListener('scroll', activateSection, { passive: true });
    activateSection();
  }

  /* Entrance reveals. */
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 4, 3) * 45}ms`;
      revealObserver.observe(item);
    });
  }

  /* Rotating research phrase. */
  const role = document.querySelector('[data-roles]');
  if (role && !reducedMotion) {
    const roles = role.dataset.roles.split('|').filter(Boolean);
    let index = 0;
    window.setInterval(() => {
      if (role.dataset.modeLocked) return;
      role.classList.add('is-changing');
      window.setTimeout(() => {
        index = (index + 1) % roles.length;
        role.textContent = roles[index];
        role.classList.remove('is-changing');
      }, 250);
    }, 2800);
  }

  /* Card tilt is deliberately restrained. */
  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty('--rx', `${(y - .5) * -3.5}deg`);
        card.style.setProperty('--ry', `${(x - .5) * 4.5}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '40%');
      });
    });
  }

  /* Shared toast. */
  let toastTimer;
  const showToast = (message) => {
    let toast = document.querySelector('[data-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.dataset.toast = '';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  };
  window.showSiteToast = showToast;

  /* Command palette: routes, research areas, papers and projects in one place. */
  const commandTriggers = document.querySelectorAll('[data-command-trigger]');
  if (commandTriggers.length) {
    const shortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';
    commandTriggers.forEach((trigger) => {
      const key = trigger.querySelector('kbd');
      if (key) key.textContent = shortcutLabel;
    });
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.dataset.commandPalette = '';
    palette.innerHTML = `
      <div class="command-dialog" role="dialog" aria-modal="true" aria-label="Search this research portfolio">
        <div class="command-input-wrap"><span>⌕</span><input class="command-input" data-command-input type="search" autocomplete="off" placeholder="Search papers, projects or research areas…"><button class="command-close" data-command-close type="button">ESC</button></div>
        <div class="command-results" data-command-results></div>
        <div class="command-help"><span><kbd>↑↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
      </div>`;
    document.body.append(palette);
    const input = palette.querySelector('[data-command-input]');
    const results = palette.querySelector('[data-command-results]');
    let items = [
      { title: 'Home', detail: 'Your Name — research portfolio', href: '/', type: 'Page' },
      { title: 'Research Atlas', detail: 'Explore connections across questions, methods and artifacts', href: '/research/', type: 'Page' },
      { title: 'Publications Library', detail: 'Search, filter and copy BibTeX', href: '/publications/', type: 'Page' },
      { title: 'Projects', detail: 'Datasets, methods and research maps', href: '/projects/', type: 'Page' },
      { title: 'Interactive Explorer', detail: 'Compare four sensing spaces in one responsive scene', href: '/explorer/', type: 'Explorer' }
    ];
    let visible = [];
    let activeIndex = 0;

    fetch('/assets/data/research.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('data unavailable')))
      .then((data) => {
        const publications = data.publications.map((publication) => ({
          title: publication.title,
          detail: `${publication.year} · ${publication.venueShort}`,
          href: publication.links.Project || publication.links.Journal || publication.links.Springer || publication.links.DOI || publication.links.arXiv || publication.links['arXiv PDF'] || '/publications/',
          type: 'Paper',
          search: [publication.title, publication.venue, publication.year, ...(publication.keywords || [])].join(' ')
        }));
        const projects = data.projects.map((project) => ({
          title: project.title,
          detail: `${project.type} · ${project.eyebrow}`,
          href: project.href,
          type: 'Project',
          search: [project.title, project.type, project.description, ...(project.tags || [])].join(' ')
        }));
        const domains = data.domains.map((domain) => ({
          title: domain.title,
          detail: domain.description,
          href: `/research/#${domain.id}`,
          type: 'Research',
          search: `${domain.title} ${domain.kicker} ${domain.description}`
        }));
        items = [...items, ...domains, ...projects, ...publications];
        renderResults(input.value);
      })
      .catch(() => {});

    const iconFor = (type) => ({ Page: '↗', Explorer: '✦', Document: '↓', Paper: 'P', Project: 'D', Research: 'R' }[type] || '↗');
    const renderResults = (query = '') => {
      const normalized = query.trim().toLowerCase();
      visible = items.filter((item) => !normalized || `${item.title} ${item.detail} ${item.search || ''}`.toLowerCase().includes(normalized)).slice(0, 9);
      activeIndex = Math.min(activeIndex, Math.max(visible.length - 1, 0));
      if (!visible.length) {
        results.innerHTML = '<div class="command-empty">No matching work. Try a topic such as “world model”, “medical imaging” or “scientific AI”.</div>';
        return;
      }
      results.innerHTML = visible.map((item, index) => `
        <a class="command-result${index === activeIndex ? ' active' : ''}" href="${escapeHtml(item.href)}" data-command-index="${index}">
          <span class="command-icon">${escapeHtml(iconFor(item.type))}</span>
          <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>
          <small>${escapeHtml(item.type)}</small>
        </a>`).join('');
    };
    const openPalette = () => {
      palette.classList.add('open');
      document.body.classList.add('palette-open');
      activeIndex = 0;
      renderResults(input.value);
      window.setTimeout(() => input.focus(), 50);
    };
    const closePalette = () => {
      palette.classList.remove('open');
      document.body.classList.remove('palette-open');
      commandTriggers[0]?.focus();
    };
    commandTriggers.forEach((trigger) => trigger.addEventListener('click', openPalette));
    palette.querySelector('[data-command-close]').addEventListener('click', closePalette);
    palette.addEventListener('pointerdown', (event) => { if (event.target === palette) closePalette(); });
    input.addEventListener('input', () => { activeIndex = 0; renderResults(input.value); });
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        palette.classList.contains('open') ? closePalette() : openPalette();
      }
      if (!palette.classList.contains('open')) return;
      if (event.key === 'Escape') closePalette();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        activeIndex = (activeIndex + delta + visible.length) % visible.length;
        renderResults(input.value);
        results.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
      }
      if (event.key === 'Enter' && visible[activeIndex]) {
        event.preventDefault();
        window.location.href = visible[activeIndex].href;
      }
    });
    renderResults();
  }

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
})();
