import { test, expect } from '@playwright/test';

const languages = [
  {
    locale: 'zh',
    prefix: '',
    lang: 'zh-Hans',
    titles: [
      '为什么要 Homelab：从树莓派上的远程灯控开始',
      '如何管理 Homelab：从手动维护到 AI 运维',
    ],
  },
  {
    locale: 'en',
    prefix: '/en',
    lang: 'en',
    titles: [
      'Why I run a homelab: from Raspberry Pi lighting control',
      'Managing a homelab: from manual maintenance to AI operations',
    ],
  },
  {
    locale: 'ja',
    prefix: '/ja',
    lang: 'ja',
    titles: [
      'Homelab を持つ理由：Raspberry Pi の照明操作から',
      'Homelab の管理：手作業での保守から AI による運用へ',
    ],
  },
];
const slugs = ['why-homelab', 'managing-homelab-with-ai'];

for (const language of languages) {
  for (const [index, slug] of slugs.entries()) {
    test(`${language.locale}: Homelab article ${slug} and matching charts`, async ({ page }) => {
      const path = `/tech${language.prefix}/posts/${slug}/`;
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', language.lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(language.titles[index]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://blog.fnpg.me${path}`,
      );
      const switches = page.locator('[data-article-languages]');
      for (const other of languages) {
        await expect(switches.locator(`a[hreflang="${other.lang}"]`)).toHaveAttribute(
          'href',
          `/tech${other.prefix}/posts/${slug}/`,
        );
      }
      if (index === 0) {
        await expect(
          page.locator(
            `article .prose-chirpy a[href="/tech${language.prefix}/posts/managing-homelab-with-ai/"]`,
          ),
        ).toBeVisible();
      } else {
        await expect(page.locator('article table')).toHaveCount(1);
        await expect(page.locator('article img')).toHaveCount(3);
        for (const [name, height] of [
          ['monthly-scale', 2208],
          ['relative-growth', 1896],
          ['monthly-activity', 2112],
        ] as const) {
          const img = page.locator(
            `article img[src="/tech/images/homelab-ops/${name}-${language.locale}.png"]`,
          );
          await expect(img).toHaveCount(1);
          await expect
            .poll(() =>
              img.evaluate(
                (element: HTMLImageElement, expectedHeight) =>
                  element.complete &&
                  element.naturalWidth === 3216 &&
                  element.naturalHeight === expectedHeight,
                height,
              ),
            )
            .toBe(true);
        }
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    });
  }

  test.describe(`${language.locale}: without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });
    test('Homelab topic and language links', async ({ page }) => {
      await page.goto(`/tech${language.prefix}/topics/homelab-ops/`);
      for (const title of language.titles)
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await page
        .locator(`main a[href="/tech${language.prefix}/posts/managing-homelab-with-ai/"]`)
        .click();
      const next = languages.find((candidate) => candidate.locale !== language.locale)!;
      await page.locator(`[data-article-languages] a[hreflang="${next.lang}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('lang', next.lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(next.titles[1]);
    });
  });
}

test('public Homelab aggregate data is available', async ({ request }) => {
  const response = await request.get('/tech/data/homelab-ops-monthly.csv');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('2026-10,56,2281,77,38,180,430');
  expect(body).not.toMatch(/100\.\d+\.|192\.168\./);
});
