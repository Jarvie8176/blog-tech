import process from 'node:process';
import avatarImg from './assets/images/site/avatar.svg';
import ogDefaultImg from './assets/images/site/og-default.png';
import type { GiscusConfig, NavItem, SiteConfig, SocialLink } from './types/config';

/**
 * Global site + theme configuration.
 * Edit values here to rebrand the theme. All values are typed and consumed
 * across layouts, components, RSS, sitemap, and SEO.
 */

// Export imported site images for use in components
export const SITE_IMAGES = {
  avatar: avatarImg,
  ogDefault: ogDefaultImg,
} as const;

export const locales = ['zh', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];

/**
 * Author + social handles. Filled in from env vars (see `.env.example`)
 * so identifiers never need to be hard-coded into source.
 *
 * Leave any handle as an empty string to drop it from the sidebar
 * automatically — the entry won't render and no broken `your-handle`
 * URL is exposed.
 */
const GITHUB_HANDLE = import.meta.env.PUBLIC_GITHUB_HANDLE ?? 'Jarvie8176';
const GITHUB_REPO = import.meta.env.PUBLIC_GITHUB_REPO ?? 'blog-tech';
const TWITTER_HANDLE = import.meta.env.PUBLIC_TWITTER_HANDLE ?? '';
const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL ?? '';
const THEME_REPO_URL = 'https://github.com/kannansuresh/chirping-astro';

/**
 * Public GitHub coordinates of the deployed source. Useful for custom links
 * and integrations that need a repository URL. When
 * `PUBLIC_GITHUB_HANDLE` is unset, `url` falls back to a safe default so
 * generated links never point at a 404.
 */
export const REPO = {
  handle: GITHUB_HANDLE,
  name: GITHUB_REPO,
  url: GITHUB_HANDLE ? `https://github.com/${GITHUB_HANDLE}/${GITHUB_REPO}` : 'https://github.com',
} as const;

export const SITE: SiteConfig = {
  // ==========================================
  // ✅ SAFE TO EDIT (Content & Presentation)
  // ==========================================

  /** Default site title used as homepage <title> and meta. */
  title: '技术笔记',
  /** Site tagline / description. */
  description: 'Yaaa、个人 AI 系统，以及从工程实践中留下的知识。',
  /** Author/handle shown in footer + meta. */
  author: {
    name: 'J. Kong',
    url: 'https://portfolio.fnpg.me/',
    avatar: avatarImg,
    bio: '记录设计，也记录设计被验证的过程。',
  },
  /** Default OG image. */
  defaultOgImage: ogDefaultImg.src,
  /** Number of posts per page on listings. */
  postsPerPage: 8,
  /** Display ISO 8601 date format if true, otherwise locale-aware. */
  isoDates: false,
  /** Site-wide default for whether posts should display their featured image. */
  showFeaturedImages: true,
  /** Wrap the article body of posts and pages in a bordered, card-like container. */
  boxedArticles: false,
  /** Allow listing cards to grow when title/description content is longer. */
  dynamicPostCardHeight: false,
  /** Automatically generate Open Graph images for posts that don't have a `heroImage`. */
  autoOgImage: false,
  /** Show a link to the Privacy Policy page in the footer. */
  showPrivacyPolicy: true,
  /** Footer text/link controls. */
  footer: {
    /**
     * Optional full override for the left footer line. Supports {year} and {author}.
     * Default when undefined: "© {year} {author}" (+ Privacy Policy link if enabled).
     */
    leftText: undefined,
    /**
     * Optional custom text before the theme link on the right footer line.
     * Default when undefined: "Powered by Astro · Theme <themeName>".
     */
    rightText: undefined,
    /** Whether to show the Privacy Policy link in the footer. */
    showPrivacyPolicy: true,
    /** Whether to show theme credits in the footer right side. Theme <themeName> */
    showThemeCredits: true,
    /** Label for the theme repository link in the right footer line. */
    themeName: 'Chirping Astro',
    /** Default upstream theme repository. */
    themeUrl: THEME_REPO_URL,
  },

  // ==========================================
  // ❗ CAN BREAK THINGS (EDIT WITH CAUTION)
  // ==========================================

  /** Public URL of the deployed site, no trailing slash. Breaks SEO/RSS if incorrect. */
  // `||` (not `??`) so an explicitly empty `SITE_URL=` in `.env` also
  // falls back to the default. Astro requires `site` to be a valid URL.
  url: process.env.SITE_URL || 'https://blog.fnpg.me',
  /** Supported locales. Changing this requires adding/removing locale folders, content, and i18n entries. */
  locales: locales,
  /** Default locale. Changing this is a breaking, atomic, multi-file operation. */
  defaultLocale: 'zh',
  /** Show the language switcher and link to translated pages. */
  multilingual: true,
};

