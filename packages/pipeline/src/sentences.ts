const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/;
const QUOTE_PREFIX = /^\s*>\s?/;

export interface Sentence {
  text: string;
  start: number;
}

export function sentencesOf(body: string): Sentence[] {
  const sentences: Sentence[] = [];
  const pattern = /(?:[^\n.!?]|[.!?](?![.!?]*(?:\s|$)))+(?:[.!?]+(?=\s|$))?/g;
  for (const match of body.matchAll(pattern)) {
    const raw = match[0];
    const lead = raw.length - raw.trimStart().length;
    let text = raw.trim();
    let start = match.index + lead;
    for (const prefix of [QUOTE_PREFIX, BULLET]) {
      const found = prefix.exec(text);
      if (found) {
        text = text.slice(found[0].length);
        start += found[0].length;
      }
    }
    if (text.replace(/[^A-Za-z]/g, "").length >= 12) sentences.push({ text, start });
  }
  return sentences;
}
