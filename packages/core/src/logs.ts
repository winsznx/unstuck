const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const TELLING = /\b(error|cannot find|can't find|not found|no such file|failed|failing|exception|panic|denied|missing|undefined reference|exit code [1-9])/i;

export const stripAnsi = (text: string): string => text.replace(ANSI, "");

export function tellingLine(output: string): string | null {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => TELLING.test(l) && !/^\s*(at |\d+ \|)/.test(l)) ?? lines.at(-1) ?? null;
}
