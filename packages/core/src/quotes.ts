const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

export function isVerbatimQuote(source: string, quote: string): boolean {
  const needle = collapseWhitespace(quote);
  return needle.length > 0 && collapseWhitespace(source).includes(needle);
}

export function keepVerbatim<T extends { quote: string }>(source: string, asks: readonly T[]): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const ask of asks) (isVerbatimQuote(source, ask.quote) ? kept : dropped).push(ask);
  return { kept, dropped };
}
