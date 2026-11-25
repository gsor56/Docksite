const copy = document.querySelector('#copy-link');
if (copy)
  copy.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(copy.dataset.url);
      status.textContent = 'URL copied.';
      await fetch(copy.dataset.endpoint, {
        method: 'POST',
        headers: { 'x-csrf-token': copy.dataset.token },
      });
    } catch {
      status.textContent = 'Copy was unavailable. Select and copy the URL above.';
    }
  });
