const cleanupKey = "__zenRemodelledUrlbarAnimationCleanup";

if (typeof window[cleanupKey] === "function") {
  window[cleanupKey]();
}

const HTML_NS = "http://www.w3.org/1999/xhtml";
const STYLE_ID = "zen-remodelled-urlbar-animation-style";

const setImportant = (element, property, value) => {
  element.style.setProperty(property, value, "important");
};

const removeIds = (element) => {
  element.removeAttribute("id");
  element.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
};

const createStyle = () => {
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElementNS(HTML_NS, "style");
  style.id = STYLE_ID;
  style.textContent = `
    .zen-remodelled-urlbar-close-shell {
      animation: zen-remodelled-urlbar-close 0.46s cubic-bezier(0.23, 1, 0.32, 1) forwards !important;
      overflow: hidden !important;
      pointer-events: none !important;
      position: fixed !important;
      transform-origin: center center !important;
      z-index: 2147483647 !important;
    }

    .zen-remodelled-urlbar-focus-layer {
      backdrop-filter: blur(8px) saturate(0.72) brightness(0.82) !important;
      background: color-mix(in srgb, var(--theme-bg) 18%, transparent) !important;
      block-size: 0 !important;
      inline-size: 0 !important;
      inset-block-start: 0 !important;
      inset-inline-start: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      position: fixed !important;
      transition: opacity 0.18s ease !important;
      z-index: 2147483000 !important;
    }

    .zen-remodelled-urlbar-focus-layer[active] {
      opacity: 1 !important;
      transition-duration: 0.24s !important;
    }

    .zen-remodelled-urlbar-focus-layer::after {
      background: color-mix(in srgb, var(--theme-bg) 24%, transparent) !important;
      content: "" !important;
      inset: 0 !important;
      pointer-events: none !important;
      position: absolute !important;
    }

    .zen-remodelled-urlbar-main-focus-target {
      transition: filter 0.18s ease !important;
      will-change: filter !important;
    }

    .zen-remodelled-urlbar-main-focus-target[zen-remodelled-focus-active] {
      filter: blur(8px) saturate(0.72) brightness(0.82) !important;
      transition-duration: 0.24s !important;
    }

    #urlbar[open] {
      z-index: 2147483646 !important;
    }

    #urlbar[open]:not([zen-floating-urlbar="true"]) {
      position: relative !important;
    }

    .zen-remodelled-urlbar-close-shell > .zen-remodelled-urlbar-close-snapshot,
    .zen-remodelled-urlbar-close-shell > .zen-remodelled-urlbar-close-copy {
      animation: none !important;
      block-size: 100% !important;
      display: block !important;
      inline-size: 100% !important;
      margin: 0 !important;
      max-inline-size: none !important;
      min-inline-size: 0 !important;
      opacity: 1 !important;
      position: static !important;
      transform: none !important;
      translate: none !important;
    }

    @keyframes zen-remodelled-urlbar-close {
      from {
        opacity: 1;
        transform: scaleX(1);
      }

      to {
        opacity: 0;
        transform: scaleX(0.08);
      }
    }
  `;

  (document.head || document.documentElement).appendChild(style);
  return style;
};

