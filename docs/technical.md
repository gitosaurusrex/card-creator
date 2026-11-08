# How Card Creator works

This is the engineer's tour: what happens between typing on a card and a printed page, how projects are saved and
synced, and how the API keeps accounts and pictures safe. For what the app does and how to deploy it, see the
[README](../README.md). For the rules that must not be broken and the list of outstanding work, see
[AGENTS.md](../AGENTS.md).

- [The big picture](#the-big-picture)
- [A card](#a-card)
- [One renderer, three places](#one-renderer-three-places)
- [Printing](#printing)
- [The editor](#the-editor)
- [Undo and redo](#undo-and-redo)
- [Saving and syncing](#saving-and-syncing)
- [Accounts](#accounts)
- [The API](#the-api)
- [Pictures](#pictures)
- [The database](#the-database)
- [The guided tour and the demo](#the-guided-tour-and-the-demo)
- [Testing](#testing)
- [Numbers worth knowing](#numbers-worth-knowing)
- [Code map](#code-map)

## The big picture

```
Browser (React 19 + Vite)                                   Vercel Functions (Node 24)
┌──────────────────────────────────────────────┐            ┌─────────────────────────────┐
│ Clerk sign-in ─▶ Workspace (keyed by user)   │            │ /api/projects  GET/POST/DEL │
│                   ├ Home: projects           │   Bearer   │ /api/upload    POST         │──▶ Postgres
│                   └ Editor: tabs, stage,     │ ─────────▶ │ /api/image     GET          │    projects, images
│                     strip, print dialog      │   token    │ /api/init-db   POST (setup) │
│ useProjects: state, undo, autosave           │            │ /api/health    GET          │
│ localStorage: per-user copy + unsynced list  │            └─────────────────────────────┘
└──────────────────────────────────────────────┘
```

It's a single-page app. `vercel.json` sends `/api/*` to the functions and everything else to `index.html`. All the
editing happens in the browser. The server stores projects and pictures per account.

## A card

A card is a flat object. Its fields are exactly what's stored in Postgres, so they never get renamed
(`CARD_DEFAULTS` in `src/lib/cards.js`):

| Group | Fields |
| --- | --- |
| Words | `title`, `text`, `titleFont`, `titleSize`, `textFont`, `textSize` |
| Picture | `imageUrl`, `caption`, `imagePosition` (which part shows), `imageRadius` |
| Shape and layout | `orientation` (`horizontal-left`, `horizontal-right` or `vertical`), `cardHeight`, `verticalAlign`, `contentPadding`, `cardPadding` |
| Look | `template` (a `template-*` class), `cardBg`, `textColor`, `borderColor`, `borderStyle`, `borderWidth`, `borderRadius`, `accentColor` (stored but unused) |
| Printing | `selectedForPrint` |

A **look** (Sunshine, Ocean, Chalkboard… in `src/lib/themes.js`) is just a bundle of these style fields applied at
once. `STYLE_KEYS` lists everything that counts as "look" rather than content, which is what **Use this look on all
cards** copies.

Font choices are stored as CSS `font-family` values. All the fonts come from one Google Fonts stylesheet in
`index.html`.

## One renderer, three places

`CardView` (`src/components/CardView.jsx`) is the only component that draws a card. The big preview, the card strip,
the project thumbnails, the print dialog and the printed page all use it, so they can't drift apart.

- `cardStyle()` and `contentStyle()` turn fields into inline styles. The `orientation` and `template` values become
  classes.
- `FittedCard` shows a card smaller by rendering it at full size and scaling it with a CSS transform, never up. A
  thumbnail is therefore a faithful miniature, not a separate layout.
- Cards are walled off from the app's own typography: app heading styles use `:where(h1, h2, h3):not(.card-title)`,
  and `.card-preview` resets `line-height`. The card rules in `src/styles/card.css` are carried over unchanged from the
  original app, so old projects look the same.

## Printing

The key number is **718 px**: the printable width of an A4 page (210 mm) minus two 10 mm margins, at 96 CSS px per
inch. A wide card is exactly that wide on screen, so text wraps in the same places on screen and on paper. Tall cards
are 460 px wide.

- `@page { size: A4; margin: 10mm }`. Wide cards print at 100% of the page width, which *is* 718 px.
- `Workspace` keeps a hidden `.print-only` sheet holding every card ticked in the print dialog. `@media print` hides
  the app (`.no-print`), shows that sheet, keeps each card on one page (`break-inside: avoid`) and forces background
  colors (`print-color-adjust: exact`).
- The print dialog shows each card's real size on paper, from `printedSize()`: centimetres rounded to whole numbers,
  inches to the nearest half (for example "19 × 14 cm · 7½ × 5½ in"). The editor shows the same label under the preview.
- The dialog's tip covers the one thing the page can't control: a browser set to skip background graphics.

Any change to card or print CSS is checked by printing a project to PDF before and after and diffing the pages. AGENTS.md
has the recipe.

## The editor

`Editor.jsx` has four tabs, each a panel in `src/components/panels/`:

- **Words:** title, words, sizes, fonts.
- **Picture:** upload (button or drag and drop) or a web address, which side it goes on, a caption, and a 3 × 3 grid
  for which part of the picture shows (`object-position`).
- **Colors:** looks, then individual colors and border.
- **Layout:** wide or tall, height, where the words sit, spacing, corner rounding.

The stage shows the active card on a cutting-mat background with its printed size. The strip below lists the cards,
with copy, move left/right, delete, add and **Use this look on all cards**. Radio-style pickers use `RadioGroup` in
`controls.jsx`: one Tab stop, arrow keys to move. Below 900 px the layout stacks.

## Undo and redo

Undo lives in `useProjects` and covers the cards of the open project.

- Each change through `updateCards(projectId, change, { group })` pushes the previous cards onto `past` and clears
  `future`.
- Quick repeated edits of the same thing (typing in one field, dragging one slider) share a `group`. Edits in the same
  group within **800 ms** fold into one step, so undo goes back a word or a drag, not a letter or a pixel.
- History holds **100** steps and resets when you switch project.
- Undo and redo restore a whole card array through `setCards`, which also saves.

## Saving and syncing

Everything goes through two functions, `updateProject` and `updateCards`. Each stamps `lastModified`, marks the
project dirty and schedules a save. Opening a project never saves it.

```
edit ─▶ dirty ─(1.5 s quiet)─▶ flush: write local copy, mark "unsynced" ─▶ save queue ─▶ POST /api/projects
                                                                                         └─ ok: clear "unsynced"
```

- **Debounce:** a save happens 1.5 s after the last edit, or straight away on **My projects**, when the tab is hidden,
  on page hide, and when the workspace unmounts.
- **Local copy first.** On flush the project list is written to `localStorage` (`tilemaker_projects_v2:<userId>`)
  and the project id goes on the unsynced list (`…:unsynced`) *before* the request is sent.
- **Serialized saves.** Saves run one at a time through a promise chain, and each sends the project as it is when its
  turn comes. An older request can never overwrite a newer one.
- **Leaving the page.** Flushes triggered by hiding the tab use `fetch(…, { keepalive: true })` when the body is under
  60 KB, the browser's keepalive limit, so the save can finish after the page goes.
- **Status:** the top bar shows "Saving soon…", "Saving…", "All saved" or "Not saved yet".
- **Loading:** the server's list is the truth, except for projects on the unsynced list. Those use the local copy and
  are re-sent straight away. If the server can't be reached, the local copy is shown.
- **Deleting** waits for queued saves first, so a late save can't bring the project back.

## Accounts

Sign-in is Clerk. `App.jsx` shows a welcome screen until someone signs in, then renders `Workspace` **keyed by user
id**. Switching accounts throws away every bit of in-memory state instead of carrying it across.

Protection against an account switching mid-save:

- When the workspace unmounts (sign-out or switch), `disposed` is set and nothing more is sent. Unsent edits stay in
  that user's local copy, marked unsynced, and go up next time *they* sign in.
- Before each save, the session token's `sub` claim is compared with the workspace's user. On a mismatch the save is
  skipped.
- Local storage keys include the user id. The old shared key `tilemaker_projects_v1` is deliberately ignored, because
  it mixed accounts.

## The API

Every function except `health` and `image` authenticates with Clerk's `authenticateRequest` and works only on the
caller's rows.

| Endpoint | What it does |
| --- | --- |
| `GET /api/projects` | The caller's projects, newest first. |
| `POST /api/projects` | Upsert `{ id, name, cards }`. The `ON CONFLICT … WHERE projects.user_id = caller` means another account's id writes nothing, and the API answers **409**. The client then gives the project a fresh UUID and saves again. |
| `DELETE /api/projects?id=` | Deletes the caller's project, then deletes the caller's images older than an hour that no remaining project mentions. |
| `POST /api/upload` | Stores a picture (see below) and returns `/api/image?id=<uuid>`. |
| `GET /api/image?id=` | Serves a picture. |
| `POST /api/init-db` | Creates the tables. Returns 404 unless `INIT_DB_SECRET` is set, and then needs that secret as a Bearer token, compared in constant time. |
| `GET /api/health` | A liveness check. |

## Pictures

Uploads are checked on both sides:

1. **In the browser:** the file must claim to be PNG, JPEG, GIF or WebP, and be under 3 MB. It's sent as a base64 data
   URL in JSON.
2. **On the server:** the base64 is decoded and the **bytes** must start with a PNG, JPEG, GIF or WebP signature
   (`lib/image-types.js`). The client's content type is never trusted, so an SVG or HTML file posing as an image can't
   be stored. The size limit is checked again, plus a per-user quota of 200 images and 100 MB of stored base64.
3. **When serving:** `/api/image` detects the type from the bytes again, ignoring the stored content type, which older
   uploads took from the client. It sends `X-Content-Type-Options: nosniff`, a sandboxing
   `Content-Security-Policy`, and a year-long private cache, since an image id never changes.

Pictures from a web address are stored as the address itself. A card's picture is shown with `object-fit: cover`,
and `imagePosition` picks which part shows.

## The database

Two tables, created by `/api/init-db`:

```sql
projects (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, cards JSONB, export_name TEXT, last_modified TIMESTAMPTZ)
  index (user_id, last_modified DESC)
images   (id TEXT PRIMARY KEY, user_id TEXT, data TEXT /* base64 */, content_type TEXT, file_name TEXT, created_at TIMESTAMPTZ)
  index (user_id)
```

A project's cards are one JSONB value, written whole on every save. There are no migrations yet. AGENTS.md lists that,
and moving pictures out of Postgres, as outstanding work.

## The guided tour and the demo

- **How it works** on the home and welcome screens is a small animated corkboard (`HowItWorks.jsx`) with four steps.
  Anyone who prefers reduced motion sees the finished card and all four steps at once.
- **Show me how** runs a nine-step tour (`Tour.jsx`). Each step points at an element by its `data-tour` attribute,
  switching tabs as needed, with a different target on narrow screens. The tour starts by itself the first time
  someone opens the editor, then remembers it was seen (`cardcreator:tour-seen:<userId>`).

## Testing

- `npm run test:api` uses `node:test` with module mocks for `@vercel/postgres` and `@clerk/backend`. It covers sign-in,
  ownership and the 409 conflict, image detection, upload checks and quotas, and the `init-db` lock.
- `npm run test:e2e` is Playwright against `vite --mode e2e`. In that mode Vite swaps `@clerk/clerk-react` for
  `tests/e2e/clerk-stub.jsx`, whose user comes from `localStorage`, and `tests/e2e/helpers.js` answers `/api/*` from
  an in-memory store. It covers editing, undo, saving and flushing, account switching, conflicts, uploads, the tour and
  the print sheet.
- CI runs lint, build and both suites on every pull request and push to `main`.
- `node scripts/screenshots.mjs` regenerates the README images in `docs/screenshots/` the same way. It runs e2e mode
  with made-up projects and drawn pictures, so no real projects appear.

## Numbers worth knowing

| What | Value | Where |
| --- | --- | --- |
| Wide card width | 718 px (A4 minus 10 mm margins) | `src/lib/cards.js` |
| Tall card width | 460 px | `src/lib/cards.js` |
| Default card height | 530 px (14 cm) | `src/lib/cards.js` |
| Save delay | 1.5 s | `src/hooks/useProjects.js` |
| Keepalive body limit | 60 KB | `src/hooks/useProjects.js` |
| Undo grouping window | 800 ms | `src/hooks/useProjects.js` |
| Undo history | 100 steps | `src/hooks/useProjects.js` |
| Largest picture | 3 MB | `useProjects.js`, `api/upload.js` |
| Pictures per account | 200, and 100 MB of base64 | `api/upload.js` |
| Unused pictures kept | at least 1 hour | `api/projects.js` |
| Narrow layout | below 900 px | `src/styles/app.css` |

## Code map

```
index.html                    fonts, root element
src/main.jsx                  ClerkProvider and App
src/App.jsx                   sign-in gate; Workspace keyed by user
src/components/Workspace.jsx  home vs editor, tour, hidden print sheet
src/components/Home.jsx       hero, projects grid, delete
src/components/Editor.jsx     tabs, tools panel, stage, strip, print dialog
src/components/panels/        Words, Picture, Colors, Layout
src/components/CardView.jsx   the one card renderer, and FittedCard
src/components/Tour.jsx       guided tour steps and positioning
src/components/controls.jsx   fields, sliders, RadioGroup, color and font pickers
src/hooks/useProjects.js      projects state, undo, autosave, upload, delete
src/lib/cards.js              card fields, sizes, styles
src/lib/themes.js             looks
src/lib/fonts.js              font choices
src/lib/storage.js            localStorage keys and safe access
src/styles/card.css           cards on screen and paper, print rules
src/styles/app.css            app styles and design tokens
api/                          projects, upload, image, init-db, health
lib/image-types.js            image type detection from bytes
tests/api/, tests/e2e/        node:test and Playwright suites
scripts/screenshots.mjs       README screenshots from demo data
```
