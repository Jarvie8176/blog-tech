/* global URL */
import { SITE, type Locale } from '../config';
import { alternates, withBase, useTranslations, htmlLang } from '../i18n/utils';

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  type: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  locale: Locale;
  hreflangs: ReturnType<typeof alternates>;
  /**
   * When `true`, the SEO component emits
   * `<meta name="robots" content="noindex, nofollow">`.
   * Set automatically for unlisted posts/pages when
   * `unlistedHideFromSeo` is `true` (the default).
   */
  noindex?: boolean;
}

interface BuildSeoArgs {
  title?: string;
  description?: string;
  pathWithoutLocale: string;
  fullPath: string;
  locale: Locale;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  /**
   * Restrict hreflang alternates to a subset of locales. Used on post
   * pages where a translation may be missing.
   */
  availableLocales?: readonly Locale[];
  translationLinks?: Partial<Record<Locale, string>>;
  /** Emit `<meta name="robots" content="noindex, nofollow">`. */
  noindex?: boolean;
}

/** Build the SEO data block consumed by `<SEO />`. */
export function buildSeo(args: BuildSeoArgs): SeoMeta {
  const t = useTranslations(args.locale);
  return {
    title:
      args.title && args.title !== t('site.title')
        ? `${args.title} — ${t('site.title')}`
        : t('site.title'),
    description: args.description ?? t('site.description'),
    canonical: new URL(args.fullPath, SITE.url).toString(),
    ogImage: new URL(withBase(args.ogImage ?? SITE.defaultOgImage), SITE.url).toString(),
    type: args.type ?? 'website',
    publishedTime: args.publishedTime?.toISOString(),
    modifiedTime: args.modifiedTime?.toISOString(),
    tags: args.tags,
    locale: args.locale,
    hreflangs: args.translationLinks
      ? [
          ...Object.entries(args.translationLinks).map(([locale, path]) => ({
            locale: htmlLang(locale as Locale),
            href: new URL(path, SITE.url).toString(),
          })),
          ...(args.translationLinks[SITE.defaultLocale]
            ? [
                {
                  locale: 'x-default',
                  href: new URL(args.translationLinks[SITE.defaultLocale]!, SITE.url).toString(),
                },
              ]
            : []),
        ]
      : alternates(args.pathWithoutLocale, args.availableLocales),
    noindex: args.noindex,
  };
}
