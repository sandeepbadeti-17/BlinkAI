// js/utils.js - BlinkAI v3 utility helpers

/**
 * Clamps an element so it stays fully within the viewport.
 * Called after inserting a floating element into the DOM.
 */
export function clampEl(el) {
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    if (r.right  > window.innerWidth)  el.style.left = window.innerWidth  - el.offsetWidth  - 10 + "px";
    if (r.bottom > window.innerHeight) el.style.top  = window.innerHeight - el.offsetHeight - 10 + "px";
    if (r.top  < 0) el.style.top  = "10px";
    if (r.left < 0) el.style.left = "10px";
  });
}

/**
 * Returns the number of words in a string.
 */
export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Makes an element draggable via a handle element.
 * Constrains movement to the visible viewport.
 */
export function makeDraggable(el, handle) {
  let startX, startY, originLeft, originTop;

  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    startX     = e.clientX;
    startY     = e.clientY;
    const rect = el.getBoundingClientRect();
    originLeft = rect.left;
    originTop  = rect.top;

    e.preventDefault();

    const onMove = (e) => {
      el.style.left = Math.max(0, Math.min(
        window.innerWidth  - el.offsetWidth,
        originLeft + e.clientX - startX
      )) + "px";
      el.style.top = Math.max(0, Math.min(
        window.innerHeight - el.offsetHeight,
        originTop  + e.clientY - startY
      )) + "px";
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  });
}

/**
 * Injects the blinkai.css stylesheet into the host page once.
 * Uses a <link> tag pointing at the extension's bundled CSS.
 */
export function injectStyles() {
  if (document.querySelector("#blinkai-styles")) return;
  const link  = document.createElement("link");
  link.id     = "blinkai-styles";
  link.rel    = "stylesheet";
  link.href   = chrome.runtime.getURL("css/blinkai.css");
  document.head.appendChild(link);
}
