
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function safeText(str) {
    return String(str || '').trim();
  }
  function getQuery(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }
  function shortText(str, len) {
    str = safeText(str).replace(/\s+/g, ' ');
    return str.length > len ? str.slice(0, len - 1) + '…' : str;
  }
  function renderCard(item) {
    const tags = safeText(item.tags).split(/[，,\/、\s]+/).filter(Boolean).slice(0, 3);
    return `
      <article class="movie-card search-hit">
        <a href="${item.url}" class="movie-link">
          <div class="poster poster-md" style="--c1:#0f172a;--c2:#1d4ed8;--c3:#06b6d4;--angle:${(parseInt(item.id, 10) * 37) % 360}deg;">
            <div class="poster-glow"></div>
            <div class="poster-body">
              <span class="poster-id">${escapeHtml(item.id)}</span>
              <div class="poster-kicker">${escapeHtml(item.region)} · ${escapeHtml(item.type)}</div>
              <div class="poster-title">${escapeHtml(shortText(item.title, 16))}</div>
              <div class="poster-meta">${escapeHtml(tags[0] || item.type || '')}</div>
            </div>
          </div>
          <div class="movie-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p class="movie-sub">${escapeHtml(item.region)} · ${escapeHtml(item.type)} · ${escapeHtml(item.year)}</p>
            <p class="movie-summary">${escapeHtml(shortText(item.oneLine || item.genre || '', 72))}</p>
            <div class="tag-row">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          </div>
        </a>
      </article>`;
  }
  function initMenu() {
    const btn = qs('[data-menu-toggle]');
    const nav = qs('[data-nav]');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }
  function initSearchPage() {
    const root = qs('[data-search-root]');
    const results = qs('#searchResults');
    const count = qs('#searchCount');
    const title = qs('#searchTitle');
    const input = qs('#searchInput');
    if (!results || !window.MOVIE_INDEX) return;
    const initial = getQuery('q').trim();
    if (input) input.value = initial;
    function doSearch(term) {
      term = term.trim().toLowerCase();
      const data = !term ? window.MOVIE_INDEX.slice(0, 60) : window.MOVIE_INDEX.filter(item => {
        const hay = [item.title, item.region, item.type, item.year, item.genre, item.tags, item.oneLine].join(' ').toLowerCase();
        return hay.includes(term);
      });
      if (title) title.textContent = term ? `“${term}” 的搜索结果` : '热门条目';
      if (count) count.textContent = `${data.length} 条`;
      results.innerHTML = data.map(renderCard).join('') || '<div class="empty-state">没有找到匹配内容，请尝试更换关键词。</div>';
    }
    doSearch(initial);
    if (input) {
      input.addEventListener('input', () => doSearch(input.value));
      input.form && input.form.addEventListener('submit', (e) => {
        e.preventDefault();
        doSearch(input.value);
        const params = new URLSearchParams(window.location.search);
        params.set('q', input.value);
        history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
      });
    }
  }
  function initDetailPlayer() {
    const card = qs('.player-card[data-sources]');
    if (!card) return;
    const video = qs('.player-video', card);
    const overlay = qs('[data-play-trigger]', card);
    const tabs = qsa('[data-source-index]', card);
    let sourceUrls = [];
    try {
      sourceUrls = JSON.parse(card.getAttribute('data-sources') || '[]');
    } catch (err) {
      sourceUrls = [];
    }
    if (!sourceUrls.length || !video) return;
    let hlsInstance = null;
    let activeIndex = 0;
    function setActive(index) {
      activeIndex = index;
      tabs.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.sourceIndex) === index));
      loadSource(sourceUrls[index]);
    }
    function destroyHls() {
      if (hlsInstance) {
        try { hlsInstance.destroy(); } catch (e) {}
        hlsInstance = null;
      }
    }
    function loadSource(url) {
      destroyHls();
      if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
        hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function () {
          video.play().catch(function () {});
        });
        hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
          if (data && data.fatal) {
            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR || data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
              try { hlsInstance.recoverMediaError(); } catch (e) {}
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(function () {});
      } else {
        video.src = url;
        video.play().catch(function () {});
      }
    }
    function start() {
      overlay && (overlay.style.display = 'none');
      loadSource(sourceUrls[activeIndex]);
    }
    overlay && overlay.addEventListener('click', start);
    tabs.forEach((btn) => btn.addEventListener('click', () => setActive(Number(btn.dataset.sourceIndex) || 0)));
    video.addEventListener('play', () => overlay && (overlay.style.display = 'none'));
    video.addEventListener('pause', () => {});
    // preload first source but keep poster visible until interaction
    setActive(0);
    if (overlay) {
      overlay.textContent = '点击播放';
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initSearchPage();
    initDetailPlayer();
  });
})();
