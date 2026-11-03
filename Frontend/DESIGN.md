# Logistimus — DESIGN.md

Design system for **Logistimus**, a logistics and fleet platform. Derived from a reference of whitewashed buildings, royal-blue shutters and open sky. Build from this file alone; the image is not needed.

Live style board: https://claude.ai/artifact/H9eefHTVVTfcPh59ujSfUV

---

## 1. Principles

1. **Calm over loud.** Logistics is stressful. The interface is the quiet part: flat tones, generous space, one deep blue for everything that matters.
2. **One accent, used for action.** Royal Blue is ink and primary action. Powder Blue is surface and soft emphasis. Nothing else competes.
3. **Flat, rounded, stacked.** Rounded blocks stacked with even gaps. No shadows, no gradients on UI. Depth comes from tone and a 1px line.
4. **Light type, strong contrast.** Light weights are only safe because the ink is dark. Never set light weights on mid-tones.
5. **Numbers are the hero.** Loads, ETAs, on-time rates. Big, light, with a small label.
6. **Every text/background pair is listed** (section 3.4). Anything not listed is not allowed.

Voice: plain, factual, sentence case, units always shown. "Load 4821 is 12 min late" not "Heads up! Something's delayed."

---

## 2. Color

### 2.1 Core palette

| Token | Name | Hex | Role | Share (light) | Share (dark) |
|---|---|---|---|---|---|
| `ice` | Ice White | `#F4FEFF` | Ground, light text on dark | 60% | text only |
| `powder` | Powder Blue | `#A9C0E0` | Surfaces, soft accent, focus ring | 30% | 10% |
| `royal` | Royal Blue | `#0E2F76` | Ink, primary action, dark surfaces | 10% | 30% |
| `midnight` | Midnight | `#061336` | Dark-mode ground (Royal shaded) | — | 60% |

### 2.2 Blue ramp (one continuous ramp; core colors sit at 50, 300, 800, 950)

| Step | Hex | Step | Hex |
|---|---|---|---|
| 50 | `#F4FEFF` | 600 | `#4C69A0` |
| 100 | `#DBE9F5` | 700 | `#2D4C8B` |
| 200 | `#C2D5EA` | 800 | `#0E2F76` |
| 300 | `#A9C0E0` | 900 | `#0A2156` |
| 400 | `#8AA3CB` | 950 | `#061336` |
| 500 | `#6B86B6` | muted text | `#3F5C96` (between 600 and 700) |

### 2.3 Warm neutral (sampled from shadowed stone and cobbles)

`stone-50 #F6F4F0` · `stone-100 #ECE9E3` · `stone-200 #D9D5CC` · `stone-400 #A8A398` · `stone-600 #6F6B62` · `stone-800 #3A3833`

Use for paper mode, print, tables on documents, and quiet dividers. Never mix stone with Ice White in the same surface.

### 2.4 Semantic (muted)

These three are the only hues outside the reference. They are desaturated, always paired with an icon and a text label, and never used as large fills.

| Token | Hex | Text on it |
|---|---|---|
| `success` | `#7FA9A6` | Midnight (7.1:1) |
| `warning` | `#C9B58A` | Midnight (9.1:1) |
| `danger` | `#C08A88` | Midnight (6.3:1) |
| `info` | `#6B86B6` (blue 500) | Midnight (4.9:1) |

Strict mode, if wanted later: drop the three hues and mark states with icon, label and weight on the blue ramp only.

### 2.5 Text-on-color pairs (all approved pairs)

| Text | Background | Ratio | Use |
|---|---|---|---|
| Royal `#0E2F76` | Ice `#F4FEFF` | 12.1:1 | Default body and headings, light mode |
| Royal | Blue 100 `#DBE9F5` | 10.1:1 | Tinted panels |
| Royal | Blue 200 `#C2D5EA` | 8.3:1 | Hover on tinted panels |
| Royal | Powder `#A9C0E0` | 6.7:1 | Chips, secondary buttons, Powder sections |
| Royal | Stone 50 `#F6F4F0` | 11.3:1 | Paper mode |
| Royal | Stone 100 `#ECE9E3` | 10.3:1 | Paper mode tables |
| Muted `#3F5C96` | Ice | 6.4:1 | Secondary text, captions (light mode) |
| Ice | Royal | 12.1:1 | Primary buttons, dark cards, dark slides |
| Ice | Blue 700 `#2D4C8B` | 8.1:1 | Hover on primary buttons |
| Ice | Blue 900 `#0A2156` | 15.0:1 | Deep panels |
| Ice | Midnight | 17.7:1 | Body in dark mode |
| Powder | Royal | 6.7:1 | Secondary text on Royal |
| Powder | Midnight | 9.8:1 | Secondary text in dark mode |
| Midnight | Success / Warning / Danger / Info | see 2.4 | State badges |

