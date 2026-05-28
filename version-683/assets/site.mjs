
import { H as Hls } from './hls.mjs';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function normalize(text) {
  return (text || '').toLowerCase().replace(/\s+/g, '');
}

function setActive(el, active) {
  if (!el) return;
  el.classList.toggle('is-active', active);
  el.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function initMobileMenu() {
  const toggle = qs('[data-menu-toggle]');
  const nav = qs('[data-site-nav]');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('is-open');
    const expanded = nav.classList.contains('is-open');
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });

  qsa('a', nav).forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function initHeroSlider() {
  const slider = qs('[data-hero-slider]');
  if (!slider) return;

  const slides = qsa('[data-slide]', slider);
  const dotsWrap = qs('[data-slider-dots]', slider);
  const prevBtn = qs('[data-slider-prev]', slider);
  const nextBtn = qs('[data-slider-next]', slider);
  if (!slides.length) return;

  let index = 0;
  let timer = null;

  const renderDots = () => {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = slides.map((_, i) =>
      `<button class="slider-dot${i === index ? ' is-active' : ''}" type="button" aria-label="切换到第 ${i + 1} 张"></button>`
    ).join('');

    qsa('button', dotsWrap).forEach((btn, i) => {
      btn.addEventListener('click', () => {
        index = i;
        update();
        restart();
      });
    });
  };

  const update = () => {
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
      slide.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
    });
    if (dotsWrap) {
      qsa('.slider-dot', dotsWrap).forEach((dot, i) => setActive(dot, i === index));
    }
  };

  const next = () => {
    index = (index + 1) % slides.length;
    update();
    renderDots();
  };

  const prev = () => {
    index = (index - 1 + slides.length) % slides.length;
    update();
    renderDots();
  };

  const restart = () => {
    if (timer) clearInterval(timer);
    if (prefersReducedMotion) return;
    timer = window.setInterval(next, 5200);
  };

  prevBtn?.addEventListener('click', () => { prev(); restart(); });
  nextBtn?.addEventListener('click', () => { next(); restart(); });

  update();
  renderDots();
  restart();
}

function initCardsSearch() {
  qsa('[data-live-filter]').forEach((wrap) => {
    const scope = wrap.closest('section') || wrap.parentElement || document;
    const input = qs('[data-filter-input]', scope);
    const cards = qsa('[data-card]', wrap);
    const empty = qs('[data-empty-state]', scope);

    const apply = () => {
      const q = normalize(input?.value);
      let shown = 0;

      cards.forEach((card) => {
        const hay = normalize([
          card.dataset.title,
          card.dataset.region,
          card.dataset.type,
          card.dataset.genre,
          card.dataset.tags,
          card.dataset.summary
        ].join(' '));
        const match = !q || hay.includes(q);
        card.classList.toggle('hidden', !match);
        if (match) shown += 1;
      });

      if (empty) {
        empty.classList.toggle('hidden', shown !== 0);
        if (empty.dataset.total) {
          empty.textContent = shown
            ? `共找到 ${shown} 条匹配结果。`
            : '没有找到匹配结果，请尝试其他关键词。';
        }
      }
    };

    input?.addEventListener('input', apply);
    apply();
  });
}

function initSearchPage() {
  const holder = qs('[data-search-results]');
  if (!holder) return;

  const input = qs('[data-search-input]');
  const count = qs('[data-search-count]');
  const chips = qsa('[data-search-chip]');
  const empty = qs('[data-search-empty]');
  const params = new URLSearchParams(location.search);
  const initial = params.get('q') || '';
  const category = params.get('category') || 'all';

  let catalog = [];

  function render(items) {
    holder.innerHTML = items.map((item) => `
      <a class="movie-card" href="${item.page}" data-card
         data-title="${escapeHtml(item.title)}"
         data-region="${escapeHtml(item.region)}"
         data-type="${escapeHtml(item.type)}"
         data-genre="${escapeHtml(item.genre)}"
         data-tags="${escapeHtml(item.tags.join(' '))}"
         data-summary="${escapeHtml(item.one_line)}">
        <div class="poster" style="--poster:url('./${item.cover_idx}.jpg')">
          <span class="badge">${escapeHtml(item.type)}</span>
          <span class="year">${escapeHtml(item.year)}</span>
        </div>
        <div class="movie-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.one_line)}</p>
          <div class="movie-meta">
            ${item.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </a>
    `).join('');
    if (count) count.textContent = `共 ${items.length} 条`;
    if (empty) empty.classList.toggle('hidden', items.length > 0);
  }

  function apply() {
    const q = normalize(input?.value || '');
    const activeCat = chips.find((c) => c.classList.contains('is-active'))?.dataset.searchChip || 'all';
    const items = catalog.filter((item) => {
      const hay = normalize([
        item.title, item.region, item.type, item.genre, item.tags.join(' '), item.one_line, item.summary
      ].join(' '));
      const hitQuery = !q || hay.includes(q);
      const hitCat = activeCat === 'all' || item.bucket === activeCat;
      return hitQuery && hitCat;
    });
    render(items);
  }

  import('./catalog-data.mjs').then((mod) => {
    catalog = mod.catalog;
    input.value = initial;
    chips.forEach((chip) => {
      if (chip.dataset.searchChip === category || (category === 'all' && chip.dataset.searchChip === 'all')) {
        chip.classList.add('is-active');
      }
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        apply();
      });
    });
    input.addEventListener('input', apply);
    apply();
  });
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initPlayer() {
  qsa('[data-player]').forEach((player) => {
    const video = qs('video', player);
    const hlsSrc = player.dataset.hlsSrc;
    const mp4Src = player.dataset.mp4Src;
    const altSrc = player.dataset.altHlsSrc;
    const status = qs('[data-player-status]', player);
    const localBtn = qs('[data-play-local]', player);
    const hlsBtn = qs('[data-play-hls]', player);
    const altBtn = qs('[data-play-alt]', player);
    const restartBtn = qs('[data-play-restart]', player);
    let hls = null;

    const setStatus = (text) => {
      if (status) status.textContent = text;
    };

    const destroyHls = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };

    const playMp4 = () => {
      destroyHls();
      if (video) {
        video.src = mp4Src || '';
        video.load();
        video.play().catch(() => {});
      }
      setStatus('当前播放：本地样片');
    };

    const playHls = (url) => {
      if (!video || !url) return;
      if (Hls.isSupported()) {
        destroyHls();
        hls = new Hls({
          lowLatencyMode: true,
          enableWorker: true,
          backBufferLength: 30
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data?.fatal) {
            setStatus('HLS 播放失败，已回退本地样片');
            playMp4();
          }
        });
        setStatus('当前播放：HLS 播放源');
        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        destroyHls();
        video.src = url;
        video.load();
        video.play().catch(() => {});
        setStatus('当前播放：HLS 播放源');
        return;
      }

      setStatus('当前浏览器不直接支持 HLS，已回退本地样片');
      playMp4();
    };

    localBtn?.addEventListener('click', playMp4);
    hlsBtn?.addEventListener('click', () => playHls(hlsSrc));
    altBtn?.addEventListener('click', () => playHls(altSrc || hlsSrc));
    restartBtn?.addEventListener('click', () => {
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    });

    if (hlsSrc) {
      playHls(hlsSrc);
    } else {
      playMp4();
    }
  });
}

function initBackToTop() {
  const btn = qs('[data-back-top]');
  if (!btn) return;

  const onScroll = () => {
    btn.classList.toggle('hidden', window.scrollY < 480);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  onScroll();
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initHeroSlider();
  initCardsSearch();
  initSearchPage();
  initPlayer();
  initBackToTop();
});
