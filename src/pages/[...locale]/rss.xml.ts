/* global URL */
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { detectLocale, htmlLang, localizedPath, useTranslations } from '~/i18n/utils';
import { SITE } from '~/config';
import { getPosts, postPath } from '~/utils/posts';

export const GET: APIRoute = async (context) => {
  const locale = detectLocale(context.url.pathname);
  const t = useTranslations(locale);
  if (import.meta.env.CI_SKIP_RSS_SITEMAP === 'true') {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    return rss({
      title: t('site.title'),
      description: t('site.description'),
      site: new URL(localizedPath('/', locale), context.site ?? SITE.url).toString(),
      stylesheet: `${base}/rss/styles.xsl`,
      items: [],
      customData: `<language>${htmlLang(locale)}</language>`,
    });
  }

  const posts = await getPosts(locale);
  // `BASE_URL` ends with a '/' (e.g. '/' in dev, '/chirping-astro/' on Pages),
  // so we slice it off when concatenating to avoid '//rss/styles.xsl'.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: t('site.title'),
    description: t('site.description'),
    site: new URL(localizedPath('/', locale), context.site ?? SITE.url).toString(),
    stylesheet: `${base}/rss/styles.xsl`,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: postPath(post),
      categories: [...post.data.tags, ...post.data.categories],
    })),
    customData: `<language>${htmlLang(locale)}</language>`,
  });
};

export function getStaticPaths() {
  return SITE.locales.map((l) => ({
    params: { locale: l === SITE.defaultLocale ? undefined : l },
    props: { locale: l },
  }));
}