const start = () => {
  const urlbar = document.getElementById("urlbar");
  if (!urlbar) {
    return;
  }

  const style = createStyle();
  const clones = new Set();
  const focusLayers = {
    sidebar: document.createElementNS(HTML_NS, "div")
  };
  const mainFocusTargets = new Set();
  let wasOpen = urlbar.hasAttribute("open");
  let lastRect = null;
  let lastSnapshot = null;
  let captureTimers = [];
  let captureFrame = 0;
  let focusLayerCleanupTimer = 0;

  const clearCaptureTimers = () => {
    captureTimers.forEach((timer) => window.clearTimeout(timer));
    captureTimers = [];
  };

  Object.entries(focusLayers).forEach(([name, layer]) => {
    layer.className = `zen-remodelled-urlbar-focus-layer zen-remodelled-urlbar-focus-layer-${name}`;
    layer.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(layer);
  });

  const focusLayerTargets = {
    main: [
      "#zen-appcontent-wrapper",
      "#appcontent",
      "#tabbrowser-tabpanels",
      ".browserContainer",
      "browser[type='content']"
    ],
    sidebar: [
      "#zen-tabs-wrapper",
      "#zen-tabbox-wrapper",
      "#sidebar-box",
      "#sidebar"
    ]
  };

  const canUseFocusTarget = (element, name) => {
    if (!element || element === urlbar || element.contains(urlbar) || urlbar.contains(element)) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    if (styles.display === "none" || styles.visibility === "hidden" || styles.visibility === "collapse") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (name === "sidebar") {
      return rect.width > 96 && rect.height > 160;
    }

    return rect.width > 32 && rect.height > 32;
  };

  const getClampedRect = (element) => {
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const width = right - left;
    const height = bottom - top;

    if (width <= 32 || height <= 32) {
      return null;
    }

    return { left, top, width, height };
  };

  const findFocusLayerTarget = (name) => {
    const selectors = focusLayerTargets[name] || [];
    return selectors.map((selector) => document.querySelector(selector)).find((element) => canUseFocusTarget(element, name));
  };

  const setFocusLayerRect = (layer, rect) => {
    setImportant(layer, "block-size", `${rect.height}px`);
    setImportant(layer, "height", `${rect.height}px`);
    setImportant(layer, "inline-size", `${rect.width}px`);
    setImportant(layer, "width", `${rect.width}px`);
    setImportant(layer, "left", `${rect.left}px`);
    setImportant(layer, "top", `${rect.top}px`);
  };

  const clearFocusLayerRect = (layer) => {
    layer.removeAttribute("prepared");
    layer.replaceChildren();
    setImportant(layer, "block-size", "0");
    setImportant(layer, "height", "0");
    setImportant(layer, "inline-size", "0");
    setImportant(layer, "width", "0");
  };

  const cleanupInactiveMainFocusTargets = () => {
    mainFocusTargets.forEach((target) => {
      if (!target.hasAttribute("zen-remodelled-focus-active")) {
        target.classList.remove("zen-remodelled-urlbar-main-focus-target");
        mainFocusTargets.delete(target);
      }
    });
  };

  const setMainFocusTarget = () => {
    const target = findFocusLayerTarget("main");
    mainFocusTargets.forEach((candidate) => {
      if (candidate !== target) {
        candidate.removeAttribute("zen-remodelled-focus-active");
      }
    });

    if (!target) {
      return;
    }

    target.classList.add("zen-remodelled-urlbar-main-focus-target");
    target.setAttribute("zen-remodelled-focus-active", "true");
    mainFocusTargets.add(target);
  };

  const clearMainFocusTarget = (immediate = false) => {
    mainFocusTargets.forEach((target) => target.removeAttribute("zen-remodelled-focus-active"));
    if (immediate) {
      cleanupInactiveMainFocusTargets();
    }
  };

  const prepareFocusLayers = () => {
    window.clearTimeout(focusLayerCleanupTimer);
    setMainFocusTarget();

    Object.entries(focusLayers).forEach(([name, layer]) => {
      layer.removeAttribute("active");
      clearFocusLayerRect(layer);

      const target = findFocusLayerTarget(name);
      if (!target) {
        return;
      }

      const rect = getClampedRect(target);
      if (!rect) {
        return;
      }

      setFocusLayerRect(layer, rect);
      layer.setAttribute("prepared", "true");
    });
  };

  const activateFocusLayers = () => {
    Object.values(focusLayers).forEach((layer) => {
      layer.toggleAttribute("active", layer.hasAttribute("prepared"));
    });
  };

  const clearFocusLayers = (immediate = false) => {
    window.clearTimeout(focusLayerCleanupTimer);

    Object.values(focusLayers).forEach((layer) => {
      layer.removeAttribute("active");
    });

    const cleanup = () => Object.values(focusLayers).forEach(clearFocusLayerRect);
    clearMainFocusTarget(immediate);

    if (immediate) {
      cleanup();
      return;
    }

    focusLayerCleanupTimer = window.setTimeout(() => {
      cleanup();
      cleanupInactiveMainFocusTargets();
    }, 260);
  };

  const syncFocusLayer = (isOpen) => {
    if (isOpen) {
      prepareFocusLayers();
      activateFocusLayers();
    } else {
      clearFocusLayers();
    }
  };

  const cloneOpenUrlbar = (rect) => {
    const clone = urlbar.cloneNode(true);
    const sourceInput = urlbar.querySelector("#urlbar-input, .urlbar-input");
    const cloneInput = clone.querySelector("#urlbar-input, .urlbar-input");
    if (sourceInput && cloneInput && "value" in cloneInput) {
      cloneInput.value = sourceInput.value;
    }

    removeIds(clone);
    clone.classList.add("zen-remodelled-urlbar-close-copy");
    clone.setAttribute("aria-hidden", "true");

    setImportant(clone, "animation", "none");
    setImportant(clone, "block-size", `${rect.height}px`);
    setImportant(clone, "inline-size", `${rect.width}px`);
    setImportant(clone, "max-inline-size", "none");
    setImportant(clone, "min-inline-size", "0");
    setImportant(clone, "opacity", "1");
    setImportant(clone, "position", "static");
    setImportant(clone, "transform", "none");
    setImportant(clone, "translate", "none");

    return clone;
  };

  const snapshotOpenUrlbar = (rect) => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvas = document.createElementNS(HTML_NS, "canvas");
    const context = canvas.getContext("2d");

    if (!context || typeof context.drawWindow !== "function") {
      return cloneOpenUrlbar(rect);
    }

    canvas.className = "zen-remodelled-urlbar-close-snapshot";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    setImportant(canvas, "block-size", `${rect.height}px`);
    setImportant(canvas, "inline-size", `${rect.width}px`);

    try {
      context.scale(dpr, dpr);
      context.drawWindow(window, rect.left, rect.top, rect.width, rect.height, "rgba(0, 0, 0, 0)");
    } catch {
      return cloneOpenUrlbar(rect);
    }

    return canvas;
  };

  const captureOpenUrlbar = () => {
    captureFrame = 0;

    if (!urlbar.hasAttribute("open")) {
      return;
    }

    const rect = urlbar.getBoundingClientRect();
    if (rect.width < 16 || rect.height < 16) {
      return;
    }

    lastRect = rect;
    lastSnapshot = snapshotOpenUrlbar(rect);
  };

  const scheduleCapture = () => {
    if (!urlbar.hasAttribute("open") || captureFrame) {
      return;
    }

    captureFrame = window.requestAnimationFrame(captureOpenUrlbar);
  };

  const scheduleOpeningCaptures = () => {
    clearCaptureTimers();
    scheduleCapture();
    captureTimers = [80, 180, 320, 500].map((delay) => window.setTimeout(scheduleCapture, delay));
  };

  const removeClone = (shell) => {
    clones.delete(shell);
    shell.remove();
  };

  const animateClosedUrlbar = () => {
    if (!lastRect || !lastSnapshot || lastRect.width < 16 || lastRect.height < 16) {
      return;
    }

    const shell = document.createElementNS(HTML_NS, "div");
    shell.className = "zen-remodelled-urlbar-close-shell";
    shell.appendChild(lastSnapshot);
    lastSnapshot = null;

    setImportant(shell, "block-size", `${lastRect.height}px`);
    setImportant(shell, "inline-size", `${lastRect.width}px`);
    setImportant(shell, "left", `${lastRect.left}px`);
    setImportant(shell, "top", `${lastRect.top}px`);

    clones.add(shell);
    document.documentElement.appendChild(shell);

    shell.addEventListener("animationend", () => removeClone(shell), { once: true });
    window.setTimeout(() => removeClone(shell), 620);
  };

  const observer = new MutationObserver(() => {
    const isOpen = urlbar.hasAttribute("open");

    if (isOpen) {
      syncFocusLayer(true);
      scheduleOpeningCaptures();
    } else if (wasOpen) {
      syncFocusLayer(false);
      clearCaptureTimers();
      animateClosedUrlbar();
    }

    wasOpen = isOpen;
  });

  observer.observe(urlbar, {
    attributeFilter: ["open", "breakout-extend", "zen-floating-urlbar"],
    attributes: true
  });

  const captureObserver = new MutationObserver(() => {
    scheduleCapture();
  });

  captureObserver.observe(urlbar, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });

  const inputListener = (event) => {
    if (event.target.closest?.("#urlbar")) {
      scheduleCapture();
    }
  };

  urlbar.addEventListener("input", inputListener, true);

  if (wasOpen) {
    syncFocusLayer(true);
    scheduleOpeningCaptures();
  }

  const cleanup = () => {
    clearCaptureTimers();
    if (captureFrame) {
      window.cancelAnimationFrame(captureFrame);
    }
    window.clearTimeout(focusLayerCleanupTimer);
    clearFocusLayers(true);
    observer.disconnect();
    captureObserver.disconnect();
    urlbar.removeEventListener("input", inputListener, true);
    style.remove();
    Object.values(focusLayers).forEach((layer) => layer.remove());
    clones.forEach((clone) => clone.remove());
    clones.clear();
    delete window[cleanupKey];
  };

  window[cleanupKey] = cleanup;
  window.addUnloadListener?.(cleanup);
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
