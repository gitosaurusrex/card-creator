# Card Creator: notes for agents and contributors

Read this before changing anything. It covers what the app is, the rules that
keep it working, and the **outstanding work** (at the end). Keep the
"Outstanding work" section current: remove items when they're done and add new
ones you find.

## What this is

A web app a parent built so their child can make colorful cards for a school
project board: type a title and words, add a picture, pick a look, print, cut
out and stick on the board. The audience is a kid (roughly 8–12), so wording is
plain and warm, controls have one-line hints, and nothing should be scary or
"professional". The name is **Card Creator** everywhere.

- Frontend: React 19 + Vite 7, plain CSS with tokens (`src/styles/`), Lucide icons.
- Auth: Clerk (`@clerk/clerk-react` in the browser, `@clerk/backend` in the API).
- Backend: Vercel Functions in `api/` (Node 24) with Postgres via `@vercel/postgres`.
- Production: https://card-creator-peach.vercel.app (Vercel project `card-creator`).

## Layout of the code

| Path | What's there |
| --- | --- |
| `src/App.jsx` | Sign-in gate; renders `Workspace` keyed by user id |
| `src/components/Workspace.jsx` | Home vs editor, open project, tour, hidden print sheet |
| `src/hooks/useProjects.js` | Loading, autosave, local cache, delete, upload, undo/redo |
| `src/components/Editor.jsx` + `panels/` | Editor: tabs (Words, Picture, Colors, Layout), strip, stage |
| `src/components/CardView.jsx` | The one card renderer (preview, thumbnails, print) |
| `src/lib/` | `cards.js` (defaults, sizes, styles), `themes.js`, `fonts.js`, `storage.js` |
| `src/styles/card.css` | How a card looks on screen and paper, plus print rules |
| `src/styles/app.css` | App styles and design tokens |
| `api/` | `projects.js`, `upload.js`, `image.js`, `init-db.js`, `health.js` |
| `lib/image-types.js` | Server-side image type detection from file bytes |
| `tests/api/`, `tests/e2e/` | node:test API tests; Playwright end-to-end tests |

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run test:api   # node:test, Postgres and Clerk mocked
npm run test:e2e   # Playwright; starts `vite --mode e2e` (Clerk swapped for tests/e2e/clerk-stub.jsx)
```

CI (`.github/workflows/ci.yml`) runs lint, build and both test suites on every
pull request and on pushes to `main`. All of them should pass before merging.

## Rules that keep things working

**Printing must stay faithful.** The child has real projects that she prints.
- A wide card is **718px** wide (`WIDE_CARD_WIDTH` in `src/lib/cards.js`): the
  printable width of an A4 page with 10 mm margins. On paper a wide card fills
  the page width, so screen and print lay text out identically. Don't change
  this, the `@page` rule, or the print block in `card.css` without comparing PDFs.
- The rules in `card.css` from "Card Styling" down are carried over unchanged
  from the original app. Changing them changes how existing cards look.
- Cards are isolated from app typography (`:where(h1, h2, h3):not(.card-title)`
  in `app.css`, `line-height: normal` on `.card-preview`). Global app styles
  must not leak into cards.
- To check: print a project to PDF on `main` and on your branch
  (`page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`)
  and diff the pages (for example `pdftoppm` + ImageMagick `compare`).

**Saved data must stay compatible.**
- Card field names and meanings (`src/lib/cards.js` `CARD_DEFAULTS`) are what's
  stored in Postgres. Add fields with defaults; don't rename or repurpose them.
- Font `value`s in `src/lib/fonts.js` are saved on cards. Never change an
  existing value; labels can change.
- Template class names (`template-*`) are saved on cards.
- localStorage keys in `src/lib/storage.js` (`tilemaker_projects_v2:<userId>`,
  `…:unsynced`, `cardcreator:tour-seen:<userId>`) hold unsynced work. Don't
  rename them without a migration. The old shared key `tilemaker_projects_v1` is
  intentionally ignored (it mixed accounts).

**Saving and security invariants** (each has tests; keep them passing):
- All edits go through `updateProject`/`updateCards` in `useProjects`, which
  stamp `lastModified` and schedule the save. Opening a project must not save it.
- Saves are serialized; pending edits flush on "My projects", tab hide and
  page hide; failed saves stay marked unsynced and re-send on next load.
- After a user's workspace unmounts (sign-out or account switch), nothing more
  is sent: the session may belong to someone else.
- `POST /api/projects` returns 409 when the ID belongs to another account; the
  client re-keys the project with a new UUID.
- Uploads are accepted only if their bytes are PNG, JPEG, GIF or WebP
  (`lib/image-types.js`); `/api/image` re-checks bytes and sends `nosniff` and a
  sandbox CSP. Never trust a client-supplied content type.
- `/api/init-db` is disabled unless `INIT_DB_SECRET` is set; leave it unset
  except during setup.

**UI conventions.**
- Copy is short, plain and kind, written for a kid. Errors say what to do.
- No `alert()`, `confirm()` or `prompt()`: use `Dialog`/`ConfirmDialog`, inline
  `role="alert"` messages, or the toast.
- Radio-like pickers use `RadioGroup` in `controls.jsx` (one Tab stop, arrow keys).
- Respect `prefers-reduced-motion`; keep focus visible; keep axe-core clean.
- Elements the tour points at have `data-tour="…"` attributes; keep them when
  restructuring (`src/components/Tour.jsx` lists the steps).

## Outstanding work

Ordered roughly by value. None of these are urgent; the app works.

### Product / UX
1. **Phone layout:** on narrow screens the tools sit below the preview and card
   strip, so the card scrolls out of view while typing. Idea: a small sticky
   preview, or put the tabs above the stage. (`app.css` `@media (max-width: 900px)`.)
2. **Paper size:** printing is fixed to A4 (`@page { size: A4 }` in `card.css`).
   US Letter users get A4 layout. Supporting Letter means a page-size choice and
   a matching wide-card width (Letter's printable width with 10 mm margins is
   ~740px), without changing how existing A4 projects print.
3. **Picture address:** "Use this picture" checks the address starts with http
   but not that the image loads. Check with an `Image()` `onload`/`onerror`
   before applying, and show a friendly error.
4. **Tour length:** nine steps may be long for a kid; consider merging the four
   tab steps into one that highlights the tabs.
5. **"Which part shows?" grid:** arrow keys move linearly through the nine
   cells; up/down could move by rows.
6. **Slider numbers:** only card height shows a meaningful unit (cm); other
   sliders show raw numbers. Consider hiding them or using friendlier units.
7. **Unused field:** `accentColor` is saved on every card but not used by the
   UI (the "Classic" template's side stripe uses a fixed blue).

### Backend / security
8. **Image access:** `/api/image` serves any image to anyone who has its URL.
   New IDs are random UUIDs, but images uploaded before Nov 2026 have short,
   guessable IDs (old `Math.random()`). A per-user check would need Clerk's
   session cookie on `<img>` requests; untested, so not done.
9. **Image storage:** images are base64 in Postgres. Move to Vercel Blob (with a
   migration that rewrites `imageUrl`s) to cut database size and egress.
10. **`@vercel/postgres` is deprecated:** migrate to Neon's serverless driver.
11. **Orphaned images:** unused images are only cleaned up when a project is
    deleted. A replaced or removed picture stays until then.
12. **Clerk:** `authenticateRequest` doesn't pass `authorizedParties`; the auth
    code is duplicated in `api/projects.js` and `api/upload.js`, and a Clerk
    client is created per request. Extract a shared helper.
13. **Error details:** `api/projects.js` returns `error.message` in 500
    responses. Log it and return a generic message instead.
14. **Schema:** there are no migrations; tables and indexes come from
    `/api/init-db`. Adopt a small migration approach before changing the schema.

### Data
15. **Old browser data:** projects that only ever lived in the old shared
    localStorage key (`tilemaker_projects_v1`, before Nov 2026) aren't shown,
    because they can't be tied to an account safely. If anyone reports missing
    old work, an explicit "Import projects saved in this browser" action would
    recover it.

### Tests
16. Not covered by automated tests: drag-and-drop upload; the real printed
    output (only the print sheet's DOM is tested; print fidelity was checked
    by hand with PDF diffs, see "Printing must stay faithful"). A PDF snapshot
    test would guard printing.
17. A few end-to-end tests still use fixed waits where nothing can be polled
    (`grep -n waitForTimeout tests/e2e`). Replace them if they become flaky.
