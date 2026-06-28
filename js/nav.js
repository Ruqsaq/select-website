/* Mobile nav toggle.
   Opens/closes the .main-nav dropdown via .is-active class on the body.
   Wired up on every page that includes this script. */
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('is-open'));
  });

  // Close menu when a link inside the nav is tapped
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  // Close menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
