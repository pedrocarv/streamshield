# StreamShield

StreamShield is a lightweight Chrome Manifest V3 extension that blocks common
ad networks, pop-ups, pop-unders, and known redirect traps. It was designed for
video-streaming pages while preserving fullscreen and normal player controls.

It does not collect, store, or transmit browsing data.

## Install in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this repository's folder.
5. Optionally pin StreamShield from Chrome's Extensions menu.

## Controls

Click the StreamShield toolbar icon to choose protection for the current site:

- **Balanced protection** is the default. It allows legitimate new windows and
  tabs while blocking known or clearly suspicious ad destinations.
- **Strict pop-up blocking** is optional per site. Use it on streaming sites
  that keep opening unknown pop-ups or redirecting the current tab. Tabs opened
  with Chrome's new-tab button or keyboard shortcut are never blocked.
- The main protection switch pauses StreamShield completely on the current
  site. Chrome's Extensions page can disable or remove it entirely.

## How it works

- Declarative Net Request rules block requests to common advertising and
  pop-up networks.
- A page-level guard prevents suspicious pop-ups and redirects. Cross-site
  windows are blocked broadly only for sites where strict mode is enabled.
  That setting is inherited by embedded video-player frames on the site.
- Known advertising frames and overlays are removed from pages.
- Fullscreen and video-player controls are explicitly exempted.

## Updating a local installation

After updating these files, use the reload button for StreamShield on
`chrome://extensions`, then reload any already-open streaming tabs.
