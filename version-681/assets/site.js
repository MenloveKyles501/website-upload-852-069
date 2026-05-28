(function () {
  const body = document.body;

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function normalize(value) {
    return String(value || '').toLowerCase().trim();
  }

  function initMenu() {
    const button = qs('[data-menu-toggle]');
    const nav = qs('[data-site-nav]');
    const search = qs('.nav-search');

    if (!button || !nav) {
      return;
    }

    button.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      if (search) {
        search.classList.toggle('is-open');
      }
    });
  }

  function initHero() {
    const slider = qs('[data-hero-slider]');

    if (!slider) {
      return;
    }

    const slides = qsa('[data-hero-slide]', slider);
    const dots = qsa('[data-hero-dot]', slider);
    const prev = qs('[data-hero-prev]', slider);
    const next = qs('[data-hero-next]', slider);
    let index = 0;
    let timer = null;

    function show(nextIndex) {
      if (!slides.length) {
        return;
      }

      index = (nextIndex + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        slide.classList.toggle('is-active', slideIndex === index);
      });
      dots.forEach(function (dot, dotIndex) {
        dot.classList.toggle('is-active', dotIndex === index);
      });
    }

    function start() {
      stop();
      timer = window.setInterval(function () {
        show(index + 1);
      }, 5000);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.dataset.heroDot || 0));
        start();
      });
    });

    if (prev) {
      prev.addEventListener('click', function () {
        show(index - 1);
        start();
      });
    }

    if (next) {
      next.addEventListener('click', function () {
        show(index + 1);
        start();
      });
    }

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    show(0);
    start();
  }

  function initFilters() {
    const panel = qs('[data-filter-panel]');
    const list = qs('[data-card-list]') || qs('.movie-grid');

    if (!panel || !list) {
      return;
    }

    const cards = qsa('.movie-card', list);
    const queryInput = qs('[data-filter-query]', panel);
    const regionSelect = qs('[data-filter-region]', panel);
    const typeSelect = qs('[data-filter-type]', panel);
    const yearSelect = qs('[data-filter-year]', panel);
    const countNode = qs('[data-filter-count]', panel);
    const resetButton = qs('[data-filter-reset]', panel);

    function matchCard(card) {
      const query = normalize(queryInput && queryInput.value);
      const region = normalize(regionSelect && regionSelect.value);
      const type = normalize(typeSelect && typeSelect.value);
      const year = normalize(yearSelect && yearSelect.value);
      const haystack = normalize([
        card.dataset.title,
        card.dataset.region,
        card.dataset.type,
        card.dataset.year,
        card.dataset.genre,
        card.dataset.tags
      ].join(' '));

      if (query && !haystack.includes(query)) {
        return false;
      }
      if (region && !normalize(card.dataset.region).includes(region)) {
        return false;
      }
      if (type && !normalize(card.dataset.type).includes(type)) {
        return false;
      }
      if (year && normalize(card.dataset.year) !== year) {
        return false;
      }
      return true;
    }

    function applyFilter() {
      let visible = 0;

      cards.forEach(function (card) {
        const matched = matchCard(card);
        card.hidden = !matched;
        if (matched) {
          visible += 1;
        }
      });

      if (countNode) {
        countNode.textContent = '当前显示 ' + visible + ' / ' + cards.length + ' 部影片';
      }
    }

    [queryInput, regionSelect, typeSelect, yearSelect].forEach(function (control) {
      if (!control) {
        return;
      }
      control.addEventListener('input', applyFilter);
      control.addEventListener('change', applyFilter);
    });

    if (resetButton) {
      resetButton.addEventListener('click', function () {
        [queryInput, regionSelect, typeSelect, yearSelect].forEach(function (control) {
          if (control) {
            control.value = '';
          }
        });
        applyFilter();
      });
    }

    applyFilter();
  }

  function createCard(movie) {
    const tags = (movie.tags || []).slice(0, 3).map(function (tag) {
      return '<span>' + escapeHtml(tag) + '</span>';
    }).join('');

    return [
      '<article class="movie-card">',
      '  <a class="movie-card-link" href="movie/' + encodeURIComponent(movie.id) + '.html" aria-label="观看 ' + escapeHtml(movie.title) + '">',
      '    <div class="cover-frame">',
      '      <img src="' + escapeHtml(movie.cover) + '" alt="' + escapeHtml(movie.title) + '" loading="lazy" onerror="this.closest(\'.cover-frame\').classList.add(\'cover-missing\'); this.remove();">',
      '      <span class="quality-badge">高清</span>',
      '      <span class="play-hover" aria-hidden="true">▶</span>',
      '    </div>',
      '    <div class="movie-card-body">',
      '      <div class="movie-card-meta">',
      '        <span>' + escapeHtml(movie.year) + '</span>',
      '        <span>' + escapeHtml(movie.region) + '</span>',
      '        <span>' + escapeHtml(movie.type) + '</span>',
      '      </div>',
      '      <h3>' + escapeHtml(movie.title) + '</h3>',
      '      <p>' + escapeHtml(movie.oneLine || '') + '</p>',
      '      <div class="tag-row">' + tags + '</div>',
      '    </div>',
      '  </a>',
      '</article>'
    ].join('');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initSearchPage() {
    const results = qs('#searchResults');

    if (!results || !window.MOVIE_DATA) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const q = normalize(params.get('q'));
    const input = qs('[data-search-input]');
    const title = qs('[data-search-title]');
    const hint = qs('[data-search-hint]');

    if (input) {
      input.value = params.get('q') || '';
    }

    const source = window.MOVIE_DATA;
    const matched = q
      ? source.filter(function (movie) {
          const haystack = normalize([
            movie.title,
            movie.region,
            movie.type,
            movie.year,
            movie.genreRaw,
            (movie.tags || []).join(' '),
            movie.oneLine
          ].join(' '));
          return haystack.includes(q);
        })
      : source.slice(0, 48);

    if (title) {
      title.textContent = q ? '找到 ' + matched.length + ' 条结果' : '热门影片推荐';
    }

    if (hint) {
      hint.textContent = q ? '当前关键词：' + (params.get('q') || '') : '未输入关键词，默认展示热门影片。';
    }

    results.innerHTML = matched.slice(0, 200).map(createCard).join('');

    if (!matched.length) {
      results.innerHTML = '<p class="empty-result">没有找到匹配影片，请尝试更短的关键词。</p>';
    }
  }

  function initBackTop() {
    const button = qs('[data-back-top]');

    if (!button) {
      return;
    }

    window.addEventListener('scroll', function () {
      button.classList.toggle('is-visible', window.scrollY > 520);
    }, { passive: true });

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  initMenu();
  initHero();
  initFilters();
  initSearchPage();
  initBackTop();
})();
