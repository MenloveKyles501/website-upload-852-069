
(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Hero carousel
  const hero = document.querySelector('[data-hero-carousel]');
  if (hero) {
    const slides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(hero.querySelectorAll('[data-hero-dot]'));
    let current = 0;
    const activate = (idx) => {
      current = idx;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === idx));
      dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => activate(i)));
    if (slides.length > 1) {
      setInterval(() => activate((current + 1) % slides.length), 5200);
    }
  }

  // Card search/filter (static pages)
  document.querySelectorAll('[data-filter-form]').forEach((form) => {
    const cards = Array.from(document.querySelectorAll('[data-filter-card]'));
    const input = form.querySelector('[data-filter-input]');
    const genre = form.querySelector('[data-filter-genre]');
    const region = form.querySelector('[data-filter-region]');
    const year = form.querySelector('[data-filter-year]');
    const empty = document.querySelector('[data-filter-empty]');

    const runFilter = () => {
      const q = (input?.value || '').trim().toLowerCase();
      const g = (genre?.value || '').trim();
      const r = (region?.value || '').trim();
      const y = (year?.value || '').trim();
      let shown = 0;
      cards.forEach((card) => {
        const title = (card.dataset.title || '').toLowerCase();
        const tags = (card.dataset.tags || '').toLowerCase();
        const cardGenre = card.dataset.genre || '';
        const cardRegion = card.dataset.region || '';
        const cardYear = card.dataset.year || '';
        const ok = (!q || title.includes(q) || tags.includes(q)) &&
                   (!g || cardGenre.includes(g) || tags.includes(g)) &&
                   (!r || cardRegion.includes(r)) &&
                   (!y || cardYear === y);
        card.style.display = ok ? '' : 'none';
        if (ok) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    };
    [input, genre, region, year].forEach((el) => el && el.addEventListener('input', runFilter));
    [genre, region, year].forEach((el) => el && el.addEventListener('change', runFilter));
    runFilter();
  });

  // Detail player using HLS.js or native fallback
  const player = document.querySelector('[data-player]');
  if (player) {
    const video = player.querySelector('video');
    const buttons = Array.from(document.querySelectorAll('[data-source-btn]'));
    const status = document.querySelector('[data-player-status]');
    const sourceMap = JSON.parse(player.getAttribute('data-sources') || '{}');
    const poster = player.getAttribute('data-poster') || '';
    if (poster) video.poster = poster;
    const setActive = (name) => {
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.sourceBtn === name));
    };
    const loadSource = (name) => {
      const src = sourceMap[name];
      if (!src) return;
      if (window.hlsInstance) {
        try { window.hlsInstance.destroy(); } catch (e) {}
        window.hlsInstance = null;
      }
      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          if (status) status.textContent = '正在播放：' + name;
        });
        hls.on(Hls.Events.ERROR, function (_, data) {
          if (status) status.textContent = '播放线路已加载，浏览器可直接播放。';
        });
        window.hlsInstance = hls;
      } else {
        video.src = src;
        video.play().catch(() => {});
        if (status) status.textContent = '正在播放：' + name;
      }
      setActive(name);
    };
    buttons.forEach((btn) => btn.addEventListener('click', () => loadSource(btn.dataset.sourceBtn)));
    if (buttons[0]) loadSource(buttons[0].dataset.sourceBtn);
  }

  // Search page data-driven rendering
  const searchApp = document.querySelector('[data-search-app]');
  if (searchApp) {
    const input = searchApp.querySelector('[data-search-input]');
    const genre = searchApp.querySelector('[data-search-genre]');
    const result = searchApp.querySelector('[data-search-result]');
    const counter = searchApp.querySelector('[data-search-counter]');
    const endpoint = searchApp.getAttribute('data-json');
    const state = { items: [] };

    const render = () => {
      if (!result) return;
      const q = (input?.value || '').trim().toLowerCase();
      const g = (genre?.value || '').trim();
      const items = state.items.filter((m) => {
        const hay = [m.title, m.genre, m.region, (m.tags || []).join(' '), m.bucket_label].join(' ').toLowerCase();
        return (!q || hay.includes(q)) && (!g || m.bucket === g || m.genre.includes(g) || m.bucket_label.includes(g));
      });
      if (counter) counter.textContent = items.length + ' 条结果';
      if (!items.length) {
        result.innerHTML = '<div class="search-empty panel">没有找到匹配结果，请尝试更换关键词。</div>';
        return;
      }
      result.innerHTML = items.slice(0, 200).map((m, i) => `
        <a class="movie-card" href="${m.url}" style="display:block" title="${m.title}">
          <span class="poster-wrap"><img src="${m.poster}" alt="${m.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('poster-missing')"><span class="poster-badge">${m.year}</span><span class="poster-index">#${m.id}</span></span>
          <div class="card-body"><div class="card-meta">${m.bucket_label} · ${m.genre}</div><h3 class="card-title">${m.title}</h3><p class="card-desc">${(m.one_line || '').slice(0, 66)}</p><div class="tag-row">${(m.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}</div></div>
        </a>
      `).join('');
    };
    fetch(endpoint).then((r) => r.json()).then((items) => {
      state.items = items;
      render();
    }).catch(() => {
      if (result) result.innerHTML = '<div class="search-empty panel">搜索索引加载失败。</div>';
    });
    [input, genre].forEach((el) => el && el.addEventListener('input', render));
    [genre].forEach((el) => el && el.addEventListener('change', render));
  }
})();
