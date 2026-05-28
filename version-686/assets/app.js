const MOVIES = window.MOVIES || [];

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toBase64Unicode(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function pickColors(seed) {
  const palette = [
    ["#f59e0b", "#78350f"],
    ["#fb7185", "#6d28d9"],
    ["#22c55e", "#0f766e"],
    ["#60a5fa", "#1d4ed8"],
    ["#f97316", "#7c2d12"],
    ["#e879f9", "#6b21a8"],
    ["#34d399", "#064e3b"],
    ["#facc15", "#a16207"]
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function wrapTitle(title, maxChars, maxLines) {
  const chars = Array.from(title);
  if (chars.length <= maxChars) {
    return [title];
  }
  const lines = [];
  let start = 0;
  while (start < chars.length && lines.length < maxLines) {
    const end = Math.min(start + maxChars, chars.length);
    lines.push(chars.slice(start, end).join(""));
    start = end;
  }
  if (start < chars.length) {
    lines[lines.length - 1] += "…";
  }
  return lines;
}

function posterData(movie, wide = false) {
  const [c1, c2] = pickColors(`${movie.id}-${movie.title}`);
  const width = wide ? 960 : 900;
  const height = wide ? 540 : 1350;
  const titleLines = wrapTitle(movie.title, wide ? 12 : 8, wide ? 2 : 3);
  const titleY = wide ? 260 : 380;
  const titleStep = wide ? 70 : 110;
  const lines = titleLines.map((line, index) => (
    `<tspan x="80" y="${titleY + (index * titleStep)}">${escapeHTML(line)}</tspan>`
  )).join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
        <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.14)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="32"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#08111f"/>
      <circle cx="${Math.round(width * 0.8)}" cy="${Math.round(height * 0.22)}" r="${Math.round(Math.min(width, height) * 0.28)}" fill="${c1}" opacity="0.25" filter="url(#blur)"/>
      <circle cx="${Math.round(width * 0.2)}" cy="${Math.round(height * 0.78)}" r="${Math.round(Math.min(width, height) * 0.22)}" fill="${c2}" opacity="0.22" filter="url(#blur)"/>
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="${wide ? 32 : 48}" fill="url(#g)" opacity="0.95"/>
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="${wide ? 32 : 48}" fill="url(#overlay)"/>
      <rect x="${wide ? 80 : 70}" y="${wide ? 70 : 80}" width="${wide ? 180 : 220}" height="52" rx="26" fill="rgba(255,255,255,0.16)"/>
      <text x="${wide ? 170 : 180}" y="${wide ? 105 : 114}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="28" fill="#fff" text-anchor="middle">亚洲热映</text>
      <text x="80" y="${wide ? 180 : 240}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${wide ? 28 : 34}" fill="rgba(255,255,255,0.85)" letter-spacing="3">MOVIE</text>
      <text x="80" y="${wide ? titleY - 40 : 300}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${wide ? 24 : 30}" fill="rgba(255,255,255,0.7)">${escapeHTML(movie.year)} · ${escapeHTML(movie.genre.slice(0, 20))}</text>
      <text x="80" y="${wide ? height - 120 : height - 180}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${wide ? 20 : 28}" fill="rgba(255,255,255,0.78)">精选影片 · 静态站点</text>
      <text x="80" y="${wide ? height - 70 : height - 120}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${wide ? 22 : 32}" fill="#fff" font-weight="700">${lines}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${toBase64Unicode(svg)}`;
}

function movieScore(movie) {
  const base = (movie.score || 0) + (movie.year || 0) * 10;
  return base;
}

function buildCard(movie, extraClass = "") {
  const tags = (movie.tags || []).slice(0, 3).map(tag => `<span>${escapeHTML(tag)}</span>`).join("");
  return `
    <article class="movie-card ${extraClass}">
      <a href="movie/${movie.id}.html" class="movie-card__poster" aria-label="${escapeHTML(movie.title)}">
        <img loading="lazy" src="${posterData(movie)}" alt="${escapeHTML(movie.title)}海报">
      </a>
      <div class="movie-card__body">
        <h3 class="movie-card__title clamp-2">
          <a href="movie/${movie.id}.html">${escapeHTML(movie.title)}</a>
        </h3>
        <div class="movie-card__meta">
          <span class="badge">${escapeHTML(movie.regionGroup)}</span>
          <span>${escapeHTML(movie.year)}</span>
          <span>${escapeHTML(movie.genreMain || movie.genre)}</span>
        </div>
        <p class="movie-card__line clamp-3">${escapeHTML(movie.oneLine || "")}</p>
        <div class="movie-card__tags">${tags}</div>
        <div class="movie-card__foot">
          <span class="movie-card__score">热度 ${Math.round(movie.popularity || movie.score || 0)}</span>
          <a class="button button--ghost" href="movie/${movie.id}.html">查看详情</a>
        </div>
      </div>
    </article>
  `;
}

function parseTags(value) {
  return String(value || "")
    .split(/[,\s，、/|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function matchMovie(movie, keyword) {
  if (!keyword) return true;
  const haystack = [
    movie.title,
    movie.region,
    movie.regionGroup,
    movie.type,
    movie.genre,
    movie.genreMain,
    movie.oneLine,
    movie.summary,
    movie.review,
    ...(movie.tags || [])
  ].join(" ").toLowerCase();
  return keyword.toLowerCase().split(/\s+/).filter(Boolean).every(part => haystack.includes(part));
}

function sortMovies(items, sortKey) {
  const sorted = [...items];
  switch (sortKey) {
    case "year_asc":
      sorted.sort((a, b) => (a.year - b.year) || (a.id.localeCompare(b.id)));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
      break;
    case "region":
      sorted.sort((a, b) => (a.regionGroup.localeCompare(b.regionGroup, "zh-Hans-CN")) || (b.popularity - a.popularity));
      break;
    default:
      sorted.sort((a, b) => (b.popularity - a.popularity) || (b.year - a.year) || a.id.localeCompare(b.id));
      break;
  }
  return sorted;
}

function updateActiveChips() {
  const params = new URLSearchParams(location.search);
  document.querySelectorAll("[data-chip-key]").forEach((node) => {
    const key = node.getAttribute("data-chip-key");
    const value = node.getAttribute("data-chip-value");
    const current = params.get(key);
    node.classList.toggle("is-active", current === value || (!current && value === "all"));
  });
}

function renderListingPage() {
  const root = document.querySelector("[data-listing-page]");
  if (!root || !MOVIES.length) {
    return;
  }

  const params = new URLSearchParams(location.search);
  const keyword = (params.get("q") || params.get("keyword") || "").trim();
  const region = params.get("region") || "";
  const genre = params.get("genre") || "";
  const type = params.get("type") || "";
  const sort = params.get("sort") || root.getAttribute("data-default-sort") || "score";
  const pageSize = Math.max(12, Number(params.get("pageSize") || root.getAttribute("data-page-size") || 36));
  const page = Math.max(1, Number(params.get("page") || 1));

  let items = [...MOVIES];

  if (keyword) {
    items = items.filter(movie => matchMovie(movie, keyword));
  }

  if (region) {
    items = items.filter(movie => movie.regionGroup === region || movie.region.includes(region));
  }

  if (genre) {
    items = items.filter(movie => movie.genre.includes(genre) || movie.genreMain === genre);
  }

  if (type) {
    items = items.filter(movie => movie.type.includes(type));
  }

  items = sortMovies(items, sort);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  const grid = document.querySelector("[data-listing-grid]");
  if (grid) {
    grid.innerHTML = slice.map(movie => buildCard(movie)).join("") || `
      <div class="article" style="grid-column:1/-1">
        <h3>没有找到匹配的影片</h3>
        <p>试试换个关键词，或切换地区 / 题材筛选。</p>
      </div>
    `;
  }

  const countEl = document.querySelector("[data-result-count]");
  if (countEl) {
    countEl.textContent = `共 ${total} 部影片`;
  }

  const metaEl = document.querySelector("[data-result-meta]");
  if (metaEl) {
    const parts = [];
    if (keyword) parts.push(`关键词「${keyword}」`);
    if (region) parts.push(`地区「${region}」`);
    if (genre) parts.push(`题材「${genre}」`);
    if (type) parts.push(`类型「${type}」`);
    metaEl.textContent = parts.length ? parts.join(" · ") : "浏览全部影片";
  }

  const pagination = document.querySelector("[data-pagination]");
  if (pagination) {
    const buildHref = (p) => {
      const next = new URLSearchParams(params);
      next.set("page", String(p));
      return `${location.pathname}?${next.toString()}`;
    };
    let html = "";
    const prev = Math.max(1, safePage - 1);
    const next = Math.min(totalPages, safePage + 1);
    html += `<a href="${buildHref(prev)}" aria-label="上一页">上一页</a>`;
    for (let i = Math.max(1, safePage - 2); i <= Math.min(totalPages, safePage + 2); i += 1) {
      html += `<a href="${buildHref(i)}" class="${i === safePage ? "is-active" : ""}">${i}</a>`;
    }
    html += `<a href="${buildHref(next)}" aria-label="下一页">下一页</a>`;
    pagination.innerHTML = html;
  }

  updateActiveChips();
}

function bindSearchForms() {
  const current = new URLSearchParams(location.search).get("q") || "";
  document.querySelectorAll("[data-search-input]").forEach((input) => {
    if (input instanceof HTMLInputElement && !input.value && current) {
      input.value = current;
    }
  });

  document.querySelectorAll("[data-search-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input[name='q']") || form.querySelector("[data-search-input]");
      const value = (input?.value || "").trim();
      const url = new URL("search.html", location.href);
      if (value) {
        url.searchParams.set("q", value);
      }
      location.href = url.toString();
    });
  });
}

function setupMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) {
    return;
  }
  toggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", nav.classList.contains("is-open") ? "true" : "false");
  });
}

function initSmoothLinks() {
  document.querySelectorAll("[data-link-top]").forEach((link) => {
    link.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function markCategoryLinks() {
  const pathname = location.pathname;
  document.querySelectorAll(".nav a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === pathname || (pathname === "/" && href === "index.html")) {
      link.classList.add("is-active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileNav();
  bindSearchForms();
  initSmoothLinks();
  markCategoryLinks();
  renderListingPage();
});