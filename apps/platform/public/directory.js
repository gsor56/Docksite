const form = document.querySelector('#directory-filters');
if (form) {
  const results = document.querySelector('#tool-results');
  const status = document.querySelector('#directory-status');
  const empty = document.querySelector('#directory-empty');
  const pagination = document.querySelector('#directory-pagination');
  let controller;
  let timer;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function icon(name = 'arrow') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', '0 0 24 24');
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1.7');
    node.setAttribute('aria-hidden', 'true');
    node.classList.add(name === 'arrow' ? 'arrow' : 'icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const paths = {
      arrow: 'M4 12h15m-6-6 6 6-6 6',
      link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
      box: 'M3 3h18v18H3ZM3 9h18M9 9v12',
      code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
    };
    path.setAttribute('d', paths[name] || paths.box);
    node.append(path);
    return node;
  }
  function parameters() {
    const params = new URLSearchParams(new FormData(form));
    for (const [key, value] of [...params])
      if (!value || (key === 'sort' && value === 'newest')) params.delete(key);
    return params;
  }
  async function load(params, updateUrl = true) {
    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    status.textContent = 'Loading tools…';
    results.setAttribute('aria-busy', 'true');
    if (updateUrl) history.pushState(null, '', `/tools${params.size ? '?' + params : ''}`);
    try {
      const response = await fetch(`/api/tools?${params}`, { signal: activeController.signal });
      const data = await response.json();
      if (controller !== activeController) return;
      if (!response.ok) throw new Error(data.error || 'Could not load tools.');
      results.replaceChildren();
      for (const tool of data.tools) {
        const card = element('article', '', 'card tool-card');
        const topline = element('div', '', 'card-topline');
        topline.append(icon(tool.icon));
        if (tool.category) {
          const category = element('a', tool.category.name, 'tag');
          category.href = `/categories/${encodeURIComponent(tool.category.slug)}`;
          topline.append(category);
        }
        const heading = element('h3');
        const landing = element('a', tool.name);
        landing.href = `/tools/${encodeURIComponent(tool.slug)}`;
        heading.append(landing);
        card.append(topline, heading, element('p', tool.tagline, 'tool-tagline'));
        const tags = element('div', '', 'tags');
        for (const tag of tool.tags) tags.append(element('span', tag.name, 'tag'));
        const bottom = element('div', '', 'tool-card-bottom');
        const address = new URL(tool.url);
        const open = element('a', 'Open tool ', 'tool-open');
        open.href = tool.url;
        open.append(icon());
        bottom.append(
          element(
            'span',
            address.host + (address.pathname === '/' ? '' : address.pathname),
            'metadata break',
          ),
          open,
        );
        card.append(tags, bottom);
        results.append(card);
      }
      empty.hidden = data.tools.length > 0;
      status.textContent = `${data.total} tools found`;
      pagination.replaceChildren();
      for (const [label, page] of [
        ['Previous', data.page - 1],
        ['Next', data.page + 1],
      ]) {
        if (page < 1 || (label === 'Next' && data.page * data.limit >= data.total)) continue;
        const link = element('a', label);
        const next = new URLSearchParams(params);
        next.set('page', page);
        link.href = `/tools?${next}`;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          load(next);
        });
        pagination.append(link);
      }
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = error.message;
    } finally {
      if (controller === activeController) results.removeAttribute('aria-busy');
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    load(parameters());
  });
  form.addEventListener('input', (event) => {
    clearTimeout(timer);
    timer = setTimeout(() => load(parameters()), event.target.name === 'search' ? 250 : 0);
  });
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    for (const input of form.elements)
      if (input.type === 'radio') {
        input.checked = input.value === (params.get(input.name) || '');
      } else if (input.name)
        input.value = params.get(input.name) || (input.name === 'sort' ? 'newest' : '');
    load(params, false);
  });
}
