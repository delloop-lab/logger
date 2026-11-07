# TimberVault — Landing Page (handoff package)

A complete, self-contained marketing landing page for **TimberVault**, a timber
inventory / offcut / cut-planning tool for woodworkers.

This folder is meant to be dropped into another codebase and integrated. The
page itself is plain React + Tailwind CSS — no backend, no API calls, no auth,
no state management. It can be lifted out of this scaffold and into any React
app, or rewritten into plain HTML with the tokens below.

---

## Stack

| | |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) v1 (React 19, Vite 8, SSR) |
| Routing | File-based — `src/routes/index.tsx` is `/` |
| Styling | Tailwind CSS **v4** (CSS-first config in `src/styles.css`, no `tailwind.config.js`) |
| Fonts | Fraunces (display serif) + Manrope (body sans), loaded from Google Fonts |
| Package manager | bun (`bun.lock` included) |

## Run it

```bash
bun install
bun run dev      # http://localhost:8080
bun run build    # production build
bun run test     # routing smoke test
```

---

## File map — what actually matters

| File | Role |
| --- | --- |
| **`src/routes/index.tsx`** | **The landing page.** Every section, all copy, all layout. Start here. |
| **`src/styles.css`** | **Design system.** Colour tokens, fonts, radii, the `eyebrow` utility. |
| `src/assets/*.jpg` | The 3 photos the page uses (see Assets). |
| `src/routes/__root.tsx` | App shell: `<html>`, Google Fonts `<link>`, favicon, 404/error screens. |
| `src/router.tsx`, `src/server.ts`, `src/start.ts`, `src/routeTree.gen.ts`, `src/lib/*` | Scaffold plumbing. Only needed to run this folder as-is; ignore them when porting. |
| `src/test/app-routing.test.tsx` | Asserts `/` resolves to a real page. |

Everything under `src/routes/index.tsx` is presentational: it renders data
arrays (`features`, `audiences`, `compare`, `faqs`) declared at the top of the
file. Editing copy = editing those arrays.

---

## Porting into another app

### A. Your app is React + Tailwind v4

1. Copy `src/routes/index.tsx` → your home route/page. Replace
   `createFileRoute("/")({...})` with your framework's page export (Next.js
   `export default function Page()`, React Router element, etc.). The `head()`
   block becomes your metadata export (`generateMetadata` / `<Helmet>`).
2. Copy the `@theme inline`, `:root` and `@layer base` blocks from
   `src/styles.css` into your global stylesheet.
3. Copy the three images from `src/assets/` and fix the import paths.
4. Add the Fraunces + Manrope `<link>` tags (see `src/routes/__root.tsx`).

### B. Your app is React + Tailwind v3

Tailwind v4 tokens don't auto-generate utilities. Add the colours to
`tailwind.config.js` under `theme.extend.colors` (values from the table below),
and convert the `@utility eyebrow` block into a plain `.eyebrow` class.

### C. Your app isn't React

`src/routes/index.tsx` is still the source of truth for markup and copy — the
className strings map 1:1 to Tailwind utilities, and the colour tokens below
give you exact values.

### Gotchas

- `src/styles.css` uses `@import "tailwindcss" source(none);` +
  `@source "../src";` — this limits Tailwind's file scan. If you merge into an
  existing stylesheet, drop `source(none)` and let your own config scan.
- Fonts are loaded with a `<link>` in the route head, **not** an `@import` in
  CSS. Keep them in the head; a remote `@import` in the CSS bundle breaks the
  Tailwind v4 build.
- The `Get Started` buttons are anchors to `#start` (the closing CTA section).
  Point them at your real signup URL.
- Images are imported as ES modules (`import hero from "@/assets/..."`) so
  Vite fingerprints them. Serve them as static files instead if you move to
  another stack.
- The FAQ uses native `<details>/<summary>` — no JS needed.

---

## Design tokens

Radius base: `--radius: 0.375rem`.

| Token | oklch (source of truth) | Hex (approx.) | Used for |
| --- | --- | --- | --- |
| `background` | `oklch(0.97 0.012 80)` | `#f9f4ec` | Page background |
| `foreground` | `oklch(0.22 0.025 50)` | `#241710` | Body text |
| `card` | `oklch(0.99 0.008 80)` | `#fffbf6` | Card / panel fill |
| `primary` | `oklch(0.55 0.13 50)` | `#ac571d` | CTA buttons, links, accents |
| `primary-foreground` | `oklch(0.98 0.01 80)` | `#fcf8f1` | Text on primary |
| `secondary` | `oklch(0.92 0.02 75)` | `#ede3d6` | Alternating section bands |
| `muted` | `oklch(0.93 0.015 78)` | `#ede7dd` | Pill/chip backgrounds |
| `muted-foreground` | `oklch(0.48 0.03 55)` | `#6b594e` | Secondary text |
| `accent` | `oklch(0.45 0.06 140)` | `#435e3d` | Reserved (sage green) |
| `border` | `oklch(0.86 0.02 70)` | `#dacfc3` | Hairline borders |
| `bark` | `oklch(0.2 0.02 45)` | `#1e130e` | Dark sections: hero, "bigger idea", CTA, footer |
| `bark-foreground` | `oklch(0.94 0.02 78)` | `#f3eadd` | Text on bark |

Fonts:

```css
--font-display: "Fraunces", Georgia, serif;   /* h1/h2/h3, italic pull-quotes */
--font-sans:    "Manrope", system-ui, sans-serif; /* body */
```

`h1, h2, h3` get `letter-spacing: -0.02em`. The `.eyebrow` utility is the small
uppercase label above each section heading: `0.75rem / 0.2em tracking / 700 /
primary colour`.

---

## Assets

| File | Used in |
| --- | --- |
| `src/assets/hero-workshop.jpg` | Hero background (45% opacity, left-to-right bark gradient) and CTA background (20%) |
| `src/assets/qr-label.jpg` | Feature B — QR identification |
| `src/assets/offcuts.jpg` | Feature D — What Can I Build? |

All three are generated photos, ~1200–1600px wide, safe to replace with real
product photography.

---

## Page structure (top to bottom)

1. **Hero** — dark, photo background, nav + headline "Know what timber you
   have. Know what you can make.", two CTAs, three chips.
2. **The problem** — "How much timber do you actually have?"
3. **The solution** — centred band, "Your workshop deserves a better memory."
4. **Features** — six alternating blocks A–F: inventory, QR identification,
   cut-list & nesting, What Can I Build?, camera-assisted recognition,
   workshop storage.
5. **The bigger idea** — dark band, "Stop buying timber you might already
   have."
6. **Who it's for** — four audience cards.
7. **Why TimberVault** — comparison table vs. typical inventory software.
8. **FAQ** — seven `<details>` items.
9. **CTA** — "Your timber. Your workshop. Your way." + `#start` anchor.
10. **Footer** — copyright.

---

## Suggested prompt for Cursor

> Integrate the TimberVault landing page from `timbervault-landing/` into this
> app as the marketing home page. Lift `src/routes/index.tsx` into my router's
> home route, merge the design tokens from `src/styles.css` into my global
> stylesheet without clobbering my existing theme, copy the three images into
> my assets folder, and wire the "Get Started" buttons to my signup route.
> Keep my app's existing nav and footer if they exist.
