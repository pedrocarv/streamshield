'use strict';

const toggle = document.getElementById('enabled');
const hostnameLabel = document.getElementById('hostname');
const summary = document.getElementById('summary');
let hostname = '';

const updateCopy = () => {
  summary.textContent = toggle.checked ? 'Protection is on' : 'Protection is paused here';
};

chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
  try { hostname = new URL(tab.url).hostname; } catch (_) {}
  hostnameLabel.textContent = hostname || 'This Chrome page';

  const { disabledHosts = [] } = await chrome.storage.local.get({ disabledHosts: [] });
  toggle.checked = hostname ? !disabledHosts.includes(hostname) : true;
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
});
