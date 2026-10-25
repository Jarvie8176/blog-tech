import { expect, test } from 'bun:test';
import { readingTime } from './reading-time';

test('Chinese and Japanese text does not collapse to one whitespace-delimited word', () => {
  expect(readingTime('知識'.repeat(450)).minutes).toBe(2);
  expect(readingTime('あいうえお'.repeat(180)).minutes).toBe(2);
});
test('code fences do not inflate the estimate', () => {
  expect(readingTime('```ts\n' + 'const x = 1;\n'.repeat(500) + '```').minutes).toBe(1);
});
test('English text retains a word estimate and empty content has a minimum', () => {
  expect(readingTime('word '.repeat(440)).minutes).toBe(2);
  expect(readingTime('').minutes).toBe(1);
});
