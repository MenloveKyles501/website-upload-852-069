import { H as Hls } from './hls-vendor.js';

function isHlsSource(src) {
  return String(src || '').toLowerCase().includes('.m3u8');
}

function setStatus(shell, message) {
  const status = shell.querySelector('[data-player-status]');

  if (status) {
    status.textContent = message;
  }
}

function attachSource(video, shell) {
  const src = video.dataset.src;
  const fallback = video.dataset.fallbackSrc;

  if (!src || video.dataset.ready === 'true') {
    return;
  }

  video.dataset.ready = 'true';

  if (isHlsSource(src)) {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        setStatus(shell, 'HLS 播放源已加载，可开始观看。');
      });
      hls.on(Hls.Events.ERROR, function (event, data) {
        if (!data || !data.fatal) {
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          setStatus(shell, '网络波动，正在重新加载 HLS。');
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          setStatus(shell, '媒体解码异常，正在自动恢复。');
          return;
        }

        hls.destroy();
        if (fallback) {
          video.src = fallback;
          setStatus(shell, 'HLS 暂不可用，已切换 MP4 备用源。');
        }
      });
      video._hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      setStatus(shell, '浏览器原生 HLS 播放已启用。');
    } else if (fallback) {
      video.src = fallback;
      setStatus(shell, '当前浏览器不支持 HLS，已切换 MP4 备用源。');
    }
  } else {
    video.src = src;
    setStatus(shell, 'MP4 播放源已加载。');
  }
}

function initPlayer(shell) {
  const video = shell.querySelector('video');
  const start = shell.querySelector('[data-player-start]');

  if (!video || !start) {
    return;
  }

  async function play() {
    attachSource(video, shell);

    try {
      await video.play();
      shell.classList.add('is-playing');
      setStatus(shell, '正在播放。');
    } catch (error) {
      setStatus(shell, '浏览器阻止了自动播放，请再次点击播放按钮。');
    }
  }

  start.addEventListener('click', play);
  video.addEventListener('play', function () {
    shell.classList.add('is-playing');
  });
  video.addEventListener('pause', function () {
    if (!video.ended) {
      shell.classList.remove('is-playing');
    }
  });
  video.addEventListener('ended', function () {
    shell.classList.remove('is-playing');
    setStatus(shell, '播放结束。');
  });
}

document.querySelectorAll('[data-player]').forEach(initPlayer);
