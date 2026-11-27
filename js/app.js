import {
  profile, audiences, skillGroups, projects, publications, experience, schools, trajectory,
} from "./data.js";
import { startHerd } from "./herd.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const THIS_YEAR = new Date().getFullYear();

const skillName = {};
for (const g of skillGroups) Object.assign(skillName, g.skills);
const byId = Object.fromEntries(projects.map((p) => [p.id, p]));

const STATUS_RANK = { now: 0, next: 1, recent: 2, past: 3 };
const sortedProjects = [...projects].sort(
  (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || (b.start > a.start ? 1 : -1)
);

const state = { domain: "all", skill: null, pubKind: "all" };

/* Helpers ---------------------------------------------------------------- */
function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
function dateRange(p) {
  if (p.status === "now") return `Ongoing since ${fmtMonth(p.start)}`;
  if (p.status === "next") return "Upcoming";
  const [ys, ms] = p.start.split("-").map(Number);
  const [ye, me] = (p.end || p.start).split("-").map(Number);
  if (ys === ye && ms === me) return fmtMonth(p.start);
  if (ys === ye) return `${MONTHS[ms - 1]} – ${MONTHS[me - 1]} ${ye}`;
  return `${fmtMonth(p.start)} – ${fmtMonth(p.end)}`;
}
function statusLabel(p) {
  return { now: "Ongoing", next: "Upcoming", recent: "Recent", past: "Completed" }[p.status];
}
function years(p) {
  const s = Number(p.start.slice(0, 4));
  const e = p.end ? Number(p.end.slice(0, 4)) : THIS_YEAR;
  const out = [];
  for (let y = s; y <= e; y++) out.push(y);
  return out;
}
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 13), 1597334677)) >>> 0) / 4294967296;
}

