'use strict';

const suspiciousHost = /(^|\.)(?:popads|popcash|onclicka|onclickads|propellerads|exoclick|exosrv|adsterra|hilltopads|pushground|evadav|zeropark|clickadu|tsyndicate|realsrv|ad-maven)\./i;
const tabCounts = new Map();
const safeUrls = new Map();
const pendingPopupTabs = new Map();

const getHost = (rawUrl) => {
  try { return new URL(rawUrl).hostname; } catch (_) { return ''; }
};

const getProtection = async (url) => {
  const hostname = getHost(url);
  const { disabledHosts = [], strictHosts = [] } = await chrome.storage.local.get({
    disabledHosts: [],
    strictHosts: []
  });
  return {
    enabled: !hostname || !disabledHosts.includes(hostname),
    strict: Boolean(hostname && strictHosts.includes(hostname))
  };
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ disabledHosts: [], strictHosts: [] }).then(({ disabledHosts, strictHosts }) => {
    chrome.storage.local.set({ disabledHosts, strictHosts });
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'blocked' || !sender.tab?.id) return;
  const tabId = sender.tab.id;
  const count = (tabCounts.get(tabId) || 0) + Number(message.count || 1);
  tabCounts.set(tabId, count);
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#ef4444' });
  chrome.action.setBadgeText({ tabId, text: count > 99 ? '99+' : String(count) });
});

chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  let opener;
  try { opener = await chrome.tabs.get(details.sourceTabId); } catch (_) { return; }
  const protection = await getProtection(opener.url || '');
  if (!protection.enabled) return;

  const pending = {
    openerTabId: details.sourceTabId,
    openerHost: getHost(opener.url || ''),
    strict: protection.strict,
    createdAt: Date.now()
  };
  const host = getHost(details.url);
  const strictCrossSite = pending.strict && host && host !== pending.openerHost;

  if (suspiciousHost.test(host) || strictCrossSite) {
    try {
      await chrome.tabs.remove(details.tabId);
      const count = (tabCounts.get(details.sourceTabId) || 0) + 1;
      tabCounts.set(details.sourceTabId, count);
      await chrome.action.setBadgeBackgroundColor({ tabId: details.sourceTabId, color: '#ef4444' });
      await chrome.action.setBadgeText({ tabId: details.sourceTabId, text: String(Math.min(count, 99)) });
    } catch (_) {}
    return;
  }

  // Only page-created navigation targets are tracked here. Tabs opened from
  // Chrome itself (for example, Ctrl+T or the new-tab button) never enter this
  // map and therefore remain untouched even when the source site uses strict mode.
  pendingPopupTabs.set(details.tabId, pending);
  setTimeout(() => pendingPopupTabs.delete(details.tabId), 10000);
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !/^https?:/.test(details.url)) return;
  const host = getHost(details.url);

  const pending = pendingPopupTabs.get(details.tabId);
  if (pending) {
    const strictCrossSite = pending.strict && host && host !== pending.openerHost;
    if (suspiciousHost.test(host) || strictCrossSite) {
      pendingPopupTabs.delete(details.tabId);
      try { await chrome.tabs.remove(details.tabId); } catch (_) {}
      return;
    }
    pendingPopupTabs.delete(details.tabId);
  }

  if (!suspiciousHost.test(host)) return;
  const previous = safeUrls.get(details.tabId);
  if (!previous || !(await getProtection(previous)).enabled) return;
  try { await chrome.tabs.update(details.tabId, { url: previous }); } catch (_) {}
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0 || !/^https?:/.test(details.url)) return;
  if (!suspiciousHost.test(getHost(details.url))) safeUrls.set(details.tabId, details.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
  safeUrls.delete(tabId);
  pendingPopupTabs.delete(tabId);
});
