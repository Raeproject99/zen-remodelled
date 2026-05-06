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
      animation: zen-remodelled-urlbar-close 0.24s cubic-bezier(0.23, 1, 0.32, 1) forwards !important;
      overflow: hidden !important;
      pointer-events: none !important;
      position: fixed !important;
      transform-origin: center center !important;
      z-index: 2147483647 !important;
    }

    .zen-remodelled-urlbar-close-shell > .zen-remodelled-urlbar-close-copy {
      animation: none !important;
      block-size: 100% !important;
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
  let wasOpen = urlbar.hasAttribute("open");
  let lastRect = null;
  let lastClone = null;
  let captureTimers = [];

  const clearCaptureTimers = () => {
    captureTimers.forEach((timer) => window.clearTimeout(timer));
    captureTimers = [];
  };

  const captureOpenUrlbar = () => {
    if (!urlbar.hasAttribute("open")) {
      return;
    }

    const rect = urlbar.getBoundingClientRect();
    if (rect.width < 16 || rect.height < 16) {
      return;
    }

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

    lastRect = rect;
    lastClone = clone;
  };

  const scheduleCapture = () => {
    clearCaptureTimers();
    window.requestAnimationFrame(captureOpenUrlbar);
    captureTimers = [80, 180, 320, 500].map((delay) => window.setTimeout(captureOpenUrlbar, delay));
  };

  const removeClone = (shell) => {
    clones.delete(shell);
    shell.remove();
  };

  const animateClosedUrlbar = () => {
    if (!lastRect || !lastClone || lastRect.width < 16 || lastRect.height < 16) {
      return;
    }

    const shell = document.createElementNS(HTML_NS, "div");
    shell.className = "zen-remodelled-urlbar-close-shell";
    shell.appendChild(lastClone.cloneNode(true));

    setImportant(shell, "block-size", `${lastRect.height}px`);
    setImportant(shell, "inline-size", `${lastRect.width}px`);
    setImportant(shell, "left", `${lastRect.left}px`);
    setImportant(shell, "top", `${lastRect.top}px`);

    clones.add(shell);
    document.documentElement.appendChild(shell);

    shell.addEventListener("animationend", () => removeClone(shell), { once: true });
    window.setTimeout(() => removeClone(shell), 360);
  };

  const observer = new MutationObserver(() => {
    const isOpen = urlbar.hasAttribute("open");

    if (isOpen) {
      scheduleCapture();
    } else if (wasOpen) {
      clearCaptureTimers();
      animateClosedUrlbar();
    }

    wasOpen = isOpen;
  });

  observer.observe(urlbar, {
    attributeFilter: ["open", "breakout-extend", "zen-floating-urlbar"],
    attributes: true
  });

  if (wasOpen) {
    scheduleCapture();
  }

  const cleanup = () => {
    clearCaptureTimers();
    observer.disconnect();
    style.remove();
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
