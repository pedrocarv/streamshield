'use strict';

const suspiciousHost = /(^|\.)(?:popads|popcash|onclicka|onclickads|propellerads|exoclick|exosrv|adsterra|hilltopads|pushground|evadav|zeropark|clickadu|tsyndicate|realsrv|ad-maven)\./i;
const tabCounts = new Map();
const safeUrls = new Map();
const pendingPopupTabs = new Map();

const getHost = (rawUrl) => {
  try { return new URL(rawUrl).hostname; } catch (_) { return ''; }
};

const isProtected = async (url) => {
  const hostname = getHost(url);
  if (!hostname) return true;
  const { disabledHosts = [] } = await chrome.storage.local.get({ disabledHosts: [] });
  return !disabledHosts.includes(hostname);
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ disabledHosts: [] }).then(({ disabledHosts }) => {
    chrome.storage.local.set({ disabledHosts });
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

chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.openerTabId) return;
  let opener;
  try { opener = await chrome.tabs.get(tab.openerTabId); } catch (_) { return; }
  if (!(await isProtected(opener.url || ''))) return;

  pendingPopupTabs.set(tab.id, { openerTabId: tab.openerTabId, createdAt: Date.now() });
  setTimeout(async () => {
    const pending = pendingPopupTabs.get(tab.id);
    if (!pending) return;
    pendingPopupTabs.delete(tab.id);
    try {
      const current = await chrome.tabs.get(tab.id);
      const url = current.pendingUrl || current.url || '';
      if (!url || url === 'about:blank' || suspiciousHost.test(getHost(url))) {
        await chrome.tabs.remove(tab.id);
        const count = (tabCounts.get(tab.openerTabId) || 0) + 1;
        tabCounts.set(tab.openerTabId, count);
        await chrome.action.setBadgeBackgroundColor({ tabId: tab.openerTabId, color: '#ef4444' });
        await chrome.action.setBadgeText({ tabId: tab.openerTabId, text: String(Math.min(count, 99)) });
      }
    } catch (_) {}
  }, 350);
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !/^https?:/.test(details.url)) return;
  const host = getHost(details.url);

  if (pendingPopupTabs.has(details.tabId) && suspiciousHost.test(host)) {
    pendingPopupTabs.delete(details.tabId);
    try { await chrome.tabs.remove(details.tabId); } catch (_) {}
    return;
  }

  if (!suspiciousHost.test(host)) return;
  const previous = safeUrls.get(details.tabId);
  if (!previous || !(await isProtected(previous))) return;
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
