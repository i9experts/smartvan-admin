// HTML map overlays built on google.maps.OverlayView.
//
// Why not google.maps.Marker / AdvancedMarkerElement: classic Marker is
// deprecated and can't rotate or glide; AdvancedMarkerElement only works when
// the Map was created with a cloud `mapId` (otherwise it silently renders
// nothing). OverlayView needs neither a mapId nor the `marker` library and
// lets us do heading rotation + smooth movement in plain CSS/JS.

import { bearing, distanceMeters } from '@/lib/geo';

export const NAVY = '#1B3B69';
export const YELLOW = '#FEC610';

type G = any;
let HtmlOverlayClass: any = null;

function getHtmlOverlayClass(g: G) {
  if (HtmlOverlayClass) return HtmlOverlayClass;
  class HtmlOverlay extends g.maps.OverlayView {
    el: HTMLDivElement;
    pos: { lat: number; lng: number };
    constructor(pos: { lat: number; lng: number }, el: HTMLDivElement) {
      super();
      this.pos = pos;
      this.el = el;
      this.el.style.position = 'absolute';
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.el);
    }
    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const p = proj.fromLatLngToDivPixel(new g.maps.LatLng(this.pos.lat, this.pos.lng));
      if (!p) return;
      this.el.style.left = `${p.x}px`;
      this.el.style.top = `${p.y}px`;
    }
    onRemove() {
      this.el.parentNode?.removeChild(this.el);
    }
    setPos(pos: { lat: number; lng: number }) {
      this.pos = pos;
      this.draw();
    }
  }
  HtmlOverlayClass = HtmlOverlay;
  return HtmlOverlay;
}

function el(html: string): HTMLDivElement {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const BUS_SVG = (fill: string, win: string) => `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="13" rx="3" fill="${fill}"/>
    <rect x="5.5" y="6.5" width="5" height="4" rx="1" fill="${win}"/>
    <rect x="13.5" y="6.5" width="5" height="4" rx="1" fill="${win}"/>
    <circle cx="8" cy="19" r="2" fill="${fill}"/><circle cx="16" cy="19" r="2" fill="${fill}"/>
  </svg>`;

// ─── Van ──────────────────────────────────────────────────────────────────────

export interface VanOverlayHandle {
  moveTo(lat: number, lng: number, heading: number | null): void;
  setStyle(opts: { selected: boolean; ringColor: string; label: string; dim: boolean }): void;
  getPosition(): { lat: number; lng: number };
  remove(): void;
}

const GLIDE_MS = 2800; // a bit under the 3 s admin throttle so motion looks continuous

export function createVanOverlay(
  g: G,
  map: any,
  init: { lat: number; lng: number; heading: number | null; onClick: () => void },
): VanOverlayHandle {
  const root = el(`
    <div style="transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center">
      <div data-wrap style="position:relative;width:44px;height:44px">
        <div data-dir style="position:absolute;inset:0;transition:transform .6s ease-out">
          <div style="position:absolute;left:50%;top:-5px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:11px solid ${YELLOW};filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))"></div>
        </div>
        <div data-body style="position:absolute;inset:4px;border-radius:50%;background:${NAVY};border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)">
          ${BUS_SVG(YELLOW, NAVY)}
        </div>
      </div>
      <div data-label style="margin-top:2px;padding:1px 6px;border-radius:9px;background:#fff;color:${NAVY};font:600 11px/16px system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>
    </div>`);
  root.addEventListener('click', (e) => { e.stopPropagation(); init.onClick(); });

  const dir = root.querySelector('[data-dir]') as HTMLElement;
  const body = root.querySelector('[data-body]') as HTMLElement;
  const wrap = root.querySelector('[data-wrap]') as HTMLElement;
  const label = root.querySelector('[data-label]') as HTMLElement;

  const Overlay = getHtmlOverlayClass(g);
  const ov = new Overlay({ lat: init.lat, lng: init.lng }, root);
  ov.setMap(map);

  let cur = { lat: init.lat, lng: init.lng };
  let rot = init.heading ?? 0;
  let raf = 0;
  dir.style.transform = `rotate(${rot}deg)`;

  const setRotation = (deg: number) => {
    // Take the shortest way round so 350° → 10° doesn't spin backwards.
    const diff = ((deg - rot + 540) % 360) - 180;
    rot += diff;
    dir.style.transform = `rotate(${rot}deg)`;
  };

  return {
    moveTo(lat, lng, heading) {
      const from = { ...cur };
      const to = { lat, lng };
      const dist = distanceMeters(from, to);
      if (dist < 0.5) return;
      if (heading != null) setRotation(heading);
      else if (dist > 3) setRotation(bearing(from, to));
      cancelAnimationFrame(raf);
      // A big jump (reconnect, first fix after a gap) snaps instead of gliding across the city.
      if (dist > 2000) { cur = to; ov.setPos(to); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / GLIDE_MS);
        cur = { lat: from.lat + (to.lat - from.lat) * k, lng: from.lng + (to.lng - from.lng) * k };
        ov.setPos(cur);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    setStyle({ selected, ringColor, label: text, dim }) {
      wrap.style.transform = selected ? 'scale(1.2)' : 'scale(1)';
      body.style.borderColor = ringColor;
      root.style.opacity = dim ? '0.65' : '1';
      root.style.zIndex = selected ? '1000' : '10';
      label.textContent = text;
      label.style.display = text ? 'block' : 'none';
    },
    getPosition: () => ({ ...cur }),
    remove() {
      cancelAnimationFrame(raf);
      ov.setMap(null);
    },
  };
}

// ─── Stops / school / start / end pins ────────────────────────────────────────

export interface PinHandle { remove(): void }

export function createPin(
  g: G,
  map: any,
  opts: {
    lat: number; lng: number;
    glyph: string;            // text inside the circle (number, "S", "A"…)
    color: string;            // fill colour
    textColor?: string;
    caption?: string;         // name shown beside the pin
    title?: string;
    dimmed?: boolean;         // e.g. already picked
    z?: number;
  },
): PinHandle {
  const root = el(`
    <div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;pointer-events:auto;${opts.dimmed ? 'opacity:.55;' : ''}" ${opts.title ? `title="${escapeHtml(opts.title)}"` : ''}>
      <div style="min-width:24px;height:24px;border-radius:12px;background:${opts.color};color:${opts.textColor ?? '#fff'};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 12px/1 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.4);padding:0 4px">${escapeHtml(opts.glyph)}</div>
      ${opts.caption ? `<div style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.92);color:#1f2937;font:500 11px/16px system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.25)">${escapeHtml(opts.caption)}</div>` : ''}
    </div>`);
  root.style.zIndex = String(opts.z ?? 5);
  const Overlay = getHtmlOverlayClass(g);
  const ov = new Overlay({ lat: opts.lat, lng: opts.lng }, root);
  ov.setMap(map);
  return { remove: () => ov.setMap(null) };
}
