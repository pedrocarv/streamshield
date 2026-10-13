(() => {
  'use strict';

  const STATE_EVENT = '__streamshield_state_v1';
  const BLOCK_EVENT = '__streamshield_blocked_v1';
  let enabled = true;
  let strict = false;

  const badHost = /(^|\.)(?:popads|popcash|onclicka|onclickads|propellerads|exoclick|exosrv|adsterra|hilltopads|pushground|evadav|zeropark|clickadu|tsyndicate|realsrv|ad-maven)\./i;
  const badWords = /(?:popunder|pop-under|clickunder|interstitial|redirect(?:or)?|adserver|ad-serving|push-notification|forced-click)/i;

  const emitBlocked = (kind, url) => {
    window.dispatchEvent(new CustomEvent(BLOCK_EVENT, {
      detail: { kind, url: String(url || '').slice(0, 500) }
    }));
  };

  const parseUrl = (value) => {
    try {
      return new URL(String(value || 'about:blank'), location.href);
    } catch (_) {
      return null;
    }
  };

  const isSuspiciousUrl = (value) => {
    const url = parseUrl(value);
    if (!url) return true;
    if (url.protocol === 'javascript:' || url.protocol === 'data:') return true;
    if (url.protocol === 'about:') return false;
    return badHost.test(url.hostname) || badWords.test(url.href);
  };

  const isCrossOrigin = (value) => {
    const url = parseUrl(value);
    return Boolean(url && /^https?:$/.test(url.protocol) && url.origin !== location.origin);
  };

  const looksLikeOverlay = (element) => {
    if (!(element instanceof Element)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const viewportArea = Math.max(1, innerWidth * innerHeight);
    const elementArea = Math.max(0, rect.width * rect.height);
    const z = Number.parseInt(style.zIndex, 10);
    const positioned = style.position === 'fixed' || style.position === 'absolute';
    const transparent = Number.parseFloat(style.opacity || '1') < 0.2 || style.backgroundColor === 'rgba(0, 0, 0, 0)';
    return positioned && elementArea / viewportArea > 0.55 && ((Number.isFinite(z) && z >= 999) || transparent);
  };

  const isMediaControl = (path) => path.some((node) => {
    if (!(node instanceof Element)) return false;
    if (node instanceof HTMLVideoElement) return true;
    const controlHint = [
      node.id,
      node.className,
      node.getAttribute('title'),
      node.getAttribute('aria-label'),
      node.getAttribute('data-testid')
    ].filter((value) => typeof value === 'string').join(' ');
    return /(?:full[ -]?screen|fullscreen|video[ -]?control|player[ -]?control)/i.test(controlHint);
  });

  const nativeOpen = window.open.bind(window);
  window.open = function streamShieldOpen(url, target, features) {
    if (!enabled) return nativeOpen(url, target, features);

    const destination = String(url || 'about:blank');
    if (isSuspiciousUrl(destination) || (strict && isCrossOrigin(destination))) {
      emitBlocked('popup', destination);
      return null;
    }
    return nativeOpen(url, target, features);
  };

  addEventListener(STATE_EVENT, (event) => {
    try {
      const state = typeof event.detail === 'string'
        ? JSON.parse(event.detail)
        : { enabled: event.detail !== false, strict: false };
      enabled = state.enabled !== false;
      strict = state.strict === true;
    } catch (_) {
      enabled = true;
      strict = false;
    }
  }, true);

  addEventListener('click', (event) => {
    if (!enabled) return;

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (isMediaControl(path)) return;

    const anchor = path.find((node) => node instanceof HTMLAnchorElement);
    // Only classify the directly clicked surface as an overlay. Video players
    // often have a large, positioned ancestor around legitimate controls.
    const overlay = looksLikeOverlay(event.target) ? event.target : null;

    if (anchor) {
      const destination = anchor.href || anchor.getAttribute('href') || '';
      const externalNewTab = isCrossOrigin(destination) && (anchor.target === '_blank' || !event.isTrusted);
      const strictPopup = strict && (externalNewTab || (overlay && isCrossOrigin(destination)));
      if (isSuspiciousUrl(destination) || strictPopup) {
        event.preventDefault();
        event.stopImmediatePropagation();
        emitBlocked('redirect', destination);
      }
      return;
    }

    if (strict && overlay) {
      event.preventDefault();
      event.stopImmediatePropagation();
      emitBlocked('overlay', location.href);
    }
  }, true);

  if ('navigation' in window) {
    navigation.addEventListener('navigate', (event) => {
      if (!enabled || event.userInitiated || !event.canIntercept) return;
      if (isSuspiciousUrl(event.destination.url)) {
        event.preventDefault();
        emitBlocked('navigation', event.destination.url);
      }
    });
  }
})();
