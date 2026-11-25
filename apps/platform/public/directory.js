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
        if (tool.category) card.append(element('span', tool.category.name, 'tag'));
        const heading = element('h3');
        const landing = element('a', tool.name);
        landing.href = `/tools/${encodeURIComponent(tool.slug)}`;
        heading.append(landing);
        card.append(heading, element('p', tool.tagline));
        const tags = element('div', '', 'tags');
        for (const tag of tool.tags) tags.append(element('span', tag.name, 'tag'));
        const open = element('a', 'Open tool ↗', 'tool-open');
        open.href = tool.url;
        card.append(tags, open);
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
      if (input.name)
        input.value = params.get(input.name) || (input.name === 'sort' ? 'newest' : '');
    load(params, false);
  });
}