// Public tracker configuration only. API credentials never belong in the build.
const umamiWebsiteId = (import.meta.env.PUBLIC_UMAMI_WEBSITE_ID ?? '').trim();
const umamiScriptUrl =
  (import.meta.env.PUBLIC_UMAMI_SCRIPT_URL ?? '').trim() || 'https://cloud.umami.is/script.js';
if (
  umamiWebsiteId &&
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(umamiWebsiteId)
) {
  throw new Error('PUBLIC_UMAMI_WEBSITE_ID must be an Umami website UUID');
}
if (new URL(umamiScriptUrl).protocol !== 'https:') {
  throw new Error('PUBLIC_UMAMI_SCRIPT_URL must use HTTPS');
}
export const ANALYTICS = {
  enabled: Boolean(umamiWebsiteId),
  websiteId: umamiWebsiteId,
  scriptUrl: umamiScriptUrl,
  domain: new URL(SITE.url).hostname,
} as const;

export const TOPICS = [
  { key: 'yaaa', href: '/topics/yaaa/', descriptionKey: 'yaaa.description' },
] as const;

export const NAV: readonly NavItem[] = [
  { key: 'home', href: '/', icon: 'lucide:home' },
  { key: 'topics', href: '/topics/', icon: 'lucide:layers', children: TOPICS },
  { key: 'categories', href: '/categories', icon: 'lucide:layers' },
  { key: 'tags', href: '/tags', icon: 'lucide:tag' },
  { key: 'archives', href: '/archives', icon: 'lucide:archive' },
  { key: 'about', href: '/about', icon: 'lucide:info' },
] as const;

/**
 * SOCIALS is built from the env-driven handles above so users only edit
 * one place (`.env` or the constants at the top of this file). Empty
 * handles are filtered out automatically — the icon simply won't appear
 * in the sidebar. RSS is always present.
 *
 * Need a social network the theme doesn't ship with? Just append a
 * literal entry below — the type is `SocialLink`.
 */
export const SOCIALS: readonly SocialLink[] = [
  GITHUB_HANDLE && {
    label: 'GitHub',
    href: `https://github.com/${GITHUB_HANDLE}`,
    icon: 'simple-icons:github',
  },
  TWITTER_HANDLE && {
    label: 'Twitter',
    href: `https://x.com/${TWITTER_HANDLE}`,
    icon: 'simple-icons:x',
  },
  CONTACT_EMAIL && {
    label: 'Email',
    href: `mailto:${CONTACT_EMAIL}`,
    icon: 'lucide:mail',
  },
  { label: 'RSS', href: '/rss.xml', icon: 'lucide:rss' },
].filter(Boolean) as SocialLink[];

/**
 * Giscus comments. Set `enabled: false` to globally disable. Individual
 * posts may opt out via frontmatter `comments: false`.
 *
 * Generate values at https://giscus.app and either set them here or
 * (recommended) provide them via PUBLIC_GISCUS_* env vars at build time.
 */
export const GISCUS: GiscusConfig = {
  enabled: (import.meta.env.PUBLIC_GISCUS_ENABLED ?? 'false') === 'true',
  repo: import.meta.env.PUBLIC_GISCUS_REPO ?? '',
  repoId: import.meta.env.PUBLIC_GISCUS_REPO_ID ?? '',
  category: import.meta.env.PUBLIC_GISCUS_CATEGORY ?? 'Announcements',
  categoryId: import.meta.env.PUBLIC_GISCUS_CATEGORY_ID ?? '',
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom',
  loading: 'lazy',
};

/**
 * Pagefind runtime settings. The index itself is generated by `bun run pagefind`
 * after `astro build` and written to `dist/_pagefind/`.
 */
export const PAGEFIND = {
  /** Public path where the Pagefind bundle is served. */
  bundlePath: '/_pagefind/',
  /** Number of results to render per locale. */
  pageSize: 10,
} as const;
