// =========================================================================
// UNIMED GLOBAL - SYSTEM THEME PERSISTENCE ENGINE
// =========================================================================
(function() {
  // Apply saved theme immediately in the head block to prevent white flashes
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const htmlEl = document.documentElement;
  
  if (savedTheme === 'light') {
    htmlEl.classList.add('light-theme');
  } else {
    htmlEl.classList.remove('light-theme');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;

  // Single button theme toggle click listener
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = htmlEl.classList.contains('light-theme');
      if (isLight) {
        localStorage.setItem('theme', 'dark');
        htmlEl.classList.remove('light-theme');
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: 'dark' } }));
      } else {
        localStorage.setItem('theme', 'light');
        htmlEl.classList.add('light-theme');
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: 'light' } }));
      }
    });
  }
});
