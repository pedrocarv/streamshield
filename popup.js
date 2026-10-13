'use strict';

const toggle = document.getElementById('enabled');
const strictToggle = document.getElementById('strict');
const hostnameLabel = document.getElementById('hostname');
const summary = document.getElementById('summary');
let hostname = '';

const updateCopy = () => {
  if (!toggle.checked) summary.textContent = 'Protection is paused here';
  else if (strictToggle.checked) summary.textContent = 'Strict protection is on';
  else summary.textContent = 'Balanced protection is on';
  strictToggle.disabled = !hostname || !toggle.checked;
};

chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
  try { hostname = new URL(tab.url).hostname; } catch (_) {}
  hostnameLabel.textContent = hostname || 'This Chrome page';

  const { disabledHosts = [], strictHosts = [] } = await chrome.storage.local.get({
    disabledHosts: [],
    strictHosts: []
  });
  toggle.checked = hostname ? !disabledHosts.includes(hostname) : true;
  strictToggle.checked = hostname ? strictHosts.includes(hostname) : false;
  toggle.disabled = !hostname;
  updateCopy();

  toggle.addEventListener('change', async () => {
    const result = await chrome.storage.local.get({ disabledHosts: [] });
    const set = new Set(result.disabledHosts);
    if (toggle.checked) set.delete(hostname);
    else set.add(hostname);
    await chrome.storage.local.set({ disabledHosts: [...set] });
    updateCopy();
    if (tab.id) chrome.tabs.reload(tab.id);
  });

  strictToggle.addEventListener('change', async () => {
    const result = await chrome.storage.local.get({ strictHosts: [] });
    const set = new Set(result.strictHosts);
    if (strictToggle.checked) set.add(hostname);
    else set.delete(hostname);
    await chrome.storage.local.set({ strictHosts: [...set] });
    updateCopy();
    if (tab.id) chrome.tabs.reload(tab.id);
  });
});
