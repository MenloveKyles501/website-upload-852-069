import { H as Hls } from "./hls.mjs";

function initPlayerShell() {
  const shell = document.querySelector("[data-player-shell]");
  if (!shell) {
    return;
  }

  const video = shell.querySelector("video");
  const playButton = shell.querySelector("[data-play-button]");
  const sourceButtons = Array.from(shell.querySelectorAll("[data-source-button]"));
  const status = shell.querySelector("[data-player-status]");
  const sourcesRaw = shell.getAttribute("data-sources") || "[]";
  const fallback = shell.getAttribute("data-stream-url") || "";
  const poster = shell.getAttribute("data-poster") || "";
  const title = shell.getAttribute("data-title") || "";

  let sources = [];
  try {
    sources = JSON.parse(sourcesRaw);
  } catch (error) {
    sources = [];
  }

  if (!sources.length && fallback) {
    sources = [{ label: "线路 1", url: fallback }];
  }

  let hls = null;
  let currentUrl = "";

  function setStatus(text) {
    if (status) {
      status.textContent = text;
    }
  }

  function destroyHls() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  function loadSource(url, autoplay = false) {
    if (!video || !url || url === currentUrl) {
      return;
    }
    currentUrl = url;
    destroyHls();

    setStatus("正在载入片源…");
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("已加载 HLS 片源");
        if (autoplay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data && data.fatal) {
          setStatus("播放失败，请切换线路");
        }
      });
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setStatus("已加载 HLS 片源");
        if (autoplay) {
          video.play().catch(() => {});
        }
      }, { once: true });
      return;
    }

    setStatus("当前浏览器不支持 HLS 播放");
  }

  function setActiveButton(activeUrl) {
    sourceButtons.forEach((button) => {
      const url = button.getAttribute("data-url");
      button.classList.toggle("is-active", url === activeUrl);
    });
  }

  sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-url");
      if (!url) return;
      setActiveButton(url);
      loadSource(url, true);
    });
  });

  if (playButton) {
    playButton.addEventListener("click", () => {
      if (video) {
        video.play().catch(() => {});
      }
      playButton.classList.add("hidden");
      setStatus("播放中");
    });
  }

  if (video) {
    video.poster = poster;
    video.setAttribute("playsinline", "playsinline");
    video.setAttribute("webkit-playsinline", "webkit-playsinline");

    video.addEventListener("play", () => {
      if (playButton) {
        playButton.classList.add("hidden");
      }
      setStatus("播放中");
    });

    video.addEventListener("pause", () => {
      if (playButton) {
        playButton.classList.remove("hidden");
      }
      setStatus("已暂停");
    });

    video.addEventListener("ended", () => {
      if (playButton) {
        playButton.classList.remove("hidden");
      }
      setStatus("播放结束");
    });

    const first = sources[0];
    if (first && first.url) {
      setActiveButton(first.url);
      loadSource(first.url, false);
    } else if (fallback) {
      loadSource(fallback, false);
    }
  }

  if (title && status) {
    status.textContent = `当前影片：${title}`;
  }

  window.addEventListener("beforeunload", destroyHls);
}

document.addEventListener("DOMContentLoaded", initPlayerShell);