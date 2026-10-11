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

Click the StreamShield toolbar icon to pause or resume protection for the
current site. This is useful when a trusted site needs a legitimate pop-up.
Chrome's Extensions page can disable or remove StreamShield entirely.

## How it works

- Declarative Net Request rules block requests to common advertising and
  pop-up networks.
- A page-level guard prevents cross-origin pop-ups and suspicious redirects.
- Known advertising frames and overlays are removed from pages.
- Fullscreen and video-player controls are explicitly exempted.

## Updating a local installation

After updating these files, use the reload button for StreamShield on
`chrome://extensions`, then reload any already-open streaming tabs.