**Banned pairs:** Ice on Powder (1.8:1, this is what the reference image does; do not copy it). Muted `#3F5C96` on Powder (3.6:1). Powder on Ice (1.8:1). Any text on Blue 400 to 600 except Midnight at 18px or larger.

### 2.6 Modes (same tokens, remapped)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F4FEFF` | `#061336` |
| `--fg` | `#0E2F76` | `#F4FEFF` |
| `--surf` | `#FFFFFF` | `#0E2F76` |
| `--surf-soft` | `#A9C0E0` | `#0A2156` |
| `--mut` | `#3F5C96` | `#A9C0E0` |
| `--line` | `#CFDBEE` | `#2A4A8E` |
| `--accent` (primary button bg) | `#0E2F76` | `#F4FEFF` |
| `--on-accent` | `#F4FEFF` | `#0E2F76` |
| `--focus` | `#A9C0E0` | `#A9C0E0` |

Default mode: **light**. Dark follows `prefers-color-scheme` unless the user chooses.

---

## 3. Typography

**Family: Hanken Grotesk** (Google Fonts), weights 300, 400, 500, 600. **Mono: DM Mono** 400, only for IDs, weights, timestamps, hex and other data a person may copy.
Fallbacks: `'Helvetica Neue', system-ui, sans-serif` and `ui-monospace, monospace`. Never use Inter, Roboto or Arial.

### 3.1 Scale

| Role | Desktop | Mobile | Weight | Case | Tracking | Line-height |
|---|---|---|---|---|---|---|
| Display | 72px | 42px | 300 | Sentence | −0.025em | 1.02 / 1.05 |
| Heading | 28px | 24px | 300 | Sentence | −0.01em | 1.2 |
| Sub-line | 24px | 19px | 300 | Sentence | 0 | 1.3 |
| Label | 12.5px | 11.5px | 300 (400 on small sizes) | **Caps** | +0.16em / +0.14em | 1.3 |
| Pill title | 16px | 15px | 300 | **Caps** | +0.06em | 1.3 |
| Body | 16px | 16px | 400 | Sentence | 0 | 1.6 |
| Button | 15px | 15px | 500 | Sentence | 0 | 1 |
| Mono | 12.5px | 12px | 400 | As typed | +0.04em | 1.4 |
| Stat number | 48px | 40px | 300 | — | −0.03em | 1 |

### 3.2 Rules

- Caps only for the label tier: pill titles, small eyebrows on covers, stat captions. Never for headlines or body.
- Display and headings are 300. Below 20px, never use 300 on Powder or any mid-tone.
- Body line length under 75 characters.
- Numbers in tables use tabular figures: `font-variant-numeric: tabular-nums`.

---

## 4. Shape and space

| Token | Value | Use |
|---|---|---|
| `--r-card` | 28px | Cards, pills (stack blocks), hero panels |
| `--r-frame` | 20px | Slide and carousel frames, ramps |
| `--r-input` | 16px | Inputs, small panels, badges |
| `--r-full` | 999px | Buttons, chips, nav |
| `--bw` | 1px | All borders, `--line` color |
| Shadow | none | Never |

Space scale (base 4): `4 8 12 16 24 32 48 64 96`. Gap inside a pill stack: 14px (about half the corner radius). Card padding 26px; pill padding 34px vertical. Page max width 1080px, side padding 20px.

---

## 5. Components