// A generated "figure" for projects without a picture, drawn from the project's domain.
function plateSVG(p) {
  const r = seeded(p.id);
  const c = { Manipulation: "var(--blue)", "Multi-agent": "var(--red)", Perception: "var(--orange)", Systems: "var(--green)" }[p.domain] || "var(--blue)";
  let g = "";
  if (p.domain === "Multi-agent") {
    const pts = Array.from({ length: 9 }, () => [20 + r() * 280, 12 + r() * 120]);
    pts.forEach((a, i) => pts.slice(i + 1).forEach((b) => {
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 110) g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-opacity=".35"/>`;
    }));
    pts.forEach(([x, y], i) => (g += i % 3 === 0 ? `<path d="M${x + 6} ${y} L${x - 4} ${y + 5} L${x - 4} ${y - 5}Z" fill="${c}"/>` : `<circle cx="${x}" cy="${y}" r="3" fill="var(--ink-2)" fill-opacity=".6"/>`));
  } else if (p.domain === "Manipulation") {
    const bx = 60 + r() * 60, by = 140;
    let x = bx, y = by, a = -Math.PI / 2;
    let d = `M${x} ${y}`;
    for (let i = 0; i < 3; i++) { a += (r() - 0.3) * 1.3; x += Math.cos(a) * (55 - i * 10); y += Math.sin(a) * (55 - i * 10); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".55"/>`;
    g += `<circle cx="${bx}" cy="${by}" r="8" fill="${c}" fill-opacity=".3"/>`;
    for (let i = 0; i < 6; i++) g += `<path d="M${150 + i * 26} ${90 - Math.sin(i) * 30} q 13 -${10 + r() * 20} 26 0" fill="none" stroke="var(--ink-2)" stroke-opacity=".3" stroke-dasharray="3 4"/>`;
  } else if (p.domain === "Perception") {
    for (let i = 0; i < 5; i++) g += `<rect x="${170 + i * 9}" y="${20 + i * 9}" width="${120 - i * 18}" height="${100 - i * 18}" fill="none" stroke="${c}" stroke-opacity="${0.15 + i * 0.08}"/>`;
    for (let i = 0; i < 24; i++) g += `<rect x="${20 + (i % 6) * 18}" y="${30 + Math.floor(i / 6) * 18}" width="14" height="14" fill="${c}" fill-opacity="${(r() * 0.45).toFixed(2)}"/>`;
  } else {
    let y = 30;
    for (let i = 0; i < 5; i++) {
      const x1 = 20 + r() * 80, x2 = x1 + 60 + r() * 120;
      g += `<path d="M${x1} ${y} H${x2} V${y + 14} H${x2 + 40}" fill="none" stroke="${c}" stroke-opacity=".45"/><circle cx="${x2 + 40}" cy="${y + 14}" r="3" fill="${c}"/>`;
      y += 20;
    }
  }
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

function media(p, cls) {
  if (p.image) {
    const contain = p.image.includes("arch") || p.image.includes("marl") ? " contain" : "";
    return `<div class="${cls}${contain}"><img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="p-plate">${plateSVG(p)}<span>${esc(p.domain)}</span></div>`;
}

/* Hero & audience --------------------------------------------------------- */
function bindProfile() {
  document.querySelectorAll("[data-bind]").forEach((el) => (el.textContent = profile[el.dataset.bind] || ""));
  $("#email-btn").href = `mailto:${profile.email}`;
  $("#year").textContent = THIS_YEAR;
}

function setAudience(key, { animate = true } = {}) {
  const a = audiences[key] || audiences.recruiter;
  document.querySelectorAll("[data-audience]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.audience === key)));
  const lede = $("#lede"), pts = $("#points");
  lede.textContent = a.lede;
  pts.innerHTML = a.points.map((t) => `<li>${esc(t)}</li>`).join("");
  if (animate) for (const el of [lede, pts]) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
  // reorder sections for this reader
  const host = $("#sections");
  a.order.forEach((k) => { const s = host.querySelector(`[data-key="${k}"]`); if (s) host.appendChild(s); });
  // keep the nav in the same order as the page
  const ul = $(".nav-list"), cta = ul.lastElementChild;
  a.order.forEach((k) => { const li = ul.querySelector(`a[href="#${k}"]`)?.parentElement; if (li) ul.insertBefore(li, cta); });
  try { localStorage.setItem("audience", key); } catch {}
  const url = new URL(location.href);
  url.searchParams.set("for", key === "scholar" ? "research" : "hiring");
  history.replaceState(null, "", url);
}

function initAudience() {
  const q = new URLSearchParams(location.search).get("for");
  let key = q === "research" ? "scholar" : q === "hiring" ? "recruiter" : null;
  if (!key) { try { key = localStorage.getItem("audience"); } catch {} }
  setAudience(audiences[key] ? key : "recruiter", { animate: false });
  document.querySelectorAll("[data-audience]").forEach((b) => b.addEventListener("click", () => setAudience(b.dataset.audience)));
  // arrow keys inside the radio group
  $(".seg").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const btns = [...document.querySelectorAll("[data-audience]")];
    const i = btns.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
    n.focus(); setAudience(n.dataset.audience);
  });
}

/* Now -------------------------------------------------------------------- */
function renderNow() {
  $("#now-grid").innerHTML = projects
    .filter((p) => p.status === "now" || p.status === "next")
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])
    .map((p) => `
      <button type="button" class="now-card ${p.status === "next" ? "is-next" : ""}" data-open="${p.id}" aria-haspopup="dialog">
        ${media(p, "now-media")}
        <div class="now-body">
          ${p.status === "next" ? `<span class="soon">Up next</span>` : `<span class="live">${esc(dateRange(p))}</span>`}
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.tagline)}</p>
          <div class="chips">${p.skills.slice(0, 4).map((s) => `<span class="chip">${esc(skillName[s])}</span>`).join("")}</div>
          <span class="more">Read the full write-up</span>
        </div>
      </button>`)
    .join("");
}

/* Trajectory -------------------------------------------------------------- */
function renderTrajectory() {
  const link = (it) => (it.project && byId[it.project] ? `<a href="#project/${it.project}" data-open="${it.project}">${esc(it.text)}</a>` : esc(it.text));
  $("#traj").innerHTML = `
    <li class="phase-past">
      <h3>Past</h3><p class="phase-sub">2022 to 2025</p>
      <ul>${trajectory.past.map((it) => `<li><span class="when">${esc(it.when)}</span><span>${esc(it.text)}</span></li>`).join("")}</ul>
    </li>
    <li class="phase-now">
      <h3><span class="live" aria-hidden="true"></span>Now</h3><p class="phase-sub">${MONTHS[new Date().getMonth()]} ${THIS_YEAR}</p>
      <ul>${trajectory.now.map((it) => `<li><span class="dot" aria-hidden="true"></span><span>${link(it)}</span></li>`).join("")}</ul>
    </li>
    <li class="phase-next">
      <h3>Next</h3><p class="phase-sub">Plans, not results</p>
      <ul>${trajectory.next.map((it) => `<li><span class="dot" aria-hidden="true"></span><span>${link(it)}</span></li>`).join("")}</ul>
    </li>`;
}

/* Projects --------------------------------------------------------------- */
function renderProjectFilters() {
  const domains = ["all", ...new Set(projects.map((p) => p.domain))];
  $("#proj-filters").innerHTML = domains
    .map((d) => {
      const n = d === "all" ? projects.length : projects.filter((p) => p.domain === d).length;
      return `<button type="button" class="f-btn" data-domain="${esc(d)}" aria-pressed="${d === state.domain}">${d === "all" ? "All" : esc(d)}<span class="n">${n}</span></button>`;
    })
    .join("");
  $("#proj-filters").onclick = (e) => {
    const b = e.target.closest("[data-domain]");
    if (!b) return;
    state.domain = b.dataset.domain;
    document.querySelectorAll("[data-domain]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    applyProjectFilter();
  };
}

function renderProjects() {
  $("#proj-grid").innerHTML = sortedProjects
    .map((p) => `
      <button type="button" class="p-card" data-open="${p.id}" data-id="${p.id}" aria-haspopup="dialog">
        ${media(p, "p-media")}
        <div class="p-body">
          <div class="p-meta"><span class="p-status ${p.status === "now" ? "now" : ""}">${statusLabel(p)}</span><span>${esc(p.status === "now" || p.status === "next" ? fmtMonth(p.start) : dateRange(p))}</span></div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.tagline)}</p>
        </div>
      </button>`)
    .join("");
}

function applyProjectFilter() {
  let shown = 0;
  document.querySelectorAll(".p-card").forEach((el) => {
    const p = byId[el.dataset.id];
    const ok = (state.domain === "all" || p.domain === state.domain) && (!state.skill || p.skills.includes(state.skill));
    el.hidden = !ok;
    el.classList.toggle("hit", ok && !!state.skill);
    if (ok) shown++;
  });
  const note = $("#filter-note");
  if (state.skill) {
    note.innerHTML = `Showing ${shown} project${shown === 1 ? "" : "s"} that use <strong>${esc(skillName[state.skill])}</strong>. <button type="button" id="clear-skill">Clear skill filter</button>`;
    $("#clear-skill").onclick = () => selectSkill(null);
  } else {
    note.textContent = state.domain === "all" ? "" : `Showing ${shown} ${state.domain.toLowerCase()} project${shown === 1 ? "" : "s"}.`;
  }
}

/* Skills ----------------------------------------------------------------- */
function renderSkills() {
  const first = Math.min(...projects.map((p) => Number(p.start.slice(0, 4))));
  const span = [];
  for (let y = first; y <= THIS_YEAR; y++) span.push(y);
  $("#yr-scale").innerHTML = span.map((y) => `<span>’${String(y).slice(2)}</span>`).join("");

  $("#skill-groups").innerHTML = skillGroups
    .map((g) => {
      const rows = Object.entries(g.skills)
        .map(([id, name]) => {
          const used = projects.filter((p) => p.skills.includes(id));
          const perYear = span.map((y) => used.filter((p) => years(p).includes(y)).length);
          return { id, name, used, perYear };
        })
        .sort((a, b) => b.used.length - a.used.length);
      return `<div class="sg"><h3>${esc(g.name)}</h3>${rows
        .map((r) => `
          <button type="button" class="sk" data-skill="${r.id}" aria-pressed="false"
            aria-label="${esc(r.name)}: used in ${r.used.length} projects. Show them.">
            <span class="sk-name">${esc(r.name)}</span>
            <span class="sk-years" aria-hidden="true">${r.perYear.map((n, i) => `<i data-l="${Math.min(n, 3)}" title="${span[i]}: ${n} project${n === 1 ? "" : "s"}"></i>`).join("")}</span>
            <span class="sk-count">${r.used.length} project${r.used.length === 1 ? "" : "s"}</span>
          </button>`)
        .join("")}</div>`;
    })
    .join("");
  $("#skill-groups").onclick = (e) => {
    const b = e.target.closest("[data-skill]");
    if (!b) return;
    selectSkill(state.skill === b.dataset.skill ? null : b.dataset.skill, true);
  };
}

function selectSkill(id, scroll = false) {
  state.skill = id;
  document.querySelectorAll("[data-skill]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.skill === id)));
  applyProjectFilter();
  if (id && scroll) $("#projects").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/* Publications ----------------------------------------------------------- */
function bibtex(p, i) {
  const first = p.authors.split(",")[0].trim().split(" ").pop().toLowerCase();
  const key = `${first}${p.year}${p.title.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}`;
  const type = p.kind === "Journal" ? "article" : "inproceedings";
  const venueField = p.kind === "Journal" ? "journal" : "booktitle";
  const authors = p.authors.split(",").map((a) => a.trim()).join(" and ");
  return [
    `@${type}{${key},`,
    `  title = {${p.title}},`,
    `  author = {${authors}},`,
    `  ${venueField} = {${p.venue}},`,
    `  year = {${p.year}},`,
    p.pages ? `  pages = {${p.pages.replace("–", "--")}},` : null,
    p.doi ? `  doi = {${p.doi}},` : null,
    `}`,
  ].filter(Boolean).join("\n");
}

function renderPubs() {
  const kinds = ["all", ...new Set(publications.map((p) => p.kind))];
  const journals = publications.filter((p) => p.kind === "Journal").length;
  $("#pub-sub").textContent = `${publications.length} peer-reviewed papers since ${Math.min(...publications.map((p) => p.year))}: ${journals} journal, ${publications.length - journals} conference and workshop. Copy any citation as BibTeX.`;
  $("#pub-filters").innerHTML = kinds
    .map((k) => {
      const n = k === "all" ? publications.length : publications.filter((p) => p.kind === k).length;
      return `<button type="button" class="f-btn" data-kind="${k}" aria-pressed="${k === "all"}">${k === "all" ? "All" : k}<span class="n">${n}</span></button>`;
    })
    .join("");
  $("#pubs").innerHTML = publications
    .map((p, i) => {
      const authors = esc(p.authors).replace("S. S. Jha", "<b>S. S. Jha</b>");
      const link = p.doi ? `https://doi.org/${p.doi}` : p.url;
      return `
      <li class="pub" data-kind="${p.kind}">
        <span class="pub-year">${p.year}</span>
        <div>
          <p class="pub-title">${esc(p.title)}</p>
          <p class="pub-authors">${authors}</p>
          <p class="pub-venue">${esc(p.venue)}${p.pages ? `, pp. ${esc(p.pages)}` : ""}</p>
          ${p.note ? `<span class="pub-note">${esc(p.note)}</span>` : ""}
        </div>
        <div class="pub-actions">
          ${link ? `<a class="mini" href="${esc(link)}" target="_blank" rel="noopener">${p.doi ? "DOI" : "ACL Anthology"}<span class="visually-hidden"> for ${esc(p.title)}</span></a>` : ""}
          <button type="button" class="mini" data-bib="${i}">Copy BibTeX</button>
        </div>
      </li>`;
    })
    .join("");
  $("#pub-filters").onclick = (e) => {
    const b = e.target.closest("[data-kind]");
    if (!b) return;
    document.querySelectorAll("[data-kind].f-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.querySelectorAll(".pub").forEach((li) => (li.hidden = !(b.dataset.kind === "all" || li.dataset.kind === b.dataset.kind)));
  };
  $("#pubs").onclick = async (e) => {
    const b = e.target.closest("[data-bib]");
    if (!b) return;
    const text = bibtex(publications[Number(b.dataset.bib)]);
    try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; }
    catch { window.prompt("Copy this BibTeX entry:", text); }
    setTimeout(() => (b.textContent = "Copy BibTeX"), 1800);
  };
}

/* Experience ------------------------------------------------------------- */
function renderExperience() {
  const kindLabel = { education: "Education", industry: "Industry", research: "Research" };
  $("#exp").innerHTML = experience
    .map((x) => `
      <li>
        <span class="when">${esc(x.when)}</span>
        <div>
          <p class="t">${esc(x.title)}<span class="kind">${kindLabel[x.kind]}</span></p>
          <p class="o">${esc(x.org)}</p>
          ${x.detail ? `<p class="d">${esc(x.detail)}</p>` : ""}
        </div>
      </li>`)
    .join("");
  $("#bio").innerHTML = profile.bio.map((t) => `<p>${esc(t)}</p>`).join("");
  $("#schools").innerHTML = schools.map((s) => `<li><span class="w">${esc(s.when)}</span><span>${esc(s.name)}</span></li>`).join("");
}

/* Live GitHub activity ---------------------------------------------------- */
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, n] of units) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? "s" : ""} ago`; }
  return "just now";
}

async function renderGitHub() {
  const el = $("#gh");
  const user = profile.githubUser;
  const fallback = () => (el.innerHTML = `<li class="muted">See <a href="${esc(profile.links.github)}">all repositories on GitHub</a>.</li>`);
  try {
    let repos;
    const cached = sessionStorage.getItem("gh-repos");
    if (cached) repos = JSON.parse(cached);
    else {
      const res = await fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=12`, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(res.status);
      repos = (await res.json())
        .filter((r) => !r.fork && r.name.toLowerCase() !== `${user.toLowerCase()}.github.io` && r.name !== user)
        .slice(0, 5)
        .map((r) => ({ name: r.name, url: r.html_url, pushed: r.pushed_at, desc: r.description, lang: r.language }));
      sessionStorage.setItem("gh-repos", JSON.stringify(repos));
    }
    if (!repos.length) return fallback();
    el.innerHTML =
      repos
        .map((r) => `<li><span class="w">${esc(ago(r.pushed))}</span><span><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>${r.desc ? `<small>${esc(r.desc)}</small>` : ""}</span></li>`)
        .join("") + `<li class="muted"><a href="${esc(profile.links.github)}" target="_blank" rel="noopener">All repositories</a></li>`;
  } catch {
    fallback();
  }
}

