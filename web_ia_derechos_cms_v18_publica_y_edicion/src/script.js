
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const links = [...document.querySelectorAll('.main-nav a')];
const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(link => link.classList.toggle(
        'active',
        link.getAttribute('href') === '#' + entry.target.id
      ));
    }
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach(section => observer.observe(section));

document.querySelectorAll('.filter-group').forEach(group => {
  const targetSelector = group.dataset.filterTarget;
  const attribute = group.dataset.filterAttribute;

  group.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
      group.querySelectorAll('.filter-button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;
      document.querySelectorAll(targetSelector).forEach(card => {
        const value = card.dataset[attribute];
        card.hidden = !(filter === 'all' || value === filter);
      });
    });
  });
});

// Acceso privado mediante Netlify Identity.
(function () {
  const userLabel = document.getElementById("identity-user");
  const logoutButton = document.getElementById("logout-button");
  const localPreview = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";

  function goToLogin() {
    if (!localPreview) window.location.replace("/login/");
  }

  function showUser(user) {
    if (userLabel) userLabel.textContent = user && user.email ? user.email : (localPreview ? "Vista local" : "");
  }

  if (!window.netlifyIdentity) {
    showUser(null);
    return;
  }

  window.netlifyIdentity.setLocale("es");
  window.netlifyIdentity.on("init", function (user) {
    if (!user) {
      goToLogin();
      showUser(null);
      return;
    }
    showUser(user);
  });

  window.netlifyIdentity.on("login", async function (user) {
    try { await window.netlifyIdentity.refresh(); } catch (error) {}
    showUser(user);
    window.netlifyIdentity.close();
  });

  window.netlifyIdentity.on("logout", goToLogin);

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      if (localPreview) {
        alert("En la vista local no hay una sesión real. El cierre de sesión funcionará al publicar en Netlify.");
      } else {
        window.netlifyIdentity.logout();
      }
    });
  }
})();
