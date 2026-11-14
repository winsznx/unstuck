/**
 * A reviewer's sentence as plain reading text. The words are kept exactly; only `inline code` spans lose their
 * backticks and render as code, the way GitHub showed them to the reviewer.
 */
export function QuoteText({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-tag bg-surface-muted px-1 font-mono text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
