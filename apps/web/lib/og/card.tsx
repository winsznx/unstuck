import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_URL } from "../site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/*
 * Read once at module scope; nothing here depends on the request. Literal paths under process.cwd() keep the build's
 * file tracing to these files. The colors come from the light theme in app/tokens.css, so the card can't drift from
 * the site and no hex value lives outside the tokens.
 */
const FONTS = [
  { name: "Schibsted Grotesk", data: readFileSync(join(process.cwd(), "assets/fonts/SchibstedGrotesk-Regular.ttf")), weight: 400 as const, style: "normal" as const },
  { name: "Schibsted Grotesk", data: readFileSync(join(process.cwd(), "assets/fonts/SchibstedGrotesk-SemiBold.ttf")), weight: 600 as const, style: "normal" as const },
  { name: "Schibsted Grotesk", data: readFileSync(join(process.cwd(), "assets/fonts/SchibstedGrotesk-Bold.ttf")), weight: 700 as const, style: "normal" as const },
];
export const MARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "app/icon.svg")).toString("base64")}`;

const TOKENS_CSS = readFileSync(join(process.cwd(), "app/tokens.css"), "utf8");
const LIGHT = Object.fromEntries(
  [...TOKENS_CSS.slice(0, TOKENS_CSS.indexOf(':root[data-theme="dark"]')).matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
);

/** A light-theme color token by name. A missing token fails the build rather than drawing a card in the wrong color. */
export function token(name: string): string {
  const value = LIGHT[name];
  if (!value) throw new Error(`app/tokens.css has no --color-${name}`);
  return value;
}

const C = {
  stage: token("stage"),
  stageLine: token("stage-line"),
  surface: token("surface"),
  border: token("border"),
  ink: token("ink"),
  inkSecondary: token("ink-secondary"),
  onAction: token("on-action"),
  log: token("log"),
  logStrong: token("log-strong"),
  logMuted: token("log-muted"),
  fails: token("fails"),
  passes: token("passes"),
  onState: token("on-state"),
  unsureSoft: token("unsure-soft"),
  borderStrong: token("border-strong"),
  shadow: token("shadow"),
};

const ORIGIN = SITE_URL.replace(/^https?:\/\//, "");
const DESCRIPTION_LIMIT = 132;

/** A verdict a stored run backs, drawn as a punch tag. Only the run record card passes these. */
export interface OgTag {
  verdict: "missing" | "works" | "unsure";
  label: string;
}

export interface OgCard {
  title: string;
  description?: string;
  /** The graphite tag beside the wordmark, such as "Docs". */
  label?: string;
  /** Shown after the site origin in the graphite band, such as "/docs/faq". */
  path: string;
  /** The right side of the band: the docs section, or what the page is. */
  note: string;
  tags?: readonly OgTag[];
  /** Balanced lines read better for a sentence, but split a name like owner/repo-name at its hyphen. */
  balanceTitle?: boolean;
}

/** Two lines at most: a shorter title gets a larger size. */
function titleSize(title: string): number {
  if (title.length <= 16) return 104;
  if (title.length <= 26) return 88;
  if (title.length <= 40) return 74;
  return 62;
}

function fitDescription(text: string): string {
  if (text.length <= DESCRIPTION_LIMIT) return text;
  const cut = text.slice(0, DESCRIPTION_LIMIT);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.:;]$/, "")}…`;
}

/**
 * The punch tag (docs/DESIGN.md section 6) as Satori can draw it: no clip-path or mask, so the clipped corner and the
 * hole are painted in the sheet's paper color over the fill.
 */
function Tag({ fill, ink, size, dashed = false, children }: { fill: string; ink: string; size: number; dashed?: boolean; children: string }) {
  const corner = size * 0.42;
  const hole = size * 0.2;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        padding: `${size * 0.22}px ${size * 0.6}px ${size * 0.22}px ${size * 1.25}px`,
        borderRadius: 4,
        background: fill,
        border: dashed ? `2px dashed ${C.borderStrong}` : "none",
        color: ink,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.2,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -corner / 2, left: -corner / 2, width: corner, height: corner, background: C.surface, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", top: "50%", left: size * 0.6 - hole / 2, width: hole, height: hole, marginTop: -hole / 2, borderRadius: 999, background: C.surface }} />
      {children}
    </div>
  );
}

const TAG_COLORS: Record<OgTag["verdict"], { fill: string; ink: string; dashed?: boolean }> = {
  missing: { fill: C.fails, ink: C.onState },
  works: { fill: C.passes, ink: C.onState },
  unsure: { fill: C.unsureSoft, ink: C.inkSecondary, dashed: true },
};

/** The share card: a paper sheet on the concrete stage, the wordmark, the title and lead, and a graphite band with the address. */
export function renderOgCard({ title, description, label, path, note, tags, balanceTitle = true }: OgCard): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 40,
          background: C.stage,
          backgroundImage: `linear-gradient(${C.stageLine} 1px, transparent 1px), linear-gradient(90deg, ${C.stageLine} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          fontFamily: "Schibsted Grotesk",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            background: C.surface,
            boxShadow: `0 18px 48px -12px ${C.shadow}55`,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 60px 0" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img elements only. */}
              <img alt="" width={50} height={50} src={MARK} />
              <div style={{ marginLeft: 14, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>UNSTUCK</div>
              {label ? (
                <div style={{ display: "flex", marginLeft: 18 }}>
                  <Tag fill={C.ink} ink={C.onAction} size={22}>
                    {label}
                  </Tag>
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: 44 }}>
              <div
                style={{
                  display: "flex",
                  maxWidth: 1000,
                  fontSize: titleSize(title),
                  fontWeight: 700,
                  lineHeight: 1.04,
                  letterSpacing: "-0.035em",
                  color: C.ink,
                  textWrap: balanceTitle ? "balance" : "wrap",
                }}
              >
                {title}
              </div>
              {description ? (
                <div style={{ display: "flex", maxWidth: 960, marginTop: 20, fontSize: 28, fontWeight: 400, lineHeight: 1.4, color: C.inkSecondary }}>
                  {fitDescription(description)}
                </div>
              ) : null}
              {tags && tags.length > 0 ? (
                <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
                  {tags.map((tag) => (
                    <Tag key={tag.label} size={26} {...TAG_COLORS[tag.verdict]}>
                      {tag.label}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 76,
              padding: "0 60px",
              background: C.log,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", color: C.logStrong }}>
              {ORIGIN}
              <span style={{ color: C.logMuted }}>{path === "/" ? "" : path}</span>
            </div>
            <div style={{ display: "flex", color: C.logMuted }}>{note}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}
