
(function () {
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function debounce(fn, wait) {
    let t = null;
    return function () {
      const ctx = this;
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function initMobileNav() {
    const toggle = $('[data-nav-toggle]');
    const panel = $('[data-nav-panel]');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function () {
      panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', panel.classList.contains('is-open') ? 'true' : 'false');
    });
  }

  function initHeroCarousel() {
    const root = $('[data-hero-carousel]');
    if (!root) return;
    const slides = $all('.hero-slide', root);
    const dots = $all('[data-hero-dot]', root);
    const prev = $('[data-hero-prev]', root);
    const next = $('[data-hero-next]', root);
    if (slides.length <= 1) return;

    let index = 0;
    let timer = null;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (slide, idx) {
        slide.classList.toggle('is-active', idx === index);
      });
      dots.forEach(function (dot, idx) {
        dot.classList.toggle('is-active', idx === index);
        dot.setAttribute('aria-current', idx === index ? 'true' : 'false');
      });
    }

    function start() {
      stop();
      timer = setInterval(function () {
        show(index + 1);
      }, 5200);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

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

    dots.forEach(function (dot, idx) {
      dot.addEventListener('click', function () {
        show(idx);
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    show(0);
    start();
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
      q: (params.get('q') || '').trim(),
      sort: params.get('sort') || '',
      region: params.get('region') || '',
      genre: params.get('genre') || ''
    };
  }

  function norm(text) {
    return String(text || '').toLowerCase();
  }

  function filterCards(page) {
    const input = $('[data-filter-input]', page);
    const sortSelect = $('[data-sort-select]', page);
    const cards = $all('[data-movie-card]', page);
    const grid = $('[data-card-grid]', page);
    const resultCount = $('[data-result-count]', page);
    if (!cards.length) return;

    const query = parseQuery();

    if (input && query.q) {
      input.value = query.q;
    }
    if (sortSelect && query.sort) {
      sortSelect.value = query.sort;
    }

    function apply() {
      const q = norm((input && input.value) || query.q || '');
      const sort = (sortSelect && sortSelect.value) || query.sort || 'heat';

      let items = cards.slice();

      if (q) {
        items = items.filter(function (card) {
          const searchText = card.getAttribute('data-search') || norm(card.textContent);
          return searchText.indexOf(q) !== -1;
        });
      }

      const region = query.region;
      if (region) {
        items = items.filter(function (card) {
          return norm(card.getAttribute('data-region')).indexOf(norm(region)) !== -1;
        });
      }

      const genre = query.genre;
      if (genre) {
        items = items.filter(function (card) {
          return norm(card.getAttribute('data-genre')).indexOf(norm(genre)) !== -1;
        });
      }

      items.forEach(function (card) {
        card.classList.remove('hidden');
      });
      cards.forEach(function (card) {
        if (items.indexOf(card) === -1) card.classList.add('hidden');
      });

      if (grid) {
        const sorters = {
          heat: function (a, b) {
            return Number(b.getAttribute('data-score') || 0) - Number(a.getAttribute('data-score') || 0);
          },
          newest: function (a, b) {
            return Number(b.getAttribute('data-year') || 0) - Number(a.getAttribute('data-year') || 0);
          },
          oldest: function (a, b) {
            return Number(a.getAttribute('data-year') || 0) - Number(b.getAttribute('data-year') || 0);
          },
          title: function (a, b) {
            return norm(a.getAttribute('data-title')).localeCompare(norm(b.getAttribute('data-title')), 'zh-Hans-CN');
          }
        };
        items.sort(sorters[sort] || sorters.heat);
        items.forEach(function (card) {
          grid.appendChild(card);
        });
      }

      if (resultCount) {
        resultCount.textContent = String(items.length);
      }
    }

    if (input) {
      input.addEventListener('input', debounce(apply, 80));
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', apply);
    }

    $all('[data-filter-chip]', page).forEach(function (chip) {
      chip.addEventListener('click', function () {
        const keyword = chip.getAttribute('data-filter-chip');
        if (input) input.value = keyword;
        apply();
      });
    });

    apply();
  }

  function initPlayer() {
    const video = $('[data-movie-player]');
    if (!video) return;
    const source = video.getAttribute('data-src');
    const playBtn = $('[data-play-btn]');
    const copyBtn = $('[data-copy-src]');
    const status = $('[data-player-status]');
    let hls = null;

    function markStatus(text) {
      if (status) status.textContent = text;
    }

    function attach() {
      if (!source) {
        markStatus('暂无可用播放源');
        return;
      }

      if (window.Hls && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data && data.fatal) {
            markStatus('播放器加载遇到网络问题，已切换到直连地址');
            try {
              video.src = source;
            } catch (err) {}
          }
        });
        markStatus('已准备播放，点击即可开始');
      } else if (video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
        markStatus('浏览器支持原生播放');
      } else {
        video.src = source;
        markStatus('已使用直连地址播放');
      }
    }

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        video.play().catch(function () {
          markStatus('请先点击视频区域或允许自动播放');
        });
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(source || '');
          copyBtn.textContent = '已复制播放地址';
          setTimeout(function () {
            copyBtn.textContent = '复制播放地址';
          }, 1600);
        } catch (err) {
          markStatus('复制失败，请手动选择播放器地址');
        }
      });
    }

    attach();
  }

  function init() {
    initMobileNav();
    initHeroCarousel();
    $all('[data-filter-page]').forEach(filterCards);
    initPlayer();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
