import { resolve } from 'node:path';

const root = resolve('dist');
const origin = 'https://blog.fnpg.me';
const mount = '/tech';
const failures: string[] = [];
const htmlFiles = [...new Bun.Glob('**/*.html').scanSync(root)];
let checkedLinks = 0;

async function existsAt(publicUrl: URL): Promise<boolean> {
  if (!publicUrl.pathname.startsWith(`${mount}/`)) return false;
  const relative = decodeURIComponent(publicUrl.pathname.slice(mount.length + 1));
  const file = resolve(root, relative || 'index.html');
  for (const candidate of [file, resolve(file, 'index.html')]) {
    if (await Bun.file(candidate).exists()) return true;
  }
  return false;
}

for (const filename of htmlFiles) {
  const raw = await Bun.file(resolve(root, filename)).text();
  const publicPath =
    filename === 'index.html' ? `${mount}/` : `${mount}/${filename.replace(/index\.html$/, '')}`;
  const current = new URL(publicPath, origin);
  const refs: string[] = [];
  const alternates: Array<{ language: string; href: string }> = [];
  const canonicals: string[] = [];
  let noindex = false;
  let lang = '';
  await new HTMLRewriter()
    .on('html', {
      element(el) {
        lang = el.getAttribute('lang') ?? '';
      },
    })
    .on('a[href]', {
      element(el) {
        refs.push(el.getAttribute('href')!);
      },
    })
    .on('img[src]', {
      element(el) {
        refs.push(el.getAttribute('src')!);
      },
    })
    .on('script[src]', {
      element(el) {
        refs.push(el.getAttribute('src')!);
      },
    })
    .on('meta[name="robots"]', {
      element(el) {
        noindex = (el.getAttribute('content') ?? '').includes('noindex');
      },
    })
    .on('link', {
      element(el) {
        const href = el.getAttribute('href');
        if (!href) return;
        if (el.getAttribute('rel') === 'canonical') canonicals.push(href);
        if (el.getAttribute('hreflang'))
          alternates.push({ language: el.getAttribute('hreflang')!, href });
        if (
          ['stylesheet', 'icon', 'preload', 'alternate', 'sitemap'].includes(
            el.getAttribute('rel') ?? '',
          )
        )
          refs.push(href);
      },
    })
    .transform(new Response(raw))
    .text();
  // Astro emits minimal HTML redirects, outside the normal page layout.
  const legacyTopic = /^(?:(en|ja)\/)?yaaa\/index\.html$/.exec(filename);
  if (legacyTopic) {
    const destination = `${mount}/${legacyTopic[1] ? `${legacyTopic[1]}/` : ''}topics/yaaa/`;
    if (!raw.includes('http-equiv="refresh"') || !raw.includes(`url=${destination}`))
      failures.push(`${filename}: missing topic redirect`);
    if (!(await existsAt(new URL(destination, origin))))
      failures.push(`${filename}: missing redirect destination`);
    continue;
  }
  if (!['zh-Hans', 'en', 'ja'].includes(lang))
    failures.push(`${filename}: invalid language ${lang}`);
  if (filename !== '404.html' && (canonicals.length !== 1 || canonicals[0] !== current.href))
    failures.push(`${filename}: canonical mismatch ${canonicals.join(',')}`);
  if ((filename.endsWith('search/index.html') || filename === '404.html') && !noindex)
    failures.push(`${filename}: missing noindex`);
  if (raw.includes('DRAFT_NOT_FOR_INDEX_5827')) failures.push(`${filename}: draft leaked`);

  // A 404 document deliberately represents a missing URL, not a valid article.
  if (filename === '404.html') continue;
  for (const ref of refs) {
    if (ref.startsWith('#') || /^(data:|mailto:|tel:)/.test(ref)) continue;
    const target = new URL(ref, current);
    if (target.origin !== origin) continue;
    checkedLinks++;
    if (!(await existsAt(target))) failures.push(`${filename}: missing local destination ${ref}`);
  }
  for (const { href } of alternates) {
    if (!(await existsAt(new URL(href))))
      failures.push(`${filename}: missing language alternate ${href}`);
  }
}

for (const [prefix, language] of [
  ['', 'zh-Hans'],
  ['en/', 'en'],
  ['ja/', 'ja'],
]) {
  const feed = await Bun.file(resolve(root, `${prefix}rss.xml`)).text();
  if (!feed.includes(`<language>${language}</language>`))
    failures.push(`${prefix}rss.xml: wrong language`);
  if (feed.includes('/tech/tech/')) failures.push(`${prefix}rss.xml: doubled base`);
}
const sitemap = await Bun.file(resolve(root, 'sitemap-0.xml')).text();
for (const match of sitemap.matchAll(/(?:<loc>([^<]+)<\/loc>|href="([^"]+)"(?=\/>))/g)) {
  const href = (match[1] ?? match[2]).replaceAll('&amp;', '&');
  if (!(await existsAt(new URL(href)))) failures.push(`sitemap: missing destination ${href}`);
}
if (sitemap.includes('/search/')) failures.push('search pages in sitemap');
if (sitemap.includes('unpublished-fixture')) failures.push('draft in sitemap');
if (!(await Bun.file(resolve(root, '_pagefind/pagefind.js')).exists()))
  failures.push('missing Pagefind bundle');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `Validated ${htmlFiles.length} HTML pages and ${checkedLinks} local links/assets; language feeds, draft exclusion and Pagefind present.`,
);
