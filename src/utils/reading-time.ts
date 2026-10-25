/**
 * Lightweight reading-time estimator. We avoid the full `reading-time` package
 * here because the post body is consumed via Astro's `render()` and we have
 * a numeric word count already.
 */

const WORDS_PER_MINUTE = 220;

export interface ReadingTime {
  /** Whole minutes, minimum 1. */
  minutes: number;
  /** Word count. */
  words: number;
}

export function readingTime(text: string): ReadingTime {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ') // strip fenced code
    .replace(/<[^>]+>/g, ' '); // strip html
  const cjk = plain.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? [];
  const words = plain
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
  return {
    words: words + cjk.length,
    // Approximate CJK character rate; this is a reading aid, not a measured duration.
    minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE + cjk.length / 450)),
  };
}
