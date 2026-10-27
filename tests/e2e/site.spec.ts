import { test, expect } from '@playwright/test';

const variants = [
  {
    prefix: '',
    lang: 'zh-Hans',
    heading: 'Yaaa：一个由自己掌握的个人 AI 系统',
    closeoutHeading: '[04] 从 AI 对话到长期知识：Session closeout 的概念与实现',
    query: '知识',
    diagram: 'zh',
  },
  {
    prefix: '/en',
    lang: 'en',
    heading: 'Yaaa: a personal AI system under your control',
    closeoutHeading:
      '[04] From AI conversations to lasting knowledge: session closeout in practice',
    query: 'knowledge',
    diagram: 'en',
  },
  {
    prefix: '/ja',
    lang: 'ja',
    heading: 'Yaaa：自分で管理できるパーソナル AI システム',
    closeoutHeading: '[04] AI との対話から長く使える知識へ：Session closeout の考え方と実装',
    query: '知識',
    diagram: 'ja',
  },
];

for (const { prefix, lang, heading, closeoutHeading, query, diagram } of variants) {
  test(`${lang}: readable article, correct language and paired destinations`, async ({ page }) => {
    const response = await page.goto(`/tech${prefix}/posts/yaaa/`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('article table').first()).toBeVisible();
    await expect(page.locator('article pre')).toHaveCount(2);
    for (const [name, width, height] of [
      ['overview', 2320, 1320],
      ['approval-flow', 1680, 1920],
    ] as const) {
      const image = page.locator(`article img[src="/tech/images/yaaa/${name}-${diagram}.png"]`);
      await expect(image).toHaveCount(1);
      await expect
        .poll(() =>
          image.evaluate(
            (el: HTMLImageElement, size) =>
              el.complete && el.naturalWidth === size.width && el.naturalHeight === size.height,
            { width, height },
          ),
        )
        .toBe(true);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://blog.fnpg.me/tech${prefix}/posts/yaaa/`,
    );
    const languages = page.locator('[data-article-languages]');
    await expect(languages).toBeVisible();
    await expect(languages.locator('a[aria-current="page"]')).toHaveAttribute('hreflang', lang);
    for (const other of variants.filter((variant) => variant.prefix !== prefix)) {
      await expect(
        page.locator(`a[data-lang-target="${other.prefix.slice(1) || 'zh'}"]`),
      ).toHaveAttribute('href', `/tech${other.prefix}/posts/yaaa/`);
      await expect(languages.locator(`a[hreflang="${other.lang}"]`)).toHaveAttribute(
        'href',
        `/tech${other.prefix}/posts/yaaa/`,
      );
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });

  test(`${lang}: built Pagefind index returns localized content`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/tech${prefix}/search/`);
    const search = page.locator('[data-search-page-input]');
    await search.fill(query);
    const results = page.locator('[data-search-page-results] a');
    await expect(results.filter({ hasText: heading })).toHaveCount(1);
    await expect(results.filter({ hasText: heading })).toHaveAttribute(
      'href',
      `/tech${prefix}/posts/yaaa/`,
    );
    await search.fill('nonce');
    await expect(results.filter({ hasText: heading })).toHaveCount(1);
    await search.fill('covers_through');
    await expect(results.filter({ hasText: closeoutHeading })).toHaveCount(1);
    await expect(results.filter({ hasText: closeoutHeading })).toHaveAttribute(
      'href',
      `/tech${prefix}/posts/session-closeout/`,
    );
    // The old placeholder can match the indexed word “no” in Pagefind.
    await search.fill('zxqvtr5827');
    await expect(results).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('removed and draft articles and other blog paths are not published', async ({ request }) => {
  for (const path of [
    '/tech/posts/closeout-notes/',
    '/tech/en/posts/closeout-notes/',
    '/tech/ja/posts/closeout-notes/',
    '/tech/posts/unpublished-fixture/',
    '/arts/',
    '/technology/',
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test.describe('unequal translated listing lengths without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('page two only advertises existing language destinations', async ({ page, request }) => {
    expect((await page.goto('/tech/page/2/'))?.status()).toBe(200);
    for (const { prefix, lang } of variants) {
      const path = `/tech${prefix}/page/2/`;
      const exists = (await request.get(path)).status() === 200;
      const language = page.locator(`a[data-lang-target="${prefix.slice(1) || 'zh'}"]`);
      const alternate = page.locator(`link[hreflang="${lang}"]`);
      if (exists) {
        if (prefix) await expect(language).toHaveAttribute('href', path);
        await expect(alternate).toHaveAttribute('href', `https://blog.fnpg.me${path}`);
      } else {
        await expect(language).toHaveCount(0);
        await expect(alternate).toHaveCount(0);
      }
    }
  });
});

test('theme preference is isolated and keyboard-accessible', async ({ page }) => {
  await page.goto('/tech/');
  await page.evaluate(() => localStorage.setItem('theme', 'photo-theme'));
  const toggle = page.locator('[data-theme-toggle]');
  if (!(await toggle.isVisible())) await page.locator('[data-sidebar-toggle]').click();
  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('blog.tech.theme')))
    .toMatch(/^chirpy-(dark|light)$/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('photo-theme');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', initialTheme!);
  const selected = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', selected!);
});

test('article and language links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/tech/en/posts/yaaa/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Yaaa');
  await expect(page.locator('a[data-lang-target="ja"]')).toHaveAttribute(
    'href',
    '/tech/ja/posts/yaaa/',
  );
  await expect(page.locator('article table').first()).toBeVisible();
  await page.locator('[data-lang-switcher] summary').click();
  await page.locator('a[data-lang-target="ja"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await page.locator('[data-article-languages] a[hreflang="zh-Hans"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await context.close();
});

for (const { prefix, heading, query } of variants) {
  test(`search dialog ${prefix || 'zh'} supports keyboard results and Escape`, async ({ page }) => {
    await page.goto(`/tech${prefix}/`);
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[data-search-modal]');
    await expect(dialog).toBeVisible();
    await page.locator('[data-search-input]').fill(query);
    await expect(page.locator('[data-search-results] a').filter({ hasText: heading })).toHaveCount(
      1,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
}

for (const { prefix } of variants) {
  test(`Yaaa topic ${prefix || 'zh'} uses nested route and language links`, async ({ page }) => {
    await page.goto(`/tech${prefix}/topics/`);
    await page.locator(`main a[href="/tech${prefix}/topics/yaaa/"]`).click();
    await expect(page).toHaveURL(`/tech${prefix}/topics/yaaa/`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://blog.fnpg.me/tech${prefix}/topics/yaaa/`,
    );
    for (const other of variants.filter((variant) => variant.prefix !== prefix)) {
      await expect(
        page.locator(`a[data-lang-target="${other.prefix.slice(1) || 'zh'}"]`),
      ).toHaveAttribute('href', `/tech${other.prefix}/topics/yaaa/`);
    }
    await expect(page.locator('main a[href*="/posts/yaaa/"]').first()).toBeVisible();
    await page.goto(`/tech${prefix}/yaaa/`);
    await expect(page).toHaveURL(`/tech${prefix}/topics/yaaa/`);
  });
}
