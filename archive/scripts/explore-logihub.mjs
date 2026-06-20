import { chromium } from 'playwright';

const EMAIL = process.env.LOGIHUB_EMAIL;
const PASSWORD = process.env.LOGIHUB_PASSWORD;
const BASE = 'https://app.logihub.com';

if (!EMAIL || !PASSWORD) {
  console.error('Faltan LOGIHUB_EMAIL y LOGIHUB_PASSWORD');
  process.exit(1);
}

const out = {
  loginOk: false,
  finalUrl: null,
  title: null,
  navItems: [],
  headings: [],
  buttons: [],
  routes: [],
  pageTexts: [],
  errors: []
};

function uniq(arr) {
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

async function collectPage(page, label) {
  const data = await page.evaluate(() => {
    const pick = (sel) =>
      [...document.querySelectorAll(sel)]
        .map((el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 120);

    return {
      url: location.href,
      title: document.title,
      nav: pick('nav a, aside a, [role="navigation"] a, .sidebar a, .menu a'),
      headings: pick('h1, h2, h3'),
      buttons: pick('button, [role="button"]'),
      links: pick('a').slice(0, 80)
    };
  });

  out.pageTexts.push({ label, ...data });
  out.navItems.push(...data.nav);
  out.headings.push(...data.headings);
  out.buttons.push(...data.buttons);
  out.routes.push(data.url);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);

    const emailSel = 'input[type="email"], input[name="email"], input[name="username"], input[autocomplete="username"]';
    const passSel = 'input[type="password"], input[name="password"]';

    await page.locator(emailSel).first().fill(EMAIL);
    await page.locator(passSel).first().fill(PASSWORD);

    const signIn = page.getByRole('button', { name: /sign in|iniciar|entrar|ingresar/i });
    if (await signIn.count()) {
      await signIn.first().click();
    } else {
      await page.locator('button[type="submit"]').first().click();
    }

    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    out.finalUrl = page.url();
    out.title = await page.title();
    out.loginOk = !/login|sign-in|signin/i.test(out.finalUrl);

    await collectPage(page, 'home');

    const navCandidates = page.locator('nav a, aside a, [role="navigation"] a');
    const navCount = await navCandidates.count();
    const visited = new Set();

    for (let i = 0; i < Math.min(navCount, 25); i++) {
      const link = navCandidates.nth(i);
      const href = await link.getAttribute('href').catch(() => null);
      const text = (await link.innerText().catch(() => '')).trim();
      if (!href || visited.has(href) || /logout|sign-out|salir/i.test(text)) continue;
      visited.add(href);

      try {
        await link.click({ timeout: 5000 });
        await page.waitForTimeout(2500);
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await collectPage(page, text || href);
      } catch (e) {
        out.errors.push(`nav ${text || href}: ${e.message}`);
      }
    }

    out.navItems = uniq(out.navItems).slice(0, 60);
    out.headings = uniq(out.headings).slice(0, 80);
    out.buttons = uniq(out.buttons).slice(0, 80);
    out.routes = uniq(out.routes).slice(0, 30);
  } catch (e) {
    out.errors.push(e.message);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(out, null, 2));
}

main();
