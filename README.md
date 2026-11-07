# 🎴 CardCreator

**CardCreator** is a premium, high-performance web application designed for professionals and creators to design, customize, and print beautiful cards instantly. Built with React and Vite, it offers a seamless, real-time editing experience.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgitosaurusrex%2FCardCreator)

## ✨ Features

- **Live Preview**: Edit titles, body text, fonts and colours and see the card update as you type.
- **Dynamic Layouts**: Switch between horizontal and vertical orientations with ease.
- **Universal Styling**: Apply appearance settings to all cards or customize them individually.
- **Media Integration**: Upload images directly or use external URLs with overlay captions.
- **Print-Ready**: Optimized print styles ensuring high-quality physical output.
- **Cloud Sync**: Projects are saved to your account automatically, with a local copy if you go offline.

## 🚀 Quick Start

### Online
Click the **Deploy with Vercel** button above to launch your own instance in seconds!

### Local Development
1. Clone the repository: `git clone https://github.com/gitosaurusrex/CardCreator.git`
2. Install dependencies: `npm ci`
3. Run dev server: `npm run dev`

### Database setup
The schema is created by `/api/init-db`, which is disabled unless the
`INIT_DB_SECRET` environment variable is set. After deploying with it set, run:

```bash
curl -X POST -H "Authorization: Bearer $INIT_DB_SECRET" https://<your-deployment>/api/init-db
```

It is safe to re-run (it also adds indexes to existing databases). Unset the
variable afterwards to disable the endpoint again.

## 🛠️ Technology Stack

- **Framework**: React 19
- **Bundler**: Vite 7
- **Styling**: Vanilla CSS (Custom tokens)
- **Icons**: Lucide React
- **Auth**: Clerk
- **Backend**: Vercel Functions (Node 24) with Postgres

## 🧪 Testing

```bash
npm run lint
npm run test:api   # API handlers, with Postgres and Clerk mocked
npm run test:e2e   # Playwright, in the browser against a mocked API
```

The end-to-end tests start Vite with `--mode e2e`, which replaces Clerk with a
local stub (`tests/e2e/clerk-stub.jsx`), so no Clerk account or database is
needed. Run `npx playwright install chromium` once before the first run. CI
runs all of these on every pull request.

---
Developed by [gitosaurusrex](https://github.com/gitosaurusrex)
