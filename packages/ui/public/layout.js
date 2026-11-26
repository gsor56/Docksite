function updateViewportWidth() {
  document.documentElement.style.setProperty(
    '--viewport-width',
    `${document.documentElement.clientWidth}px`,
  );
}
updateViewportWidth();
window.addEventListener('resize', updateViewportWidth, { passive: true });

const header = document.querySelector('.site-header');
if (header) {
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

const mobileNavigation = document.querySelector('.mobile-nav');
if (mobileNavigation) {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileNavigation.open) {
      mobileNavigation.open = false;
      mobileNavigation.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (mobileNavigation.open && !mobileNavigation.contains(event.target)) {
      mobileNavigation.open = false;
    }
  });
}

if (
  'IntersectionObserver' in window &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  document.documentElement.classList.add('motion-ready');
  const observer = new window.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.06 },
  );
  for (const section of document.querySelectorAll('[data-reveal]')) observer.observe(section);
}

const subdomainStack = document.querySelector('.subdomain-stack');
if (subdomainStack) {
  const rows = [...subdomainStack.querySelectorAll('.subdomain-row')];
  const hero = subdomainStack.closest('.hero');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const movement = [8, -6, 14, -10, 24, -18];
  let frame = null;
  let cycle = null;
  let activeIndex = 2;

  function updateParallax() {
    frame = null;
    if (document.hidden || reducedMotion.matches) return;
    const bounds = hero.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    const progress = Math.max(-1, Math.min(1, -bounds.top / window.innerHeight));
    for (const [index, row] of rows.entries()) {
      row.style.setProperty(
        '--parallax',
        `${Math.max(-24, Math.min(24, movement[index] * progress))}px`,
      );
    }
  }
  function requestParallax() {
    if (frame === null && !document.hidden && !reducedMotion.matches) {
      frame = window.requestAnimationFrame(updateParallax);
    }
  }
  function stopMotion() {
    if (cycle !== null) window.clearInterval(cycle);
    if (frame !== null) window.cancelAnimationFrame(frame);
    cycle = null;
    frame = null;
  }
  function syncMotion() {
    stopMotion();
    if (reducedMotion.matches) {
      activeIndex = 2;
      for (const [index, row] of rows.entries()) {
        row.style.setProperty('--parallax', '0px');
        row.classList.toggle('is-active', index === activeIndex);
      }
      return;
    }
    if (document.hidden) return;
    requestParallax();
    cycle = window.setInterval(() => {
      rows[activeIndex].classList.remove('is-active');
      activeIndex = (activeIndex + 1) % rows.length;
      rows[activeIndex].classList.add('is-active');
    }, 6000);
  }
  window.addEventListener('scroll', requestParallax, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();
}
