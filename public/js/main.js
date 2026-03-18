// ============================================================
// King Candy — Landing Snacks Importados
// main.js  (vanilla JS, sin dependencias externas)
// ============================================================

// --- Navbar scroll effect ---
const navbar = document.getElementById('navbar');

if (navbar) {
  const handleScroll = () => {
    if (window.scrollY > 24) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  // Evaluar estado inicial (por si la página carga con scroll)
  handleScroll();
}

// --- Año actual en el footer ---
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// --- Smooth scroll para anclas internas ---
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
