(() => {
  'use strict';
  const results = document.querySelector('[data-publication-results]');
  if (!results) return;
  const search = document.querySelector('[data-publication-search]');
  const count = document.querySelector('[data-result-count]');
  const empty = document.querySelector('[data-publication-empty]');
  const filters = [...document.querySelectorAll('[data-publication-filter]')];
  let publications = [];
  let activeFilter = 'all';

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const authorList = (authors) => authors.map((author) => {
    const name = author.self ? `<strong>${escapeHtml(author.name)}</strong>` : escapeHtml(author.name);
    return `${name}${author.coFirst ? '<span class="cofirst-mark" title="Co-first author">*</span>' : ''}`;
  }).join(', ');

  const firstLink = (publication) => {
    const preferred = ['Journal', 'DOI', 'arXiv', 'Springer', 'Project', 'arXiv PDF', 'GitHub'];
    for (const label of preferred) if (publication.links[label]) return publication.links[label];
    return '/publications/';
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const visible = publications.filter((publication) => {
      const filterMatch = activeFilter === 'all'
        || String(publication.year) === activeFilter
        || publication.type.toLowerCase() === activeFilter;
      const haystack = [
        publication.title,
        publication.venue,
        publication.venueShort,
        publication.year,
        publication.type,
        ...(publication.keywords || []),
        ...publication.authors.map((author) => author.name)
      ].join(' ').toLowerCase();
      return filterMatch && (!query || haystack.includes(query));
    });

    count.textContent = `${visible.length} ${visible.length === 1 ? 'publication' : 'publications'}`;
    empty.classList.toggle('show', visible.length === 0);
    results.innerHTML = visible.map((publication) => {
      const hasImage = Boolean(publication.image && publication.featuredRank);
      const first = firstLink(publication);
      const links = Object.entries(publication.links).map(([label, href]) => `<a href="${escapeHtml(href)}"${href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHtml(label)}</a>`).join('');
      const venue = `<div class="publication-venue"><time>${publication.year}</time><span>${escapeHtml(publication.venueShort)}</span></div>`;
      const firstColumn = hasImage
        ? `<div class="publication-media-column"><a class="publication-thumb" href="${escapeHtml(first)}" aria-label="Open ${escapeHtml(publication.title)}"><img src="${escapeHtml(publication.image)}" alt="${escapeHtml(publication.imageAlt || '')}" loading="lazy"></a>${venue}</div>`
        : venue;
      return `<article class="publication-entry${hasImage ? ' has-image' : ''}" data-publication-id="${escapeHtml(publication.id)}">
        ${firstColumn}
        <div class="publication-body">
          ${publication.status ? `<span class="publication-status">${escapeHtml(publication.status)}</span>` : ''}
          <h2><a href="${escapeHtml(first)}"${first.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHtml(publication.title)}</a></h2>
          <p class="publication-authors">${authorList(publication.authors)}</p>
          <p class="publication-summary">${escapeHtml(publication.summary || '')}</p>
          <div class="publication-tags">${(publication.keywords || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        </div>
        <div class="publication-actions">${links}<button class="bibtex-button" type="button" data-bibtex="${escapeHtml(publication.id)}">BibTeX</button></div>
      </article>`;
    }).join('');
  };

  const copyBibtex = async (publication, button) => {
    try {
      await navigator.clipboard.writeText(publication.bibtex);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = publication.bibtex;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    const original = button.textContent;
    button.textContent = 'Copied';
    button.classList.add('copied');
    window.showSiteToast?.('BibTeX copied to clipboard');
    window.setTimeout(() => { button.textContent = original; button.classList.remove('copied'); }, 1800);
  };

  filters.forEach((filter) => filter.addEventListener('click', () => {
    activeFilter = filter.dataset.publicationFilter;
    filters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    render();
  }));
  search.addEventListener('input', render);
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-bibtex]');
    if (!button) return;
    const publication = publications.find((item) => item.id === button.dataset.bibtex);
    if (publication) copyBibtex(publication, button);
  });

  fetch('/assets/data/research.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load publications (${response.status})`);
      return response.json();
    })
    .then((data) => {
      publications = [...data.publications].sort((a,b) => b.year - a.year || (a.featuredRank || 999) - (b.featuredRank || 999));
      render();
    })
    .catch((error) => {
      count.textContent = 'Library unavailable';
      empty.textContent = 'The publication library could not be loaded. Please refresh the page.';
      empty.classList.add('show');
      console.error(error);
    });
})();
