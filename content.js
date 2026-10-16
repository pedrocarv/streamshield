(() => {
  'use strict';

  const STATE_EVENT = '__streamshield_state_v1';
  const BLOCK_EVENT = '__streamshield_blocked_v1';
  let blockedCount = 0;
  let toastTimer;

  const applyState = ({ enabled = true, strict = false } = {}) => {
    window.dispatchEvent(new CustomEvent(STATE_EVENT, {
      detail: JSON.stringify({ enabled, strict })
    }));
    document.documentElement.toggleAttribute('data-streamshield-disabled', !enabled);
  };

  const refreshState = () => chrome.runtime.sendMessage({ type: 'getProtection' })
    .then(applyState)
    .catch(() => applyState());

  refreshState();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.disabledHosts || changes.strictHosts)) {
      refreshState();
    }
  });

  const showToast = () => {
    if (!document.documentElement) return;
    let toast = document.getElementById('__streamshield_toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__streamshield_toast';
      document.documentElement.appendChild(toast);
    }
    toast.textContent = blockedCount === 1
      ? 'StreamShield blocked a pop-up or redirect'
      : `StreamShield blocked ${blockedCount} pop-ups or redirects`;
    toast.classList.add('__streamshield_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('__streamshield_visible'), 2400);
  };

  addEventListener(BLOCK_EVENT, () => {
    blockedCount += 1;
    showToast();
    chrome.runtime.sendMessage({ type: 'blocked', count: 1 }).catch(() => {});
  }, true);

  const removeKnownAds = () => {
    if (document.documentElement.hasAttribute('data-streamshield-disabled')) return;
    const selectors = [
      'ins.adsbygoogle',
      'iframe[src*="doubleclick.net"]',
      'iframe[src*="googlesyndication.com"]',
      'iframe[src*="popads.net"]',
      'iframe[src*="onclickads.net"]',
      '[id*="popunder" i]',
      '[class*="popunder" i]'
    ];
    for (const node of document.querySelectorAll(selectors.join(','))) node.remove();
  };

  new MutationObserver(removeKnownAds).observe(document, { childList: true, subtree: true });
  addEventListener('DOMContentLoaded', removeKnownAds, { once: true });
})();
