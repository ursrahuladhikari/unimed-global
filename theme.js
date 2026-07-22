// =========================================================================
// UNIMED GLOBAL - SYSTEM THEME PERSISTENCE ENGINE
// =========================================================================
(function () {
  // Apply saved theme immediately in the head block to prevent flashes
  try {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  } catch (e) {}
})();

function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;

  if (themeToggle && !themeToggle.dataset.themeBound) {
    themeToggle.dataset.themeBound = 'true';
    themeToggle.addEventListener('click', () => {
      const isLight = htmlEl.classList.contains('light-theme');
      if (isLight) {
        try { localStorage.setItem('theme', 'dark'); } catch (e) {}
        htmlEl.classList.remove('light-theme');
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: 'dark' } }));
      } else {
        try { localStorage.setItem('theme', 'light'); } catch (e) {}
        htmlEl.classList.add('light-theme');
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: 'light' } }));
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThemeToggle);
} else {
  setupThemeToggle();
}
