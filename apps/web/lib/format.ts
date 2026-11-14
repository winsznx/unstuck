export const sha7 = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : "unknown");

export function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const day = (value: Date | string) => DATE.format(typeof value === "string" ? new Date(value) : value);

export function repoName(url: string | null | undefined): string {
  if (!url) return "no repo";
  return url.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export function clock(value: Date): string {
  return `${day(value)}, ${value.toISOString().slice(11, 19)} UTC`;
}

/** The image DockerRunner (packages/replay) checks a commit out with. */
const CHECKOUT_IMAGE = "alpine/git:v2.49.1";

const CHECKOUT_SCRIPT = [
  "set -e",
  "git init -q /work/repo",
  "cd /work/repo",
  'git remote add origin "$REPO_URL"',
  'git fetch -q --depth 1 origin "$SHA"',
  "git -c advice.detachedHead=false checkout -q FETCH_HEAD",
].join("; ");

/**
 * A script that reruns a record the way DockerRunner ran it: a shallow fetch of the commit into an empty volume, then
 * each step in its own container on that volume, with the runner's read-only system, scratch /tmp, HOME, CI and
 * dropped capabilities. Installs that write caches under HOME or into the repo work the same way they did in the run.
 */
export function reproduceScript(input: {
  repoUrl: string;
  sha: string;
  image: string;
  steps: readonly { name: string; command: string; network: "none" | "bridge" }[];
}): string {
  const lines = [
    "V=$(docker volume create)",
    "",
    "# checkout: a shallow fetch of exactly this commit into the empty volume",
    `docker run --rm -v "$V":/work -e REPO_URL=${shellQuote(input.repoUrl)} -e SHA=${shellQuote(input.sha)} \\`,
    `  --entrypoint sh ${CHECKOUT_IMAGE} -c ${shellQuote(CHECKOUT_SCRIPT)}`,
  ];
  input.steps.forEach((step, i) => {
    lines.push(
      "",
      `# ${i + 1}. ${step.name.replace(/\s+/g, " ")}`,
      `docker run --rm --network ${step.network} --read-only --tmpfs /tmp:rw,exec,size=1g \\`,
      `  -e HOME=/work/.home -e CI=true -v "$V":/work -w /work/repo \\`,
      `  --cap-drop ALL --security-opt no-new-privileges ${input.image} \\`,
      `  sh -lc ${shellQuote(step.command)}`,
    );
  });
  lines.push("", 'docker volume rm "$V"');
  return lines.join("\n");
}

/** A listed response time, rounded the way people say it: "45 min", "2 h", "3 days". */
export function within(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 172_800) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86_400)} days`;
}