/* Contact & CV ------------------------------------------------------------ */
async function renderContact() {
  const L = profile.links;
  const items = [
    { href: `mailto:${profile.email}`, label: "Email", sub: profile.email },
    { href: `mailto:${profile.academicEmail}`, label: "Academic email", sub: profile.academicEmail },
    { href: L.github, label: "GitHub", sub: "@" + profile.githubUser },
    { href: L.linkedin, label: "LinkedIn", sub: "Shirish Shekhar Jha" },
    L.scholar ? { href: L.scholar, label: "Google Scholar", sub: "Citations" } : null,
  ].filter(Boolean);
  const render = (cv) => {
    $("#contact-list").innerHTML = [...items, cv ? { href: profile.cv, label: "Download CV", sub: "PDF", download: true } : null]
      .filter(Boolean)
      .map((i) => `<li><a href="${esc(i.href)}" ${i.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""} ${i.download ? "download" : ""}>${esc(i.label)}<span class="sub">${esc(i.sub)}</span></a></li>`)
      .join("");
  };
  render(false);
  // Show the CV only if the file has been added to the repository.
  try {
    const res = await fetch(profile.cv, { method: "HEAD" });
    if (res.ok && (res.headers.get("content-type") || "").includes("pdf")) {
      const btn = $("#cv-btn");
      btn.href = profile.cv; btn.hidden = false;
      render(true);
    }
  } catch {}
}

