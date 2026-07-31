
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const deployContext = process.env.CONTEXT || "";
const explicitMode = process.env.SITE_MODE || "";
const isPublic = explicitMode === "public" || deployContext === "production";
const buildModeLabel = isPublic ? "público" : "privado de edición";

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}
function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function readCollection(rel) {
  const folder = path.join(root, rel);
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(name => name.endsWith(".json"))
    .map(name => readJSON(path.join(rel, name)));
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
function replaceAll(template, replacements) {
  for (const [key, value] of Object.entries(replacements)) {
    template = template.split(`{{${key}}}`).join(value ?? "");
  }
  return template;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyDir(path.join(root, "static"), dist);

const site = readJSON("content/site.json");
const otrosi = readJSON("content/otrosi.json");
const multimediaSection = readJSON("content/multimedia_section.json");
const contact = readJSON("content/contact.json");
const projects = readCollection("content/projects").sort((a,b) => a.order - b.order);
const resources = readCollection("content/resources")
  .filter(item => item.published !== false)
  .sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
const multimediaItems = readCollection("content/multimedia")
  .filter(item => item.published !== false)
  .sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
const notices = readCollection("content/notices").filter(item => item.published !== false);

const projectCards = projects.map(p => `
<article class="project-card">
  <span class="card-number">${String(p.order).padStart(2,"0")}</span>
  <p class="card-kind">${escapeHTML(p.kind)}</p>
  <h3>${escapeHTML(p.acronym)}</h3>
  <p>${escapeHTML(p.card_text)}</p>
  <a href="#${escapeHTML(p.acronym.toLowerCase())}">Conocer el grupo <span aria-hidden="true">→</span></a>
</article>`).join("\n");

function resourceCard(r, compact=false) {
  const summary = r.summary ? `<small>${escapeHTML(r.summary)}</small>` : "";
  if (compact) {
    return `<a class="result-card" href="${escapeHTML(r.url)}" target="_blank" rel="noopener">
      <span class="meta">${escapeHTML(r.type)}</span>
      <strong>${escapeHTML(r.title)}</strong>
      ${summary}
    </a>`;
  }
  return `<article class="resource-card${r.featured ? " featured" : ""}" data-group="${escapeHTML(r.group)}">
    <div class="resource-meta"><span>${escapeHTML(r.group)}</span><span>·</span><span>${escapeHTML(r.type)}</span></div>
    <h3>${escapeHTML(r.title)}</h3>
    <p>${escapeHTML(r.summary || "")}</p>
    ${r.url ? `<a href="${escapeHTML(r.url)}" target="_blank" rel="noopener">Consultar recurso ↗</a>` : ""}
  </article>`;
}

const projectSections = projects.map((p, idx) => {
  const slug = p.acronym.toLowerCase();
  const items = resources.filter(r => r.group === p.acronym);
  const results = items.length
    ? `<div class="result-grid">${items.map(r => resourceCard(r, true)).join("")}</div>`
    : `<p class="results-intro">Los primeros contenidos se incorporarán próximamente.</p>`;
  const tags = (p.topics || []).map(t => `<span>${escapeHTML(t)}</span>`).join("");
  return `
<section class="section project-section${idx % 2 ? " tinted" : ""}" id="${slug}">
  <div class="container project-layout">
    <aside>
      <p class="section-label">${escapeHTML(p.acronym)}</p>
      <h2>${escapeHTML(p.title)}</h2>
      <p class="tagline">${escapeHTML(p.tagline)}</p>
      <a class="institution-link" href="${escapeHTML(p.institutional_url)}" target="_blank" rel="noopener">Información institucional URJC ↗</a>
    </aside>
    <div class="project-content">
      <div class="prose">${p.body_html}</div>
      <div class="topics">${tags}</div>
      <div class="results-block">
        <h3>Resultados y actividades</h3>
        <p class="results-intro">${escapeHTML(p.results_intro)}</p>
        ${results}
      </div>
    </div>
  </div>
</section>`;
}).join("\n");

const allResources = resources.length
  ? resources.map(r => resourceCard(r, false)).join("\n")
  : `<p>No hay recursos publicados todavía.</p>`;


function youtubeEmbedURL(url = "") {
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.replace("/", "").split("/")[0];
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") || "";
      else if (parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.split("/")[2] || "";
      else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.split("/")[2] || "";
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  } catch (_) {
    return "";
  }
}

function multimediaCard(item) {
  const embed = item.embed_url || (item.platform === "YouTube" ? youtubeEmbedURL(item.url) : "");
  const visual = embed
    ? `<iframe src="${escapeHTML(embed)}" title="${escapeHTML(item.title)}" loading="lazy"
         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
         allowfullscreen></iframe>`
    : item.thumbnail
      ? `<img class="media-thumbnail" src="${escapeHTML(item.thumbnail)}" alt="">`
      : `<span class="media-placeholder" aria-hidden="true">${item.type === "Pódcast" || item.type === "Audio" ? "◉" : "▶"}</span>`;

  const date = item.date ? `<span>${escapeHTML(item.date)}</span>` : "";
  const author = item.author ? `<p class="media-card-author">${escapeHTML(item.author)}</p>` : "";
  const mainLink = item.url
    ? `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener">Abrir en ${escapeHTML(item.platform || "la plataforma")} ↗</a>`
    : "";
  const transcript = item.transcript_url
    ? `<a href="${escapeHTML(item.transcript_url)}" target="_blank" rel="noopener">Transcripción o material ↗</a>`
    : "";

  return `<article class="media-card${item.featured ? " featured" : ""}" data-type="${escapeHTML(item.type)}">
    <div class="media-embed">${visual}</div>
    <div class="media-card-body">
      <div class="media-card-meta">
        <span>${escapeHTML(item.group || "General")}</span><span>·</span>
        <span>${escapeHTML(item.type || "Multimedia")}</span>${date ? `<span>·</span>${date}` : ""}
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      ${author}
      <p class="media-card-summary">${escapeHTML(item.summary || "")}</p>
      <div class="media-card-links">${mainLink}${transcript}</div>
    </div>
  </article>`;
}

const multimediaHTML = multimediaItems.length
  ? multimediaItems.map(multimediaCard).join("\n")
  : `<div class="multimedia-empty">
      <h3>Los primeros contenidos multimedia se incorporarán próximamente</h3>
      <p>Esta sección ya está preparada para recibir vídeos de YouTube, pódcast, audios,
      conferencias grabadas y materiales audiovisuales de IAIURIS, DEHART y CXT.</p>
    </div>`;

const noticesHTML = notices.length ? notices.map(n => `
<article class="notice${n.featured ? " featured" : ""}">
  <div class="notice-date"><strong>${escapeHTML(n.date_text || "Próximamente")}</strong><span>${escapeHTML(n.location || "")}</span></div>
  <div>
    <p class="notice-type">${escapeHTML(n.type || "Aviso")}</p>
    <h3>${escapeHTML(n.title)}</h3>
    <p>${escapeHTML(n.summary || "")}${n.url ? ` <a href="${escapeHTML(n.url)}" target="_blank" rel="noopener">Más información ↗</a>` : ""}</p>
  </div>
</article>`).join("\n") : `<p>No hay avisos publicados todavía.</p>`;

const contacts = (contact.people || []).map(person => `
<address>
  <strong>${escapeHTML(person.name)}</strong>
  <span>${escapeHTML(person.position)}</span>
  <span>${escapeHTML(person.institution)}</span>
  <a href="mailto:${escapeHTML(person.email)}">${escapeHTML(person.email)}</a>
</address>`).join("\n");

let template = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
const multimediaSectionTemplate = fs.readFileSync(path.join(root, "src/multimedia-section.html"), "utf8");
const multimediaEnabled = multimediaSection.enabled === true;
const multimediaNav = multimediaEnabled
  ? '<a href="#multimedia">Multimedia</a>'
  : '';
const renderedMultimediaSection = multimediaEnabled
  ? replaceAll(multimediaSectionTemplate, {
      MULTIMEDIA_TITLE: escapeHTML(multimediaSection.title),
      MULTIMEDIA_HTML: multimediaSection.html,
      MULTIMEDIA_ITEMS: multimediaHTML
    })
  : '';

const privateSessionControls = `<div class="session-controls" aria-label="Sesión privada">
        <span class="private-pill">Versión de pruebas</span>
        <span id="identity-user" class="identity-user" aria-live="polite"></span>
        <button id="logout-button" class="logout-button" type="button">Cerrar sesión</button>
      </div>`;

const privateNotice = `<div class="private-notice" role="status">
    <div>
      <strong>Versión privada de revisión</strong>
      <span>Los cambios de esta rama todavía no están publicados en la web principal.</span>
    </div>
  </div>`;

let rendered = replaceAll(template, {
  META_DESCRIPTION: escapeHTML(site.hero_intro),
  DOCUMENT_TITLE: `${isPublic ? "" : "Área privada · "}${escapeHTML(site.page_title)}`,
  ROBOTS_META: isPublic
    ? '<meta name="robots" content="index,follow">'
    : '<meta name="robots" content="noindex,nofollow,noarchive">',
  IDENTITY_SCRIPT: '<script defer src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>',
  SESSION_CONTROLS: isPublic ? "" : privateSessionControls,
  PRIVATE_NOTICE: isPublic ? "" : privateNotice,
  FOOTER_STATUS: isPublic
    ? "Universidad Rey Juan Carlos · 2026"
    : "Versión privada de revisión · 2026",
  ADMIN_LINK: isPublic ? "" : '<a href="/admin/">Panel de edición</a>',
  BRAND_TITLE: escapeHTML(site.brand_title),
  INSTITUTION: escapeHTML(site.institution),
  EYEBROW: escapeHTML(site.eyebrow),
  PAGE_TITLE: escapeHTML(site.page_title),
  HERO_INTRO: escapeHTML(site.hero_intro),
  WELCOME_TITLE: escapeHTML(site.welcome_title),
  WELCOME_HTML: site.welcome_html,
  COMMITMENT_TITLE: escapeHTML(site.commitment_title),
  COMMITMENT_HTML: site.commitment_html,
  PROJECT_CARDS: projectCards,
  PROJECT_SECTIONS: projectSections,
  OTROSI_TITLE: escapeHTML(otrosi.title),
  OTROSI_HTML: otrosi.html,
  ALL_RESOURCES: allResources,
  MULTIMEDIA_NAV: multimediaNav,
  MULTIMEDIA_SECTION: renderedMultimediaSection,
  NOTICES: noticesHTML,
  FUNDING_TITLE: escapeHTML(site.funding_title),
  FUNDING_HTML: site.funding_html,
  AI_TITLE: escapeHTML(site.ai_title),
  AI_HTML: site.ai_html,
  CONTACT_INTRO: escapeHTML(contact.intro),
  CONTACT_PEOPLE: contacts,
  CONTACT_CLOSING: escapeHTML(contact.closing)
});

if (isPublic) {
  fs.writeFileSync(path.join(dist, "index.html"), rendered);
} else {
  fs.mkdirSync(path.join(dist, "privado"), { recursive: true });
  fs.writeFileSync(path.join(dist, "privado/index.html"), rendered);
}

// Vista previa local: mismas páginas y estilos, pero con rutas relativas.
// Esta copia NO se usa en Netlify.
let localPreview = rendered
  .replaceAll('href="/assets/favicon.png"', 'href="assets/favicon.png"')
  .replaceAll('href="/styles.css"', 'href="styles.css"')
  .replaceAll('src="/assets/logo-oteiza.png"', 'src="assets/logo-oteiza.png"')
  .replaceAll('src="/script.js"', 'src="script.js"')
  .replaceAll('href="/admin/"', 'href="admin/index.html"')
  .replaceAll('href="/privado/"', 'href="VISTA_PREVIA_LOCAL.html"')
  .replaceAll('href="/login/"', 'href="login/index.html"')
  .replace('  <script defer src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>\n', '')
  .replace('<title>Área privada ·', '<title>Vista previa local ·')
  .replace('<strong>Versión privada de revisión</strong>', '<strong>Vista previa local de la versión privada</strong>')
  .replace('<span>Este contenido todavía no está publicado oficialmente.</span>', '<span>Los colores y formatos son los mismos que se publicarán en Netlify.</span>');
fs.writeFileSync(path.join(dist, "VISTA_PREVIA_LOCAL.html"), localPreview);

fs.writeFileSync(path.join(dist, "styles.css"), fs.readFileSync(path.join(root, "src/styles.css")));
fs.writeFileSync(path.join(dist, "script.js"), fs.readFileSync(path.join(root, "src/script.js")));
fs.writeFileSync(path.join(dist, "login.css"), fs.readFileSync(path.join(root, "src/login.css")));
fs.writeFileSync(path.join(dist, "login.js"), fs.readFileSync(path.join(root, "src/login.js")));

fs.mkdirSync(path.join(dist, "login"), { recursive: true });
fs.writeFileSync(path.join(dist, "login/index.html"), fs.readFileSync(path.join(root, "src/login.html")));
fs.mkdirSync(path.join(dist, "admin"), { recursive: true });
fs.writeFileSync(path.join(dist, "admin/index.html"), fs.readFileSync(path.join(root, "src/admin.html")));
if (!isPublic) {
  fs.writeFileSync(path.join(dist, "index.html"), fs.readFileSync(path.join(root, "src/login.html")));
}

if (isPublic) {
  fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");
  fs.writeFileSync(path.join(dist, "_headers"), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);
  fs.writeFileSync(path.join(dist, "_redirects"), `/admin/*    /admin/index.html    200
`);
} else {
  fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
  fs.writeFileSync(path.join(dist, "_headers"), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
`);
  fs.writeFileSync(path.join(dist, "_redirects"), `# La raíz contiene directamente la pantalla de acceso privado.
/admin/*    /admin/index.html    200
/assets/*   /assets/:splat       200
/styles.css /styles.css          200
/script.js  /script.js           200
/login.css  /login.css           200
/login.js   /login.js            200
/robots.txt /robots.txt          200

# El contenido de la rama de edición exige el rol member.
/privado/*  /privado/:splat      200!  Role=member
/privado/*  /                     302!
`);
}

console.log(`Build completado en dist/ · modo ${buildModeLabel}`);