- **Primary button:** bg `--accent`, text `--on-accent`, 44px min height, 24px side padding, full radius, weight 500. Hover: bg blue 700 (light) or blue 100 (dark). Focus: 3px Powder ring, 2px offset.
- **Secondary button:** bg Powder, text Royal. Hover bg `#BFD0EA`.
- **Outline button:** transparent, 1px currentColor border, text `--fg`. Hover bg `--line`.
- **Disabled:** bg `--line`, text `--mut`, `cursor:not-allowed`.
- **Chip:** 32px high, full radius, 14px side padding, 13.6px text. Variants: Powder (default), Royal (selected), line (neutral), outline.
- **Card:** bg `--surf`, 1px `--line`, radius 28, padding 26. Dark card: bg Royal, text Ice.
- **Pill block (signature):** radius 28, centered text, Caps title over a mono or sans value line at 85% opacity. Stack of 3, tones Ice, Powder, Royal, in that order top to bottom.
- **Input:** 48px high, radius 16, 1px Powder border, bg `--surf`, 16px side padding. Label above in 13.6px `--mut`. Error: border `danger`, message below in Midnight on `danger` badge with icon.
- **Nav:** pill container, bg `--surf`, 1px `--line`, 6px padding. Brand left (weight 500), links 14px, active link bg Powder with Royal text, one primary button at the end. Collapses to a menu button under 560px.
- **Stat:** number (300, 48px) over Caps label. Optionally inside a pill.
- **Status badge:** chip with icon + label, state color bg, Midnight text.
- **Table:** no zebra. 1px `--line` row dividers, header in Label style, numbers right-aligned with tabular figures, IDs in mono.

---

## 6. Signature motifs

1. **Stacked pills:** three flat rounded blocks, evenly spaced, centered. Use for stats, steps, plan tiers.
2. **Two-tier text:** Caps title over a small value line.
3. **Sky and wall background:** soft Powder-to-Ice sky, tilted Ice walls at the edges, thin Royal rail lines. Hero and covers only.
4. **Flat overlay:** opaque Ice, Powder or Royal blocks over the image. No glass, no blur.

Drop: ghost text, glass chips, drop shadows, gradients on UI surfaces.

---

## 7. Backgrounds

- **Real render:** the reference-style photo or a 3D render of tilted whitewashed walls, royal rails and shutters under a cloudy sky. Keep the lower third calm for text. Overlay with flat pills.
- **CSS fallback (hero):**

```css
.sky{position:relative;overflow:hidden;isolation:isolate;
 background:
  radial-gradient(40% 22% at 72% 16%,rgba(255,255,255,.95),transparent 70%),
  radial-gradient(30% 16% at 30% 10%,rgba(255,255,255,.75),transparent 70%),
  linear-gradient(180deg,#7E9CCF 0%,#A9C0E0 45%,#F4FEFF 100%)}
.sky::before,.sky::after{content:"";position:absolute;z-index:-1;bottom:-4%;width:30%;height:78%;background:#F4FEFF}
.sky::before{left:-4%;clip-path:polygon(0 12%,100% 0,100% 100%,0 100%)}
.sky::after{right:-4%;clip-path:polygon(0 0,100% 14%,100% 100%,0 100%)}
```

- **Dark:** flat Midnight. Optional single radial Royal glow at top, 40% opacity.
- **App UI:** flat `--bg`. No sky.

---

## 8. Format recipes

| Format | Ground | Layout | Notes |
|---|---|---|---|
| **Website** | Ice; Powder for alternate sections | Centered hero on sky background, then left-aligned content; max width 1080 | One Royal CTA per screen. Stat pills under hero. |
| **Slides 16:9** | Royal for cover and section breaks, Ice for content | Margin 6% top, 7% sides. Title 6.2% of width, body 2.1% | One idea per slide. Numbers in stat pills. No bullets longer than 2 lines. |
| **Carousel 4:5** | Cover Royal, middle Ice, last Powder | Margin 9%. Headline 9.6% of width | Max 25 words per card. Last card has one button-shaped CTA. |
| **Docs / print** | Stone 50, Royal ink | Two columns max, Powder 3px rule under title | Use stone neutrals only. Mono for IDs. |
| **App UI** | `--bg` | 28px cards, pill nav, 16px base spacing | Royal primary, Powder focus, state badges with icons. |

Instagram/Telegram: export 1080×1350. Keep text 90px from the edges.

---

## 9. Motion

- Hover and press: 150ms ease, color only.
- One orchestrated moment per page at most (a 400ms fade of the hero stack). No per-section slide-ups.
- Respect `prefers-reduced-motion`: remove all non-essential transitions.
- Live data (ETA, status) updates with a 200ms cross-fade, never a bounce.

---

## 10. Do and don't

