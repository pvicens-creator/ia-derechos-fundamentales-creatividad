
(function () {
  const openButton = document.getElementById("open-login");
  const enterLink = document.getElementById("enter-site");
  const logoutButton = document.getElementById("login-logout");
  const state = document.getElementById("login-state");

  function setState(message) { if (state) state.textContent = message; }
  function showSignedIn(user) {
    setState("Sesión iniciada como " + (user.email || "usuario invitado") + ".");
    openButton.classList.add("hidden");
    enterLink.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
  }
  function showSignedOut() {
    setState("Introduce el correo electrónico invitado y tu contraseña.");
    openButton.classList.remove("hidden");
    enterLink.classList.add("hidden");
    logoutButton.classList.add("hidden");
  }

  if (!window.netlifyIdentity) {
    setState("No se ha podido cargar el sistema de acceso. Recarga la página.");
    openButton.disabled = true;
    return;
  }

  window.netlifyIdentity.setLocale("es");
  window.netlifyIdentity.on("init", user => user ? showSignedIn(user) : showSignedOut());
  window.netlifyIdentity.on("login", async user => {
    try { await window.netlifyIdentity.refresh(); } catch (error) {}
    window.netlifyIdentity.close();
    window.location.assign("/privado/");
  });
  window.netlifyIdentity.on("logout", showSignedOut);
  window.netlifyIdentity.on("error", () => setState("No se pudo completar el acceso. Revisa el correo y la contraseña."));
  openButton.addEventListener("click", () => window.netlifyIdentity.open("login"));
  logoutButton.addEventListener("click", () => window.netlifyIdentity.logout());
})();
