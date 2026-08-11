(() => {
  'use strict';
  const stage = document.querySelector('[data-atlas-stage]');
  const domainList = document.querySelector('[data-domain-list]');
  const timeline = document.querySelector('[data-full-timeline]');
  if (!stage || !domainList) return;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const edges = [
    ['dense-prediction','earth-observation'],['dense-prediction','spatial-intelligence'],['dense-prediction','spherical-perception'],
    ['dense-prediction','multimodal-learning'],['dense-prediction','robust-learning'],['dense-prediction','scientific-ai'],
    ['earth-observation','multimodal-learning'],['earth-observation','robust-learning'],['earth-observation','scientific-ai'],
    ['spatial-intelligence','robust-learning'],['spatial-intelligence','spherical-perception'],['spherical-perception','scientific-ai'],
    ['spherical-perception','multimodal-learning'],['multimodal-learning','scientific-ai'],['robust-learning','scientific-ai']
  ];

  const firstLink = (publication) => publication.links.Project || publication.links.Journal || publication.links.Springer || publication.links.DOI || publication.links.arXiv || publication.links['arXiv PDF'] || '/publications/';

  fetch('/assets/data/research.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load research atlas (${response.status})`);
      return response.json();
    })
    .then((data) => {
      const publicationMap = new Map(data.publications.map((publication) => [publication.id, publication]));
      const domainMap = new Map(data.domains.map((domain) => [domain.id, domain]));
      const svg = stage.querySelector('[data-atlas-svg]');
      const nodes = stage.querySelector('[data-atlas-nodes]');
      const context = stage.querySelector('[data-atlas-context]');
      svg.innerHTML = edges.map(([sourceId,targetId], index) => {
        const source = domainMap.get(sourceId);
        const target = domainMap.get(targetId);
        return `<line class="atlas-line" data-edge="${escapeHtml(sourceId)} ${escapeHtml(targetId)}" x1="${source.position.x}%" y1="${source.position.y}%" x2="${target.position.x}%" y2="${target.position.y}%" />`;
      }).join('');
      nodes.innerHTML = data.domains.map((domain) => `<button class="atlas-node${domain.id === 'dense-prediction' ? ' atlas-core active' : ''}" type="button" style="left:${domain.position.x}%;top:${domain.position.y}%" data-atlas-node="${escapeHtml(domain.id)}" aria-pressed="${domain.id === 'dense-prediction'}"><b>${escapeHtml(domain.number)} · ${escapeHtml(domain.kicker)}</b><span>${escapeHtml(domain.title)}</span></button>`).join('');

      const activate = (domainId) => {
        const domain = domainMap.get(domainId);
        if (!domain) return;
        nodes.querySelectorAll('[data-atlas-node]').forEach((node) => {
          const active = node.dataset.atlasNode === domainId;
          node.classList.toggle('active', active);
          node.setAttribute('aria-pressed', String(active));
        });
        svg.querySelectorAll('[data-edge]').forEach((line) => line.classList.toggle('active', line.dataset.edge.split(' ').includes(domainId)));
        const works = domain.publicationIds.slice(0,4).map((id) => publicationMap.get(id)).filter(Boolean);
        context.innerHTML = `<p class="atlas-context-label">${escapeHtml(domain.number)} · ${escapeHtml(domain.kicker)}</p><h2>${escapeHtml(domain.title)}</h2><p>${escapeHtml(domain.description)}</p><div class="atlas-related"><b>Connected work</b>${works.map((publication) => `<a href="${escapeHtml(firstLink(publication))}">${escapeHtml(publication.title)} ↗</a>`).join('')}</div>`;
      };

      nodes.querySelectorAll('[data-atlas-node]').forEach((node) => {
        node.addEventListener('pointerenter', () => activate(node.dataset.atlasNode));
        node.addEventListener('focus', () => activate(node.dataset.atlasNode));
        node.addEventListener('click', () => activate(node.dataset.atlasNode));
      });
      activate('dense-prediction');

      domainList.innerHTML = data.domains.map((domain) => {
        const works = domain.publicationIds.slice(0,4).map((id) => publicationMap.get(id)).filter(Boolean);
        return `<article class="domain-entry reveal" id="${escapeHtml(domain.id)}"><img src="${escapeHtml(domain.image)}" alt="" loading="lazy"><div class="domain-entry-content"><span>${escapeHtml(domain.number)} · ${escapeHtml(domain.kicker)}</span><h3>${escapeHtml(domain.title)}</h3><p>${escapeHtml(domain.description)}</p><div class="domain-work-links">${works.map((publication) => `<a href="${escapeHtml(firstLink(publication))}">${escapeHtml(publication.venueShort)} · ${publication.year}</a>`).join('')}</div></div></article>`;
      }).join('');
      domainList.querySelectorAll('.reveal').forEach((item) => {
        item.classList.add('visible');
      });

      if (timeline) {
        timeline.innerHTML = data.news.map((item) => `<article class="timeline-item reveal visible"><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.label)}</time><span></span><p><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.text)}</p></article>`).join('');
      }
    })
    .catch((error) => {
      stage.querySelector('[data-atlas-context]').innerHTML = '<p class="atlas-context-label">Atlas unavailable</p><h2>Please refresh</h2><p>The shared research data could not be loaded.</p>';
      console.error(error);
    });
})();
