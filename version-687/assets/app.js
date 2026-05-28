(function () {
  function formatIndex(i) { return String(i + 1).padStart(2, '0'); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function initMenu() {
    var toggle = qs('[data-menu-toggle]');
    var nav = qs('[data-nav]');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () { nav.classList.toggle('is-open'); });
  }

  function initHeroSlider() {
    var slider = qs('#hero-slider');
    if (!slider) return;
    var slides = qsa('[data-slide]', slider);
    var dotsWrap = qs('[data-hero-dots]');
    if (!slides.length || !dotsWrap) return;
    var index = 0;
    var dots = slides.map(function (_, i) {
      var btn = document.createElement('button');
      btn.className = 'hero-dot' + (i === 0 ? ' active' : '');
      btn.type = 'button';
      btn.setAttribute('aria-label', '切换第 ' + (i + 1) + ' 张');
      btn.addEventListener('click', function () { go(i); reset(); });
      dotsWrap.appendChild(btn);
      return btn;
    });
    function go(i) {
      index = i;
      slides.forEach(function (s, si) { s.classList.toggle('is-active', si === index); });
      dots.forEach(function (d, di) { d.classList.toggle('active', di === index); });
    }
    var timer = null;
    function reset() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () { go((index + 1) % slides.length); }, 5000);
    }
    slider.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
    slider.addEventListener('mouseleave', function () { reset(); });
    go(0);
    reset();
  }

  function initSearchPage() {
    var input = qs('#searchInput');
    var button = qs('#searchBtn');
    var results = qs('#searchResults');
    var count = qs('#resultCount');
    if (!input || !button || !results || !window.FILMS) return;
    var query = new URLSearchParams(location.search).get('q') || '';
    input.value = query;
    var activeFilter = '全部';
    function scoreFilm(f, q) {
      if (!q) return 1;
      var text = [f.title, f.region, f.type, f.year, f.genre, f.oneLine, f.summary, (f.tags || []).join(' ')].join(' ').toLowerCase();
      q = q.toLowerCase();
      if (text.indexOf(q) !== -1) return 100;
      var points = 0;
      q.split(/\s+/).forEach(function (word) { if (!word) return; if (text.indexOf(word) !== -1) points += 10; });
      return points;
    }
    function passesFilter(f) {
      if (activeFilter === '全部') return true;
      var text = [f.title, f.region, f.type, f.year, f.genre, f.oneLine, f.summary, (f.tags || []).join(' ')].join(' ');
      return text.indexOf(activeFilter) !== -1;
    }
    function render() {
      var q = input.value.trim();
      var list = window.FILMS.filter(function (f) { return passesFilter(f); });
      if (q) {
        list = list.map(function (f) { return { film: f, s: scoreFilm(f, q) }; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.film; });
      }
      results.innerHTML = list.slice(0, 180).map(function (f) {
        return '<article class="movie-card"><a href="movies/movie-' + f.id + '.html" class="movie-poster-link"><img loading="lazy" src="' + f.poster + '" alt="' + f.title.replace(/"/g, '&quot;') + '" /><span class="play-badge">▶</span></a><div class="movie-card-body"><div class="movie-title-row"><a href="movies/movie-' + f.id + '.html" class="movie-title">' + f.title + '</a><span class="movie-year">' + f.year + '</span></div><div class="movie-meta">' + f.region + ' · ' + f.type + '</div><p class="movie-desc">' + f.oneLine + '</p><div class="tag-row">' + (f.tags || []).slice(0,3).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div></div></article>';
      }).join('');
      count.textContent = list.length + ' 部';
    }
    button.addEventListener('click', render);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); render(); } });
    qsa('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        qsa('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter') || '全部';
        render();
      });
    });
    render();
  }

  function initPlayer() {
    var box = qs('#movie-data');
    var video = qs('#player');
    if (!box || !video) return;
    var data = {};
    try { data = JSON.parse(box.textContent || box.innerText || '{}'); } catch (e) { data = {}; }
    var buttons = qsa('.source-btn');
    var remote = buttons[0];
    var local = buttons[1];
    function activate(btn) {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var src = btn.getAttribute('data-src');
      var type = btn.getAttribute('data-type') || '';
      if (window.Hls && Hls.isSupported() && type === 'hls') {
        if (video._hls) { try { video._hls.destroy(); } catch (e) {} }
        var hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        video._hls = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function (_, data) {
          if (data && data.fatal) {
            if (local) activate(local);
          }
        });
      } else {
        if (video._hls) { try { video._hls.destroy(); } catch (e) {} }
        video.src = src;
      }
      video.load();
    }
    buttons.forEach(function (btn) { btn.addEventListener('click', function () { activate(btn); }); });
    if (remote) activate(remote);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initHeroSlider();
    initSearchPage();
    initPlayer();
  });
})();
