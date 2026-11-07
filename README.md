# Card Creator

Card Creator helps kids make bright, colorful cards for a school project board.
Type a title and a few facts, add a picture, pick a look, then print the cards,
cut them out and stick them on the board. It's friendlier than pasting plain
printouts, and simple enough to use without a grown-up hovering nearby.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgitosaurusrex%2Fcard-creator)

## What you can do

- **Write**: a title and your words, with a choice of fun fonts and sizes.
- **Add a picture** from your computer (or a link), choose which side it goes
  on, add a label, and pick which part of the picture shows.
- **Pick a look** with one click (Sunshine, Ocean, Chalkboard and more), then
  change any color, border or corner you like.
- **Arrange**: wide or tall cards, how tall each card is, where the words sit
  and how much space goes around them.
- **Keep going**: copy, reorder and delete cards, undo and redo anything, and
  use one card's look on all the others.
- **Print**: choose which cards to print. The preview shows each card exactly
  as it will print, with its size on paper (for example 19 × 14 cm).
- **Get help**: a short animated demo shows the idea, and "Show me how" opens a
  guided tour of the editor. Every control has a one-line hint.

Projects save automatically to your account, with a copy kept in the browser in
case the internet drops out.

## Running it yourself

### On Vercel
Use the **Deploy with Vercel** button above. You'll need a Clerk application
(for sign-in) and a Postgres database. Set these environment variables:

| Variable | What it's for |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key, used by the browser |
| `CLERK_SECRET_KEY` | Clerk secret key, used by the API |
| `POSTGRES_URL` | Postgres connection string |
| `INIT_DB_SECRET` | Only while setting up the database (see below) |

### Database setup
The tables are created by `/api/init-db`, which is switched off unless the
`INIT_DB_SECRET` environment variable is set. Set it, redeploy, then run:

```bash
curl -X POST -H "Authorization: Bearer $INIT_DB_SECRET" https://<your-deployment>/api/init-db
```

It's safe to run again later. Afterwards, delete the variable and redeploy to
switch the endpoint off.

### On your computer
```bash
git clone https://github.com/gitosaurusrex/card-creator.git
cd card-creator
npm ci
npm run dev
```

## How it's built

- React 19 and Vite 7, plain CSS with design tokens, Lucide icons
- Clerk for sign-in
- Vercel Functions (Node 24) with Postgres for saving projects and pictures

The card styles live in `src/styles/card.css` and are kept separate from the
app's own styles, so a card looks the same in the editor, in thumbnails and on
paper. A wide card is 718 px across: the printable width of an A4 page with
10 mm margins.

## Tests

```bash
npm run lint
npm run test:api   # API handlers, with Postgres and Clerk mocked
npm run test:e2e   # Playwright, in the browser against a mocked API
```

The end-to-end tests start Vite with `--mode e2e`, which swaps Clerk for a local
stub (`tests/e2e/clerk-stub.jsx`), so no Clerk account or database is needed.
Run `npx playwright install chromium` once before the first run. CI runs all of
these on every pull request.

---
Made by [gitosaurusrex](https://github.com/gitosaurusrex).