**Do**
- Put Royal on Ice and Royal on Powder.
- Keep three tones per layout, with Royal under 15%.
- Pair every state color with an icon and a label.
- Use mono for IDs, weights, times.

**Don't**
- Put white text on Powder.
- Add shadows, gradients on UI, or new hues.
- Use caps for headlines.
- Use more than one primary button per view.

---

## 11. Copy-paste tokens

### CSS

```css
:root{
 --ice:#F4FEFF;--powder:#A9C0E0;--royal:#0E2F76;--midnight:#061336;
 --blue-100:#DBE9F5;--blue-200:#C2D5EA;--blue-400:#8AA3CB;--blue-500:#6B86B6;
 --blue-600:#4C69A0;--blue-700:#2D4C8B;--blue-900:#0A2156;
 --stone-50:#F6F4F0;--stone-100:#ECE9E3;--stone-200:#D9D5CC;--stone-400:#A8A398;--stone-600:#6F6B62;--stone-800:#3A3833;
 --success:#7FA9A6;--warning:#C9B58A;--danger:#C08A88;--info:#6B86B6;
 --bg:var(--ice);--fg:var(--royal);--surf:#fff;--surf-soft:var(--powder);
 --mut:#3F5C96;--line:#CFDBEE;--accent:var(--royal);--on-accent:var(--ice);--focus:var(--powder);
 --r-card:28px;--r-frame:20px;--r-input:16px;--r-full:999px;
 --f:'Hanken Grotesk','Helvetica Neue',system-ui,sans-serif;
 --m:'DM Mono',ui-monospace,monospace;
}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
 --bg:var(--midnight);--fg:var(--ice);--surf:var(--royal);--surf-soft:var(--blue-900);
 --mut:var(--powder);--line:#2A4A8E;--accent:var(--ice);--on-accent:var(--royal)}}
:root[data-theme="dark"]{--bg:var(--midnight);--fg:var(--ice);--surf:var(--royal);--surf-soft:var(--blue-900);--mut:var(--powder);--line:#2A4A8E;--accent:var(--ice);--on-accent:var(--royal)}
body{background:var(--bg);color:var(--fg);font:400 1rem/1.6 var(--f)}
.label{font:300 .78rem/1.3 var(--f);letter-spacing:.16em;text-transform:uppercase}
```

```html
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
```

### Tailwind (v3 `tailwind.config.js`)

```js
theme: { extend: {
  colors: {
    ice:'#F4FEFF', powder:'#A9C0E0', royal:'#0E2F76', midnight:'#061336',
    blue:{50:'#F4FEFF',100:'#DBE9F5',200:'#C2D5EA',300:'#A9C0E0',400:'#8AA3CB',500:'#6B86B6',600:'#4C69A0',700:'#2D4C8B',800:'#0E2F76',900:'#0A2156',950:'#061336'},
    stone:{50:'#F6F4F0',100:'#ECE9E3',200:'#D9D5CC',400:'#A8A398',600:'#6F6B62',800:'#3A3833'},
    success:'#7FA9A6', warning:'#C9B58A', danger:'#C08A88', muted:'#3F5C96'
  },
  fontFamily:{ sans:['Hanken Grotesk','Helvetica Neue','system-ui','sans-serif'], mono:['DM Mono','ui-monospace','monospace'] },
  borderRadius:{ card:'28px', frame:'20px', input:'16px' },
  letterSpacing:{ label:'0.16em', display:'-0.025em' }
}}
```

Example: `class="rounded-card bg-powder text-royal p-8 text-center"`

---

## 12. Pre-ship checklist

- [ ] Every text/background pair appears in section 2.5; no banned pairs.
- [ ] No hue outside the blue ramp, stone neutrals and the four muted state colors.
- [ ] Hanken Grotesk and DM Mono load; no Inter, Roboto or Arial fallbacks first.
- [ ] Caps used only in the label tier.
- [ ] Radius 28 on cards, 16 on inputs, full on buttons and chips. No shadows.
- [ ] One primary button per view; focus ring visible on every interactive element.
- [ ] Royal share under 15% of the layout (light mode).
- [ ] State colors always paired with icon and label.
- [ ] Dark mode checked with the same tokens.
- [ ] Mobile checked at 375px; display text at 42px; no sideways scroll.
- [ ] `prefers-reduced-motion` honored.
- [ ] Slides and carousels exported at 16:9 and 1080×1350.