/* Project dialog ---------------------------------------------------------- */
const dlg = $("#proj-dialog");
let lastFocus = null;

function openProject(id, { push = true } = {}) {
  const p = byId[id];
  if (!p) return;
  lastFocus = document.activeElement;
  const gallery = p.gallery || (p.image ? [{ src: p.figure && p.figure.endsWith(".svg") ? p.figure : p.image, alt: p.imageAlt }] : []);
  $("#dlg-body").innerHTML = `
    <p class="d-status">${statusLabel(p)}, ${esc(dateRange(p).replace(/^Ongoing since /, "since "))}. ${esc(p.domain)}</p>
    <h2 id="dlg-title">${esc(p.title)}</h2>
    <p class="d-tag">${esc(p.tagline)}</p>
    ${gallery.length ? `<div class="d-gallery ${gallery.length > 1 ? "two" : ""}">${gallery
      .map((g) => `<figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy"><figcaption>${esc(g.alt)}</figcaption></figure>`)
      .join("")}</div>` : ""}
    <div class="d-cols">
      <div>
        <section><h3>About the project</h3><p>${esc(p.summary)}</p></section>
        <section><h3>What I built</h3><ul class="d-built">${p.built.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></section>
      </div>
      <div>
        <section><h3>My role</h3><p>${esc(p.role)}</p></section>
        ${p.honesty ? `<section><h3>Status</h3><p class="d-honest">${esc(p.honesty)}</p></section>` : ""}
        <section><h3>Skills used</h3><div class="chips">${p.skills.map((s) => `<span class="chip">${esc(skillName[s])}</span>`).join("")}</div></section>
        ${p.links.length ? `<section><h3>Links</h3><div class="d-links">${p.links.map((l) => `<a class="mini" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div></section>` : ""}
      </div>
    </div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  $("#dlg-close").focus();
  if (push) history.pushState({ project: id }, "", `#project/${id}`);
}

function closeProject() {
  if (dlg.open) dlg.close();
}

function initDialog() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]");
    if (!t) return;
    e.preventDefault();
    openProject(t.dataset.open);
  });
  $("#dlg-close").addEventListener("click", closeProject);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeProject(); });
  dlg.addEventListener("close", () => {
    if (location.hash.startsWith("#project/")) history.replaceState(null, "", location.pathname + location.search);
    lastFocus?.focus?.();
  });
  window.addEventListener("popstate", () => {
    const m = location.hash.match(/^#project\/(.+)$/);
    if (m) openProject(m[1], { push: false }); else closeProject();
  });
  const m = location.hash.match(/^#project\/(.+)$/);
  if (m) openProject(m[1], { push: false });
}

/* Header ---------------------------------------------------------------- */
function initHeader() {
  const h = $(".site-header");
  const onScroll = () => h.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const links = [...document.querySelectorAll(".nav-list a[href^='#']")];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${en.target.id}`)));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => io.observe(s));
}

/* Boot ------------------------------------------------------------------- */
bindProfile();
initAudience();
renderNow();
renderTrajectory();
renderProjectFilters();
renderProjects();
renderSkills();
renderPubs();
renderExperience();
renderContact();
initDialog();
initHeader();
renderGitHub();
startHerd($("#herd"), {
  toggleBtn: $("#sim-toggle"),
  onStat: (n, total) => ($("#sim-stat").textContent = `${n} of ${total} in the goal.`),
});
