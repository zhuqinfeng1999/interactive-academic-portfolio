(() => {
  'use strict';
  const grid = document.querySelector('[data-project-grid]');
  if (!grid) return;
  const filters = [...document.querySelectorAll('[data-project-filter]')];
  let projects = [];
  let activeFilter = 'all';
  const escapeHtml = (value = '') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const slugType = (type) => type.toLowerCase().replaceAll(' ','-');

  const render = () => {
    const visible = projects.filter((project) => activeFilter === 'all' || slugType(project.type) === activeFilter);
    grid.innerHTML = visible.map((project) => `<article class="project-tile ${project.type === 'Method' || project.type === 'Research map' ? 'method' : ''} reveal visible"><a href="${escapeHtml(project.href)}" aria-label="Open ${escapeHtml(project.title)}"><img src="${escapeHtml(project.image)}" alt="" loading="lazy"><span class="project-tile-arrow">↗</span><div class="project-tile-copy"><div class="project-tile-meta"><span>${escapeHtml(project.eyebrow)}</span><span>${project.year}</span></div><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description)}</p><div class="project-tile-tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div></a></article>`).join('');
  };

  filters.forEach((filter) => filter.addEventListener('click', () => {
    activeFilter = filter.dataset.projectFilter;
    filters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    render();
  }));

  fetch('/assets/data/research.json')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Unable to load projects (${response.status})`)))
    .then((data) => { projects = data.projects; render(); })
    .catch((error) => { grid.innerHTML = '<p>Projects could not be loaded. Please refresh the page.</p>'; console.error(error); });
})();
