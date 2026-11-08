/**
 * Takes the README screenshots in docs/screenshots/, as WebP.
 *
 * Starts Vite in e2e mode (Clerk swapped for the test stub), answers /api/*
 * with made-up projects and drawn pictures, and captures the main screens in
 * Chromium. No account, database or real projects are involved. Needs
 * Playwright with Chromium installed:
 *
 *   node scripts/screenshots.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = 5299;
const URL_BASE = `http://localhost:${PORT}`;
const USER = 'demo';
const { chromium } = createRequire(import.meta.url)('playwright');

// ---- Made-up projects -------------------------------------------------------

const looks = {
  sunshine: { template: 'template-plain', cardBg: '#fff3c4', textColor: '#4a3200', borderColor: '#f4a300', borderStyle: 'solid', borderWidth: 6, borderRadius: 28, titleFont: "'Fredoka', sans-serif", textFont: "'Fredoka', sans-serif" },
  leafy: { template: 'template-plain', cardBg: '#e4f5e1', textColor: '#1e4d2b', borderColor: '#5fb760', borderStyle: 'solid', borderWidth: 6, borderRadius: 16, titleFont: "'Baloo 2', sans-serif", textFont: "'Outfit', sans-serif" },
  nightSky: { template: 'template-plain', cardBg: '#1b1f4b', textColor: '#ffe66d', borderColor: '#8c84ff', borderStyle: 'dotted', borderWidth: 6, borderRadius: 24, titleFont: "'Fredoka', sans-serif", textFont: "'Outfit', sans-serif" },
  ocean: { template: 'template-plain', cardBg: '#dff3ff', textColor: '#0b3954', borderColor: '#3aa0e0', borderStyle: 'solid', borderWidth: 6, borderRadius: 20, titleFont: "'Baloo 2', sans-serif", textFont: "'Baloo 2', sans-serif" },
  chalkboard: { template: 'template-plain', cardBg: '#2f4f3a', textColor: '#f4f1e6', borderColor: '#9a6b3f', borderStyle: 'solid', borderWidth: 14, borderRadius: 6, titleFont: "'Patrick Hand', cursive", textFont: "'Patrick Hand', cursive" },
};

const BASE = {
  imageUrl: '', caption: '', orientation: 'horizontal-left', imagePosition: 'center center', contentPadding: 40,
  verticalAlign: 'center', accentColor: '#eb5e28', imageRadius: 12, cardPadding: 0, titleSize: 44, textSize: 21,
  cardHeight: 530, selectedForPrint: true,
};

let cardId = 0;
const card = (look, fields) => ({ ...BASE, ...looks[look], id: `c${++cardId}`, ...fields });
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const PROJECTS = [
  {
    id: 'p-volcanoes',
    name: 'Volcanoes',
    lastModified: daysAgo(0),
    cards: [
      card('sunshine', {
        title: 'What is a volcano?',
        text: 'A volcano is an opening in the Earth’s crust. When it erupts, hot melted rock called magma pushes up and out. Once it reaches the surface, we call it lava!',
        imageUrl: '/api/image?id=demo-volcano', caption: 'An erupting volcano',
      }),
      card('sunshine', { title: 'Lava', text: 'Fresh lava can be hotter than 1,000 °C. It glows bright orange and red, then cools into dark rock.', imageUrl: '/api/image?id=demo-lava', orientation: 'horizontal-right' }),
      card('chalkboard', { title: 'Famous volcanoes', text: 'Mount Fuji in Japan, Kīlauea in Hawaiʻi and Vesuvius in Italy are some of the most famous volcanoes in the world.' }),
      card('sunshine', { title: 'Staying safe', text: 'Scientists called volcanologists watch volcanoes closely, so people nearby get a warning before an eruption.' }),
    ],
  },
  {
    id: 'p-rainforest',
    name: 'Rainforest Animals',
    lastModified: daysAgo(1),
    cards: [
      card('leafy', {
        title: 'Red-eyed tree frog',
        text: 'These little frogs live in the rainforests of Central America. They sleep in the day and hunt insects at night. Their bright red eyes can startle a hungry bird!',
        imageUrl: '/api/image?id=demo-frog',
      }),
      card('leafy', { title: 'Toucan', text: 'A toucan’s huge, colorful beak is light because it’s full of tiny air pockets.' }),
      card('leafy', { title: 'Sloth', text: 'Sloths move so slowly that tiny green plants called algae grow in their fur.' }),
    ],
  },
  {
    id: 'p-space',
    name: 'Our Solar System',
    lastModified: daysAgo(4),
    cards: [
      card('nightSky', {
        title: 'Saturn',
        text: 'Saturn is the sixth planet from the Sun. Its rings are made of ice and rock. It’s so light for its size that it would float in a giant bathtub!',
        imageUrl: '/api/image?id=demo-saturn',
      }),
      card('nightSky', { title: 'The Sun', text: 'The Sun is a star. It’s so big that about a million Earths could fit inside it.', imageUrl: '/api/image?id=demo-sun', orientation: 'horizontal-right' }),
      card('nightSky', { title: 'Mars', text: 'Mars looks red because its soil is full of rusty iron.', imageUrl: '/api/image?id=demo-mars' }),
    ],
  },
  {
    id: 'p-weather',
    name: 'Weather Watch',
    lastModified: daysAgo(9),
    cards: [
      card('ocean', {
        title: 'Clouds',
        text: 'Clouds are made of tiny drops of water or ice floating in the sky. Fluffy white ones are called cumulus clouds.',
        imageUrl: '/api/image?id=demo-cloud',
      }),
      card('ocean', { title: 'Rainbows', text: 'A rainbow appears when sunlight shines through raindrops and splits into colors.' }),
    ],
  },
];

// ---- Drawn pictures ---------------------------------------------------------

// Drawn tall, since a wide card's picture column is tall and narrow.
const stars = (n, w, h) => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 131) % w}" cy="${(i * 71) % h}" r="${(i % 3) + 1}" fill="#fff" opacity=".8"/>`).join('');
const PICTURES = {
  'demo-volcano': `<rect width="400" height="640" fill="#ffd9a8"/><circle cx="320" cy="90" r="40" fill="#fff1a6"/>
    <path d="M150 290 Q120 200 160 150 Q130 90 190 60 Q240 30 260 90 Q310 110 280 170 Q300 230 250 290 Z" fill="#9b9b9b" opacity=".6"/>
    <path d="M-40 640 L150 300 H250 L440 640 Z" fill="#7a4a3a"/><path d="M150 300 H250 L232 345 Q200 365 168 345 Z" fill="#e8492f"/>
    <path d="M172 345 Q150 450 110 560 Q185 470 200 390 Q215 470 290 560 Q250 450 228 345 Z" fill="#f5862f"/><rect y="600" width="400" height="40" fill="#5c8a3a"/>`,
  'demo-lava': `<rect width="400" height="640" fill="#2b1b17"/>${stars(12, 400, 260)}
    <path d="M0 330 Q100 280 200 330 T400 320 V640 H0 Z" fill="#e8492f"/><path d="M0 420 Q110 370 220 425 T400 410 V640 H0 Z" fill="#f5862f"/>
    <path d="M0 510 Q120 470 230 515 T400 505 V640 H0 Z" fill="#ffc94a"/><circle cx="90" cy="250" r="10" fill="#f5862f"/><circle cx="300" cy="220" r="8" fill="#ffc94a"/>`,
  'demo-frog': `<rect width="400" height="640" fill="#cfeec5"/><path d="M0 470 Q200 430 400 480 V640 H0 Z" fill="#3f8a3a"/>
    <path d="M40 120 Q120 60 200 110" stroke="#4f9a3f" stroke-width="16" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="110" rx="50" ry="22" fill="#6cbf55"/>
    <ellipse cx="200" cy="400" rx="140" ry="95" fill="#5cc254"/><circle cx="130" cy="300" r="56" fill="#5cc254"/><circle cx="270" cy="300" r="56" fill="#5cc254"/>
    <circle cx="130" cy="296" r="38" fill="#e8302a"/><circle cx="270" cy="296" r="38" fill="#e8302a"/><ellipse cx="130" cy="296" rx="8" ry="24" fill="#111"/>
    <ellipse cx="270" cy="296" rx="8" ry="24" fill="#111"/><path d="M140 400 Q200 432 260 400" stroke="#2c6b28" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="90" cy="480" rx="40" ry="16" fill="#f59b2f"/><ellipse cx="310" cy="480" rx="40" ry="16" fill="#f59b2f"/>`,
  'demo-saturn': `<rect width="400" height="640" fill="#0f1236"/>${stars(50, 400, 640)}
    <ellipse cx="200" cy="320" rx="190" ry="42" fill="none" stroke="#d9c38a" stroke-width="18" transform="rotate(-18 200 320)"/>
    <circle cx="200" cy="320" r="100" fill="#e7c27a"/><path d="M104 296 Q200 282 296 296 M100 332 Q200 320 300 332" stroke="#c99a52" stroke-width="12" fill="none"/>
    <path d="M22 372 Q200 350 382 262" stroke="#d9c38a" stroke-width="18" fill="none" transform="rotate(0)"/>`,
  'demo-sun': `<rect width="400" height="640" fill="#0f1236"/>${stars(40, 400, 640)}
    <g stroke="#ffb02e" stroke-width="14" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${200 + Math.cos(a) * 130}" y1="${320 + Math.sin(a) * 130}" x2="${200 + Math.cos(a) * 170}" y2="${320 + Math.sin(a) * 170}"/>`; }).join('')}</g>
    <circle cx="200" cy="320" r="110" fill="#ffc94a"/><circle cx="200" cy="320" r="80" fill="#ffd96b"/>`,
  'demo-mars': `<rect width="400" height="640" fill="#0f1236"/>${stars(40, 400, 640)}
    <circle cx="200" cy="320" r="120" fill="#d9603b"/><circle cx="160" cy="280" r="22" fill="#b84a2c"/><circle cx="250" cy="360" r="30" fill="#b84a2c"/><circle cx="230" cy="250" r="12" fill="#b84a2c"/>
    <path d="M110 215 Q200 190 290 215" stroke="#f4e9e1" stroke-width="16" fill="none" stroke-linecap="round"/>`,
  'demo-cloud': `<rect width="400" height="640" fill="#8fd0ff"/><circle cx="300" cy="110" r="50" fill="#fff1a6"/>
    <g fill="#fff"><circle cx="130" cy="330" r="60"/><circle cx="210" cy="290" r="80"/><circle cx="290" cy="335" r="55"/><rect x="80" y="330" width="260" height="60" rx="30"/></g>
    <g fill="#fff" opacity=".8"><circle cx="90" cy="490" r="36"/><circle cx="140" cy="470" r="46"/><rect x="60" y="490" width="140" height="36" rx="18"/></g>`,
};

const pictureSvg = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 640">${PICTURES[id] ?? ''}</svg>`;

// ---- Screens ----------------------------------------------------------------

const openProject = async (page, name) => {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await page.getByLabel('Card preview', { exact: true }).waitFor();
};

const SHOTS = [
  { name: 'home', width: 1440, height: 1000, prepare: async () => {} },
  {
    name: 'editor',
    width: 1440,
    height: 900,
    prepare: async (page) => {
      await openProject(page, 'Volcanoes');
    },
  },
  {
    name: 'looks',
    width: 1440,
    height: 900,
    prepare: async (page) => {
      await openProject(page, 'Rainforest Animals');
      await page.getByRole('tab', { name: 'Colors', exact: true }).click();
    },
  },
  {
    name: 'print',
    width: 1440,
    height: 900,
    prepare: async (page) => {
      await openProject(page, 'Our Solar System');
      await page.getByRole('banner').getByRole('button', { name: 'Print' }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
];

/** WebP is a fraction of PNG's size. Chromium's canvas encodes it, so nothing else needs installing. */
async function toWebp(page, png) {
  const dataUrl = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.9);
  }, png.toString('base64'));
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function startVite() {
  const vite = spawn('npx', ['vite', '--mode', 'e2e', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(URL_BASE)).ok) return vite;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  vite.kill();
  throw new Error(`Vite didn't start on port ${PORT}`);
}

const vite = await startVite();
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/projects' && route.request().method() === 'GET') return route.fulfill({ json: PROJECTS });
      if (url.pathname === '/api/image') return route.fulfill({ contentType: 'image/svg+xml', body: pictureSvg(url.searchParams.get('id')) });
      return route.fulfill({ json: { success: true } });
    });
    await page.goto(URL_BASE);
    await page.evaluate((user) => {
      localStorage.clear();
      localStorage.setItem(`cardcreator:tour-seen:${user}`, 'true');
      localStorage.setItem('__test_user', user);
    }, USER);
    await page.reload();
    await page.getByRole('button', { name: 'Start a new project' }).waitFor();
    await shot.prepare(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const file = join(OUT, `${shot.name}.webp`);
    await writeFile(file, await toWebp(page, await page.screenshot()));
    console.log(`Saved ${file}`);
    await context.close();
  }
} finally {
  await browser.close();
  vite.kill();
}
