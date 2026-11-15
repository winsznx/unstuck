# UNSTUCK design system

Version 3, 6 November 2026. v1 read like a wireframe (raw markdown in the comment, a pink wash over whole paragraphs, one empty screen of landing). v2 fixed the comment and the landing. v3 adds the shell: one header with places marked by a punch tag, Jump, the Agent Market account, a phone menu, a dark theme, and global loading, error and 404 states. The tokens live in `apps/web/app/tokens.css`. `pnpm --filter @unstuck/web contrast` checks every color pair this file relies on, in both themes, and exits 1 on any failure. `pnpm --filter @unstuck/web guardrails` runs section 15.

## 1. Foundation

UNSTUCK is for one person: a grantee whose milestone payment is waiting on a reviewer's comment. It reads the comment, runs the reviewer's steps on a fresh copy of the repo, gets the missing piece built on NEAR Agent Market, checks the fix with the same steps, and hands back a pull request and a reply.

- Brand line: Your reviewer left one comment. UNSTUCK gets it closed.
- The idea a person should leave with: every thing the reviewer asked for gets a tag, and the tag only changes when a run proves it.
- Personality: plain, exact, on the grantee's side. It never overstates. It can't make a funder pay, and it says so.
- Audience: builders on grant programs (Canton Dev Fund, W3F, NEAR, Filecoin, Stellar SCF). They read GitHub all day and trust logs more than claims.

## 2. Territories

### A. Punch list (chosen)

When a building inspector walks a site, every open item gets a tag. Yellow is open, red failed inspection, green passed. A reviewer's comment is the same thing, a punch list on a milestone. UNSTUCK's job is to walk the list, tag each item from a real run and close it.

- Type: a firm newsroom grotesk for the interface, a reading serif only for the reviewer's own words, mono only for real machine output.
- Composition: left aligned. The reviewer's comment is the hero object, with tags pinned to its sentences.
- Geometry: small radii. The tag is a 3 px rectangle with a clipped corner and a punched hole. Panels are 10 px.
- Color: concrete grey shell, white paper, graphite ink, and three inspection colors that carry meaning only.
- Strength: it maps one to one onto the product's logic (ask, run, verdict). Nobody else in the gallery looks like this.
- Risk: three state colors read like a traffic light. The tag shape, the highlight on the quoted sentence and the log line next to every verdict keep it specific.

### B. Lab notebook

The replay as an experiment record: grid paper, hand-ruled tables, results as measurements. It's trustworthy, but it reads academic and slow, and grid paper is a common template.

### C. Terminal first

A dark console where the run is the product. It's honest about the work, but it crowds the reviewer's voice out, looks like every dev tool, and lands on the near-black plus one bright accent default.

Locked: A, Punch list.

## 3. Color

### 3.1 Tokens

Components use these names only, never a hex value.

| Token | Value | Role |
| --- | --- | --- |
| canvas | #F3F4F0 | The page behind panels. Lighter than v1 so the stage reads as a separate surface |
| surface | #FFFFFF | Paper. Panels, forms, the comment |
| surface-muted | #F6F7F4 | Grouped regions inside a panel, row hover, card headers |
| stage / stage-line | #E3E7DF / #D3D9CF | Concrete with a 28 px survey grid. Only behind product scenes (hero, final call to action, 404) |
| border | #D9DDD6 | Hairlines, panel edges |
| border-strong | #B9BFB6 | Hover edges, dashed empty states |
| border-control | #81877F | Inputs at 3:1 |
| ink | #1D2226 | Graphite. Text, the primary button, focus ring |
| ink-secondary | #4E565C | Secondary text |
| ink-muted | #5F676D | Meta text, timestamps |
| action / action-strong / on-action | #1D2226 / #0E1215 / #FFFFFF | The one main action on a screen |
| open / open-soft / open-edge / open-mark | #F3C53B / #FCEFC4 / #8A6A06 / #F9E08A | The reviewer asked for this, and no run has closed it |
| fails / fails-soft / fails-text / fails-mark | #B3361F / #FBE6E0 / #A3301B / #F6C3B5 | A run proved it still fails |
| passes / passes-soft / passes-text / passes-mark | #1F6E45 / #DFF0E5 / #1B6540 / #BFE4CC | A run proved it works |
| unsure-soft | #E7EAE5 | Not tested. Always a dashed edge |
| on-state | #FFFFFF | Labels on the fails and passes tags. Never flips with the theme |
| on-open | #1D2226 | Labels on the open tag, the pin and the inverse button. Never flips with the theme |
| log / log-ink / log-muted / log-fail / log-pass | #1D2226 / #D8DDD5 / #9AA39A / #FF9A85 / #8FD9AD | The run log panel and the graphite band only |
| log-strong | #FFFFFF | Headings on the graphite band. Use it there instead of on-action, which flips in dark |
| shadow | #1D2226 | The color every shadow and the dialog backdrop mix from. Black in dark |

### 3.2 Dark theme: the same list under site lights

`:root[data-theme="dark"]` in tokens.css lays these over the light values. Anything not listed keeps its light value. The tags keep their fills because they are physical objects; their labels use on-open and on-state, which never flip. The log gets darker than the canvas so the graphite band still reads as a band.

| Token | Dark value | Note |
| --- | --- | --- |
| canvas / surface / surface-muted | #141819 / #1B2023 / #21272A | Panels step up from the canvas |
| stage / stage-line | #171C1E / #232A2D | |
| border / border-strong / border-control | #2D3439 / #434C52 / #78828A | |
| ink / ink-secondary / ink-muted | #ECEFE9 / #B6BEB8 / #9AA39D | Chalk |
| action / action-strong / on-action | #ECEFE9 / #FFFFFF / #141819 | The primary button turns chalk with graphite text |
| focus | #F3C53B | The one meaning of yellow besides open: a focus ring where graphite would vanish. Here that's the dark canvas; globals.css also turns the ring yellow on the graphite log surfaces in light |
| open-soft / open-edge / open-mark | #3A3116 / #D9AD2A / #5C480C | |
| fails-soft / fails-text / fails-mark | #3A1D18 / #FF9F8B / #6C2A1E | |
| passes-soft / passes-text / passes-mark | #14301F / #8FD9AD / #1D5034 | |
| unsure-soft | #283034 | |
| log | #0C0F10 | |
| shadow | #000000 | |

The theme is "system" by default. The choice ("light" or "dark") is stored in localStorage under `unstuck:theme`; no entry follows the device. `THEME_BOOT_SCRIPT` (`components/shell/theme.ts`) runs in `<head>` and sets `data-theme` before first paint, so a dark page never flashes light. Storage that throws leaves the device setting in charge. Write dark variants through tokens; never `dark:` utilities with raw values.

### 3.3 Rules

1. The page is 90 percent concrete, paper and graphite. The inspection colors appear only where a verdict exists.
2. Open, fails and passes are verdicts, never decoration and never buttons. There are no yellow, red or green buttons.
3. A verdict color changes only when a stored run changes it. The UI never shows a guess in a verdict color. Not sure is grey and dashed.
4. Color never works alone. Every tag has its word, every log verdict has its exit code.
5. Text on the open yellow is on-open. White text sits only on fails, passes (on-state) and the graphite band (log-strong). Text on action is on-action.
6. No gradients, no glass, no glow. Elevation is reserved for the one object a screen is about (the comment card, a dialog).

## 4. Typography

| Role | Family | Use |
| --- | --- | --- |
| Interface | Schibsted Grotesk 400, 500, 600, 700 | Everything people read and click |
| Reviewer's voice | Newsreader 400 and 400 italic | Only text the reviewer actually wrote, quoted verbatim |
| Machine output | JetBrains Mono 400, 500 | Log lines, commit ids, commands, exit codes. Never labels or prose |

Scale: display 38 to 68 px (hero only), section 30 to 46 (the landing's section headings), h1 26 to 34, h2 21, h3 16, lead 19, body 15, small 13, tag 12, quote 20, comment 18, log 12.5, inputs 16.

On the landing the same tokens follow its fluid scale (section 7.3), driven by both the width and the height of the screen, with no step at any breakpoint. Display, section, h1 and the lead shrink toward floors of 30, 24, 24 and 17 px (35, 27, 25 and 17 on a 360x560 phone) and reach 68, 46, 34 and 19 at the design size (1280 px wide with an 880 px room). Body, small, tag and log never go below 15, 13, 12 and 12.5. Above the design size every size grows with the zoom, about 1.4 times on a 2560x1318 screen.

- Sentence case everywhere, tags included. No all-caps labels and no eyebrows above headings.
- Reading width stops at 42 rem.
- A serif line on screen means the reviewer said it, word for word. If a quote isn't a substring of the source comment, it isn't shown (packages/core `isVerbatimQuote`).
- Commit ids show 7 characters with the full id in the title attribute and the run record.
- Numbers: Schibsted Grotesk's tabular figures also give periods, commas and colons a digit's width, so `tabular-nums` turns "$18.50" into "$18 . 50". Use `tabular-nums` only on bare integers (counts, step numbers, exit codes, the ask number in a tag). Amounts, durations, times and dates stay proportional. The guardrail script flags `tabular-nums` next to `money(`, `centsLabel(`, `duration(`, `clock(` or `<time>`.

## 5. Geometry and space

- Spacing on a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. On the landing the base and the radii grow with the zoom on screens bigger than the design size (section 7.3).
- Radii: tag 3 px, control 6 px, panel 10 px, sheet 14 px, stage 20 px. A child never has a larger radius than its parent.
- Shadows: `shadow-sheet` lifts a paper sheet off the stage, `shadow-object` for smaller cards. Panels on the plain canvas have a border and no shadow.
- Borders are 1 px. 2 px is the focus ring and the active step bar.
- Dashed 1 px means not there yet (empty states) or not tested (the not-sure tag).

## 6. The signature: the punch tag, the pin and the highlighter

The one bold element. Everything else stays quiet.

- Tag: a small rectangle, 3 px radius, its top-left corner clipped at 45 degrees, with a punched hole at the left. Label in sentence case: Open, Still missing, Works, Not sure, Fixed. It can carry the ask's number before a hairline divider (`<PunchTag n={1} />`). Two sizes, md for lists and lg for the hung tag.
- Pin: a numbered disc at the start of each marked sentence, filled like its tag. The number ties the sentence to its row on the punch list, its tag and its log line.
- Highlighter: the marked sentence gets a stroke under the lower half of each line in the tag's mark color (open-mark, fails-mark, passes-mark), never a full wash. v1 used a wash and it read as an error banner.
- Hung tag: on the landing hero, the decided tag hangs off the comment sheet's top edge at 4 degrees with a drop shadow. It only appears when a stored run decided that ask.
- The stroke starts yellow. When a replay passes on the fix, `--mark` transitions to passes-mark over 420 ms. That is the only narrative motion in the product, and it only fires on a real stored result.
- Next to every Still missing tag sits the real log line that failed, in mono, with its step number and exit code. No log line, no red.

### 6.1 Rendering the reviewer's comment

The body is GitHub markdown. `apps/web/lib/markdown.ts` parses paragraphs, lists (with task boxes), quotes, headings, rules, fenced code, inline code, bold, italics, strikethrough, links, bare URLs and @mentions, and every visible character keeps its offset in the original body. Marks are stored as `(quoteStart, length)` over the raw body and split across inline nodes, so a sentence that runs through a link or code span still lands on the exact characters. Syntax characters are never shown. Links are `rel="nofollow noreferrer ugc"` and only http(s), `#` or `/` hrefs become anchors.

## 7. Layout

- Left aligned, one column for reading, max 72 rem for marketing.
- Landing: a hero and six sections, one screen each (section 7.2).
- Milestone page `/m/:id`: one vertical page in five parts (Read, What's missing, Fix, Check, Send). Each part is a section with a 2 px left bar that turns ink when it's the current part. Parts that haven't happened yet show what will happen, dashed.
- Run record `/runs/:id`: a public read-only record. The quote, the commit, then each step as a row (number, name, command, exit code, time, output hash), with the log tail in the log panel.
- Mobile first. Everything works at 360 px with a 16 px gutter and no horizontal scroll. Logs wrap; they never scroll the page sideways.

### 7.1 Shell and navigation

The body is a column: header, `<main>` (full width, takes the remaining height), footer. A page centres itself with `max-w-* mx-auto`; it never needs `w-full`.

One header everywhere, marketing and app alike, because a grantee moves between them in one sitting. `SiteHeader` (server) reads the Agent Market account and renders `HeaderBar`.

```
1024 px and up
[tag] UNSTUCK   (Milestones) Study  For agents  How it works   [Jump ⌘K] [NEAR Agent Market | Soon] [moon] [Check a review]
                 ^ the place you're in wears a graphite punch tag

below 1024 px
[tag] UNSTUCK                                      [Check a review] [Milestones ≡]
                                                                     ^ names where you are, opens the menu
```

- Places (`components/shell/nav.ts`, `PLACES`): Milestones (also `/runs`), Study, For agents, How it works. Check a review (`START`, to `/start`) is the action, not a place, and the header, menu, Jump, footer and landing all use that one name. `placeFor(pathname)` decides the current one.
- The bar is opaque canvas with a hairline under it. No blur and no see-through (section 3.3 rule 6): over the graphite band a translucent bar turned muddy grey.
- The current place: `.nav-tag`, the punch tag shape in graphite with on-action text. Graphite, never a verdict color, because location isn't a result. The focus ring sits on `.nav-tag-wrap`, since the clip would cut it.
- Agent Market account (`AccountChip`): signed out, a dashed control, "NEAR Agent Market" and "Soon" after a hairline, linking to the landing's Coming next section (`/#fix`), because sign-in ships with hiring and isn't switched on (dashed means not done yet, as everywhere). Below 1280 px it shows "Agent Market | Soon" and keeps "NEAR" for screen readers. Signed in, the handle and the balance, linking to `/account`. `readMarketAccount()` in `components/shell/account.ts` is the one read; until the session store lands it returns signed out.
- Jump (`Palette`): one box that takes a reviewer's GitHub link (opens `/start?url=`), a milestone or run id (`/m/:id`, `/runs/:id`), or a place name. ⌘K, Ctrl K or `/` opens it. Below 1280 px the header button is its icon alone, with its name and `aria-keyshortcuts` kept for assistive tech. Pasting a GitHub issue or pull request link anywhere outside a field opens it with the link ready, because a link in the clipboard is how every milestone starts. Arrow keys move, Enter runs, Escape closes.
- Phone menu (`MobileMenu`): a native modal `<dialog>` from the right, so focus is trapped and Escape closes it. Check a review, Jump, every place with a one-line hint, the Agent Market account with why you'd need it and that it isn't switched on yet, and the theme choice (System, Light, Dark). It closes on navigation and when any link in it is followed, since a link to a section of the same page keeps the route. Nothing in the header exists only on desktop.
- Hints never promise what isn't built: For agents says how an agent calls UNSTUCK over MCP, Jump's Connect Agent Market entry says sign-in isn't switched on, and How it works ends at a tag on each ask.
- Theme: the header toggle flips light and dark from whatever shows now, and reads to assistive tech as a "Dark theme" toggle with `aria-pressed`; the phone menu offers System, Light and Dark.
- Skip link: the first Tab stop on every page, "Skip to content", points at `<main id="main-content">`, which every page that renders the header carries, and its click handler also focuses `<main>`.
- Focus scrolled into view clears the sticky header: links, buttons, fields, `summary` and anything with a tabindex carry `scroll-margin-top` of the header height plus 1 rem (globals.css).
- Keyboard hints (`.kbd`) hide on coarse pointers.
- Every control in the bar and the footer links on phones are at least 44 px tall.

### 7.2 Landing

A hero and six sections, one idea per screen, in the order a newcomer's questions arrive: what is it, why does a payment stall, how does it work, why would my reviewer believe it, what about the fix, is it for me, what's left to ask. The code is `app/page.tsx` composing `components/landing/`.

| Screen | id | Tone | Heading | Visual |
| --- | --- | --- | --- | --- |
| Hero | | canvas | See what your reviewer is still waiting for. | The showcase comment on the stage up to the end of the decided ask, only the words its check tests struck and pinned, a caption saying the ask is the whole sentence, the hung tag, and the check clipped under the card: its commit, the whole command, the line it printed, the exit code and what the check can't see |
| 1 | `problem` | paper | Each missed ask costs another review round. | One public review as a ticket: a punched hole per day from delivery to acceptance with the three dates filled in, the days before the first review greyed out and counted in a legend (23 to the first review, 38 after it), one outstanding issue quoted word for word and linked to its line, the four issues and the two later reviews, the reviewer's own failing run labeled as theirs, and a line saying UNSTUCK doesn't read evaluation files yet. Two causes beside it, then the study's live counts |
| 2 | `how` | canvas | You pick the asks and checks. UNSTUCK runs them. | Three frames on the stage: the pasted link and what it found; the ticked ask, its check and the kinds of asks UNSTUCK suggests checks for; the three tags with the rule that sets each, then the stored tag at its commit with the deciding line and what the check can't see. A Check a review button under them, beside what today's record is for |
| 3 | `proof` | graphite band | A link your reviewer can check for themselves. | The top of the showcase run record as a paper sheet: the review it answers, the commit, the image, then each step, with a check's words, tag and whole command under its row. A (the commit), B (network) and C (output hash) match three points on the left, and B carries the containers and time limits |
| 4 | `fix` | canvas | Next: hire the fix on NEAR Agent Market. | What's live, what's built (with a link to the hire screen) and what isn't built, then one dashed work order (hire, check, send) whose first row shows what an agent would get, filled from the showcase's stored ask, failing line and repo |
| 5 | `limits` | paper | UNSTUCK is for grantees waiting on a review. | What you bring, decide, get and what it reads, beside What UNSTUCK won't do |
| 6 | `questions` | canvas | Before you paste a link | Six questions with their answers open, then the closing band on the stage with the link field |

- `Screen` (`components/landing/screen.tsx`) makes each section at least one room tall, the room being the visible screen under the 65 px header, with no upper limit, and centres the content in it; on a phone the content starts at the top, so what it leaves over sits above the Next link. Its spacing, type and column width come from the landing's fluid scale (section 7.3): they shrink on a short laptop or a phone and grow on a big monitor, so a section reads as one screen there instead of a block in empty canvas. "Next: section name" hangs from the bottom edge of the room and shows only while the content leaves it that space, so it's never cut by the fold. `bleed` lets the last block run to the section's bottom edge on a phone, for the closing paste band. Rails, folds and height variants for fitting a section on small screens are in 7.3 too. Measured 7 November 2026 against the room under the header, light on laptops and monitors and as a touch phone up to 1024 px wide: at all 15 targets every section is exactly one room, with no content past it; the content fills 71 to 81 percent of the room at 1920x960 and 2560x1318.
- `ScreenHeading` is the h2 with its pin and one lead on a shared baseline. Nothing else sits in the lead column: a status goes into the section's own visual, as section 4's strip does.
- Sections carry their number on a graphite pin before the h2, the same disc as an ask's pin. Graphite because it marks place, never a result. No eyebrow above a heading.
- Tones alternate canvas, paper and the graphite band, so the edge of each screen shows without a rule. Paper and the band also carry a hairline top and bottom, since in dark the band is only one step darker than the canvas.
- Every visual is real UI on stored data. `showcase()` (`UNSTUCK_SHOWCASE`) feeds the hero and sections 2 to 4, and it points at a milestone made through `/start`, so its checks carry the names `/start` gives them ("check 1") and came from the suggestion rules or the owner. Section 1 reads `PUBLIC_REVIEW` (`components/landing/public-review.ts`): its dates came from the GitHub API on 7 November 2026, and the quoted issue, the status, the four outstanding issues and the failing run come from the first version of the reviewer's evaluation file (commit f16f736, linked to the quoted line). `facts.test.ts` pins its day counts (23, 38, 61), the four issues and the two later reviews. Section 1 also states the study's counts, read on each request (`studyFactsOf(buildStudy(...))`); the line is left out until a review has been rerun, or when the read fails. No count is typed into the copy. With no showcase the scenes show their empty states and the frames keep only their words.
- A long ask opens with its preamble, so next to a check (the hero's mark, section 2's ticked ask, section 3's check row and section 4's hire row) the landing shows the clause that check tests, with an ellipsis where words were cut. `CHECKED_CLAUSE` in `facts.ts` names it per reviewer comment, and it shows only while the stored ask holds it word for word; otherwise the whole ask shows. The hero strikes only that clause (`spanOf` places it in the body), and its caption says the ask is the whole sentence, so the untested part isn't hidden. `CHECK_SCOPE` says what a check can't see, keyed by its exact command, and shows only while the stored command matches.
- Honesty: the hero promises only what runs today, names the commit the way the product finds it (the last commit before the review, which the owner confirms) and says a fix gets the same checks only when you paste it. A stored tag on the landing always appears with its commit; section 2's key of all three tags carries no number and no commit, so it never reads as a result. The link field says what it reads (asks in a comment, not linked evaluation files), that nothing runs or is saved until the run starts, and that each run then gets a permanent public record listed under Recorded runs. Section 4 opens with "Next", lists what's live, what's built and what isn't built, and draws its work order dashed. The landing shows no reply mock and no "needs exit 0 on the fix" example: a check that can't decide its ask shouldn't be shown turning green.
- The hero comment is a preview: `CommentCard preview` keeps its links and mentions as plain text and the crop clips without scrolling, so nothing hidden takes focus. On GitHub and See a real example are the ways to the whole comment. On phones the comment shows only its last lines, bottom-aligned so the checked words stay in view and fading in at the top, and the check sits under the card instead of over it.
- In the hero the check's command shows whole, except on phones (two lines) and from 1024 to 1279 px (three lines), where the two-column scene is narrow. Section 3's record excerpt always shows every command whole, wrapped. On phones that excerpt turns each step into its name, then network, exit and hash, then a check's words and command.
- The section ids keep the shell's links working: `#how`, `#proof`, `#fix` (the header's Agent Market chip), `#limits`, `#questions`.
- The pin and the inverse button on the graphite band are on-open on log-strong, 16 to 1 in both themes because neither token flips. Focus rings on the band and on the hero's check slip are yellow in both themes, since graphite would vanish there. Every other pair the landing uses is in section 16.

### 7.3 Landing frame, fluid scale and compact patterns

On any screen each landing section is one room tall, its content fits that room, and everything scales smoothly with the screen. The CSS is `apps/web/app/landing.css`, imported by globals.css after the tokens.

Units. Four custom properties on `:root`, computed from the viewport alone:

| Unit | Value | What it is |
| --- | --- | --- |
| `--landing-room` | `100svh - 4rem - 1px` | The room: the visible screen under the header and its hairline. `svh`, so a phone's sliding browser bars don't resize sections |
| `--landing-fit` | `clamp(0rem, min((100vw - 10rem) / 70, (room - 27.5rem) / 27.5), 1rem)` | How much of the design size fits: 0 on the smallest screens, 1rem from 1280 px wide with an 880 px room, set by whichever of width and height runs out first |
| `--landing-u` | `clamp(1rem, min(1vw, room / 55), 2rem)` | The zoom: 1rem up to 1600 px wide with an 880 px room, then the smaller of 1vw and room / 55, at most 2rem |
| `--landing-grow` | `u - 1rem` | What the zoom adds. 0 until the screen is bigger than the design size |

A fluid size is `MIN + fit × (DESIGN − MIN) / 1rem + grow × DESIGN / 1rem`: its floor MIN where fit is 0 (a room under 440 px or a screen under 160 px wide, so in practice a little above it: fit is 2 px on a 360x560 phone and 3.3 px on a 390 px one), DESIGN at the design size, then in proportion with the zoom. It's one continuous function of the width and the height, so nothing steps at a breakpoint. A size whose MIN equals its DESIGN never shrinks and only zooms.

Scoped tokens. `.screen`, the root of every section, redefines the shared tokens for its subtree, so the sections' ordinary classes (`text-section`, `p-5`, `rounded-sheet`, `min-h-11`) follow the scale and no other page changes:

| Token | Floor | Design size | 2560x1318 |
| --- | --- | --- | --- |
| `text-display` (hero h1) | 30 px | 68 | 97 |
| `text-section` (section h2) | 24 | 46 | 65 |
| `text-h1` | 24 | 34 | 48 |
| `text-lead` | 17 | 19 | 27 |
| `text-h2`, `h3`, `quote`, `comment`, `input`, `body`, `small`, `log`, `tag` | 21, 16, 20, 18, 16, 15, 13, 12.5, 12 | the same | 1.42 times |
| `--spacing`, behind every spacing and sizing utility | 4 | 4 | 1.42 times |
| `radius-control`, `panel`, `sheet`, `stage` | 6, 10, 14, 20 | the same | 1.42 times |

Spacing utilities and radii only zoom, so every 44 px target stays at least 44 px. Arbitrary values such as `max-w-[34rem]` or `text-[0.6875rem]` stay put while everything around them zooms: use a token or a spacing number instead (`max-w-(--screen-measure)`, `max-w-136`).

Frame tokens, set on `.screen` for the frame and for the sections, through Tailwind's variable shorthand (`gap-(--screen-gap-md)`, `pt-(--screen-gap)`). All of them zoom above the design size like everything else:

| Token | Floor | Design size | Use |
| --- | --- | --- | --- |
| `--screen-pt` | 16 px | 56 | The frame's top padding |
| `--screen-pb` | 8 | 16 | Its bottom padding, under the Next link |
| `--screen-gap` | 16 | 40 | Between the frame's blocks: the heading and the visual |
| `--screen-gap-md` | 12 | 24 | Between the parts of a block |
| `--screen-gap-sm` | 8 | 16 | Inside a part |
| `--screen-next-gap` | 8 | 24 | The least space between the content and the Next link |
| `--screen-next-h` | 44 | 44 | The Next link's height |
| `--screen-gutter` | 16 | 24 from 640 px wide | The header's gutter, so the content lines up with the logo. It doesn't zoom |
| `--screen-measure` | 34 rem | 34 rem | A lead's width |

Column. `main.landing` gives the header, the sections and the footer one column, 76 × u wide: 76 rem until the zoom starts and 1731 px on a 2560x1318 screen, where the logo still lines up with every heading.

Next link. It hangs from the bottom edge of the room, `--screen-pb` above it. With a link, the frame stops `--screen-next-gap` plus `--screen-next-h` short of the room, and a size container, `.screen-next-zone`, runs from there to the frame's bottom. While the content leaves that space free, the zone has no height and the link shows. Once the content needs the space, the zone gains height, its container query hides the link and the content takes the space. So the link is either wholly inside the room or not shown, at any size, and no height breakpoint has to be kept in step with the content.

Height variants for compact layouts: `compact:` (a viewport 900 px tall or less), `short:` (760 or less) and `tight:` (600 or less), negated as `not-compact:`, `not-short:` and `not-tight:`. They test height only, so pair one with a width variant for a laptop-only rule: `lg:short:hidden`.

Rail (`components/landing/rail.tsx`). A row of cards that swipes below a breakpoint the caller picks (`until`: sm, md, lg or xl) and is the caller's grid from there up. Narrow, the row scrolls inside itself with mandatory snap points, bleeds into the screen's gutters without widening the page (`flush` turns that off for a rail that isn't at the content's edge), and each card leaves a 40 px peek of the next. The scroller is a labelled region in the tab order, so arrow keys scroll it, with an inset focus ring. On touch screens a thin thumb under it slides with the scroll position. It's a scroll-driven animation, so it appears only where the browser has them, and it never moves on its own; elsewhere the thin native scrollbar stays. Wide, the scroller is `display: contents`: no box and no tab stop. `shortUntil`, a wider breakpoint, also swipes below it on a screen under 1024 px tall, so a laptop or a landscape tablet keeps the row and only a tall portrait tablet gets the grid. `tall` lets the cards take a share of a tall phone's spare height (over 760 px), for a section whose rail is its main content. The scroller is positioned, so absolute or sr-only text in a card is clipped by it instead of widening the page.

```tsx
<Rail label="How one milestone goes" until="lg" as="ol" className="gap-4 lg:grid-cols-3 lg:gap-6">
  {frames.map((frame) => <li key={frame.n}>…</li>)}
</Rail>
```

Fold (`components/landing/fold.tsx`). Fine print that is a native `details` under a summary label below a width (`until`) or at a height tier and lower (`short`), and plain text everywhere else. Both copies are rendered and exactly one is displayed, so assistive tech reads it once. The children render twice, so they must not carry ids. A fold hides nothing a reader can't open, so a caveat in one is still on the page. `tall` undoes the `until` fold on a screen taller than 760 px, such as a tall phone with room to show it open. Every disclosure on the landing shares one summary: the label at body size and weight 600, at least 44 px tall, with a chevron in a 20 px ring, matching the A, B and C callouts, that turns when it opens.

```tsx
<Fold label="Containers and time limits" until="lg" short="short" as="p" className="mt-1.5 text-small text-log-muted">
  {point.detail}
</Fold>
```

Pin. `ScreenPin` sizes itself from the section heading it sits in: 0.78 of the heading's size, at least 28 px, centred on its first line.

Measuring. `/dev/landing/[section]` renders the site header and one section (`hero`, `problem`, `how`, `proof`, `fix`, `limits` or `questions`) with the landing's own data. `loadLanding()` and `LandingSection` in `components/landing/sections.tsx` serve both, so the preview can't drift from the page. Production answers 404 for all of /dev. The component preview shows a Rail and a Fold under Landing patterns.

## 8. Components

| Component | Recipe |
| --- | --- |
| Button, primary | `bg-action text-on-action hover:bg-action-strong rounded-control min-h-11 px-5 font-semibold`; `size="lg"` is 52 px tall |
| Button, inverse | On the graphite band only: `bg-log-strong text-on-open hover:bg-log-ink`, graphite on white, 16 to 1 in both themes. Never yellow: yellow means an open ask (section 3.3 rule 2) |
| Button, secondary | `bg-surface text-ink border border-border-strong hover:border-ink-muted rounded-control min-h-11 px-5` |
| Button, quiet | `text-ink-secondary hover:text-ink underline-offset-4 hover:underline min-h-11` |
| Field | label above (`text-small font-semibold`), input `min-h-12 rounded-control border border-border-control bg-surface px-3.5 text-input`, hint below in ink-muted, error below in fails-text with what to change |
| Panel | `rounded-panel border border-border bg-surface` |
| Comment card | `CommentCard`: sheet radius, `shadow-sheet`, a muted header (initials, author, date, `source`, On GitHub), the body through `RichComment`, an optional numbered punch list (`list`, or any mark with a `note`). `clampOnSmall` cuts long comments on phones |
| Run slip | `RunSlip`: graphite receipt of a stored run, one row per command, the deciding line in log-fail, an optional link to the record |
| Link field | `UrlForm`: the GET form to `/start`, one bordered row holding the input and the large primary button |
| Stage | `.stage rounded-stage`: concrete with the survey grid, only behind product scenes |
| Screen | `Screen`, `ScreenHeading`, `ScreenPin` (`components/landing/screen.tsx`): one landing section, one room tall, on the fluid scale. Section 7.3 |
| Rail | `Rail` (`components/landing/rail.tsx`): a row of cards that swipes below a breakpoint and is a grid above it. Section 7.3 |
| Fold | `Fold` (`components/landing/fold.tsx`): fine print folded into a native `details` on narrow or short screens, plain elsewhere. Section 7.3 |
| Tag | See section 6. Variants open, missing, works, unsure, fixed |
| Step row | Number, name, `font-mono` command, exit code, duration, hash. A row is a register line, hairlines only, never a shadow |
| Log panel | `LogPanel`: `bg-log text-log-ink font-mono log-type rounded-panel`, the failing line in log-fail with a left mark, optional `title` bar. Use `log-type` for log sizing: `text-log` is both a size and a color token and is ambiguous |
| Stepper | `components/stepper.tsx`, shared by `/start` and `/connect`. One row per step: title, a one-line summary of the choice once made, or what's ahead. The current step is filled in ink |
| Nav tag | `.nav-tag` inside `.nav-tag-wrap`; `aria-current="page"` turns it graphite |
| Jump | `PaletteButton` opens `Palette`. A page can offer it as an action (the 404 does) |
| Account chip | `AccountChip`: dashed when signed out, handle and balance when signed in. `full` keeps "Agent Market" in the label at every width |
| Theme | `ThemeToggle` (header), `ThemeChoice` (menu, settings) |
| State panel | `StatePanel`: a paper sheet on the stage with an optional tag, a title that says what happened, a line that says what to do, and the actions. Used by 404 and the error page; use it for any page-level empty or blocked state |
| Empty state | Dashed border-strong, one line saying what to do, one action |
| Loading | Says what is loading, in words ("Running step 2 of 3"). No spinners alone, no shimmer. The route-level `app/loading.tsx` shows the header, a status line and dashed outlines of the sheets to come |

Every interactive element gets the 2 px focus ring (graphite in light, yellow in dark) with a 2 px offset. Inside a `bg-log` surface the ring is yellow in light too, since graphite would vanish there.

## 9. States

Every screen designs these explicitly: first visit, link pasted, reading, nothing found, asks found, running (step k of n), done, still missing, not sure, checkout failed (shown as an error, never as still missing), private repo, unsupported link, rate limited, waiting on an account the person hasn't connected, hired, delivered, checking, fix passes, fix fails, ready to send, sent.

A failed checkout or an infrastructure error never produces a verdict. It says what failed and offers to run again.

Global states, all in the shell:

| State | File | What it says and offers |
| --- | --- | --- |
| Loading | `app/loading.tsx` | "Reading the stored record for this page", over dashed outlines |
| Not found | `app/not-found.tsx` | Tag "No record here". "There's no page at this address": milestone and run links are permanent, so it was mistyped or cut short. Start a milestone, Jump |
| Page error | `app/error.tsx` | Tag "Page error". "This page couldn't load": stored milestones and runs haven't changed. Try again, Your milestones, and the error reference to quote. The header shows without the account, since the read may be what failed |

## 10. Onboarding

`/start` is a five-step flow. Each step has a title, a one-line lead, and a line saying what's ahead. Once a step is done its row shows the choice in plain words, and any done step can be reopened without losing the others.

| Step | Title | Lead | Ahead |
| --- | --- | --- | --- |
| 1 | Your reviewer's comment | Paste the link to the comment that's holding your payment, then pick it from the thread. | The comment's link |
| 2 | The code they reviewed | The repo and the commit your reviewer looked at. UNSTUCK runs their steps on exactly that commit. | Repo and commit |
| 3 | What they asked for | Tap each sentence where your reviewer asks for something. Each one gets its own tag. | The sentences to close |
| 4 | The steps to rerun | One command per ask that proves it works. The install step gets network access, every check after it runs offline. | Commands to run |
| 5 | Run it | UNSTUCK runs the steps on a fresh copy and shows you what's still missing. Nothing is posted anywhere. | First run |

Run stays off until at least one ask has a check, and the server refuses a run without one, so every milestone gets a run record and every ask a tag.

The landing's link field goes straight to step 1 with the thread already read, and it suggests the comment the link points to. Sentences come from `sentencesOf` (packages/pipeline), so every pick is a verbatim, offset-exact piece of the comment, and the server checks the offsets again before saving. When NEAR AI is connected it pre-selects step 3, and the owner still confirms.

The spending limit is asked for at the moment the first fix is about to be bought, not during onboarding.

Accounts are asked for only when the next action needs them: GitHub when a PR is about to open, Agent Market when a fix is about to be bought. A step that needs an account the person hasn't connected says so and shows the one thing to do.

## 11. Copy rules

- Plain words from the copy deck. Never: agent hires agent, contractor, escrow, sandbox, acceptance criterion, held, released, seamless, powerful, effortless.
- Numbers come only from stored data. A number that isn't in the database doesn't appear.
- Buttons say what happens: Find what's missing, Run the steps, Get this fixed, Looks good, Copy reply.
- Errors say what happened and what to do. They don't apologize.
- No arrows appended to links, no middle-dot meta strings, no em dashes.
- The footer line stays on every marketing page: UNSTUCK can't make a funder pay. It closes the reviewer's open item and drafts your reply. Your reviewer still decides.

## 12. Motion

- Fast 140 ms for hover and press, standard 220 ms for things that open, narrative 420 ms for the highlight changing color.
- Nothing animates on page load. Nothing loops. With reduced motion the highlight changes without a transition.

## 13. Accessibility

WCAG AA on every pair (section 3, checked by the script). 44 px targets. Visible focus everywhere. The run state changes are announced through an `aria-live="polite"` region. Tags have text. Logs are real text, selectable and copyable.

## 14. Banned

Gradients and glass, shields, locks, robots, sparkles, chat bubbles as the product, KPI tile walls as a home, fake logos, fake numbers, confetti, all-caps eyebrows, a bright accent on near-black, cream paper with a terracotta accent, cards for everything.

## 15. Guardrails

`pnpm --filter @unstuck/web guardrails` (`apps/web/scripts/guardrails.mjs`) prints nothing and exits 0 on a clean tree. It checks `app/`, `components/` and `lib/` for:

- raw colors outside tokens.css (layout.tsx's browser chrome colors and the `/dev` palette tool are exempt)
- arbitrary color utilities such as `bg-[#…]`
- banned copy: seamless, effortless, powerful, escrow, contractor, sandbox, acceptance criterion
- `tabular-nums` on a formatted amount, time or duration (section 4)

Run `pnpm --filter @unstuck/web contrast` after any token change and paste its table below.

## 16. Contrast check output

Generated 7 November 2026 by `node apps/web/scripts/contrast-check.mjs`. All 78 checks pass (39 pairs in each theme). Yellow on the graphite band is a focus ring now, never an accent or a button, and the inverse button is on-open on log-strong.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
| --- | --- | --- | --- | --- | --- | --- |
| light | ink | canvas | 14.52 | 4.5 | body text on the page | pass |
| light | ink | surface | 16.04 | 4.5 | body text on panels | pass |
| light | ink | surface-muted | 14.91 | 4.5 | body text on muted panels | pass |
| light | ink-secondary | canvas | 6.76 | 4.5 | secondary text on the page | pass |
| light | ink-secondary | surface | 7.47 | 4.5 | secondary text on panels | pass |
| light | ink-secondary | surface-muted | 6.95 | 4.5 | secondary text on muted panels | pass |
| light | ink-muted | surface | 5.75 | 4.5 | meta text on panels | pass |
| light | ink-muted | canvas | 5.21 | 4.5 | meta text on the page | pass |
| light | on-action | action | 16.04 | 4.5 | primary button label | pass |
| light | on-open | open | 9.82 | 4.5 | label on the open tag | pass |
| light | ink | open-soft | 13.96 | 4.5 | reviewer quote on the open highlight | pass |
| light | ink | passes-soft | 13.54 | 4.5 | reviewer quote on the passed highlight | pass |
| light | ink | fails-soft | 13.36 | 4.5 | text on the fails wash | pass |
| light | on-state | fails | 6.06 | 4.5 | label on the fails tag | pass |
| light | on-state | passes | 6.22 | 4.5 | label on the passes tag | pass |
| light | fails-text | surface | 7.00 | 4.5 | fails words on panels | pass |
| light | fails-text | fails-soft | 5.84 | 4.5 | fails words on the fails wash | pass |
| light | passes-text | surface | 7.04 | 4.5 | passes words on panels | pass |
| light | passes-text | passes-soft | 5.94 | 4.5 | passes words on the passes wash | pass |
| light | ink-secondary | unsure-soft | 6.15 | 4.5 | label on the not-sure tag | pass |
| light | ink | open-mark | 12.26 | 4.5 | reviewer quote on the open highlighter stroke | pass |
| light | ink | fails-mark | 10.23 | 4.5 | reviewer quote on the still-missing stroke | pass |
| light | ink | passes-mark | 11.59 | 4.5 | reviewer quote on the works stroke | pass |
| light | ink | stage | 12.80 | 4.5 | text on the concrete stage | pass |
| light | ink-secondary | stage | 5.96 | 4.5 | secondary text on the concrete stage | pass |
| light | ink-secondary | stage-line | 5.19 | 4.5 | secondary text where it crosses the stage grid | pass |
| light | log-ink | log | 11.62 | 4.5 | log text | pass |
| light | log-muted | log | 6.17 | 4.5 | log meta text | pass |
| light | open | log | 9.82 | 3 | focus ring on the graphite band | pass |
| light | on-open | log-strong | 16.04 | 4.5 | inverse button and section pin on the graphite band | pass |
| light | log-fail | log | 7.80 | 4.5 | failing log line | pass |
| light | log-pass | log | 9.69 | 4.5 | passing log line | pass |
| light | border-control | surface | 3.68 | 3 | input boundary | pass |
| light | focus | surface | 16.04 | 3 | focus ring on panels | pass |
| light | focus | canvas | 14.52 | 3 | focus ring on the page | pass |
| light | open | surface | 1.63 | 1.4 | open tag edge, carried by its ink border | pass |
| light | log-strong | log | 16.04 | 4.5 | headings on the graphite band | pass |
| light | on-action | ink | 16.04 | 4.5 | initials and active navigation tag | pass |
| light | ink-secondary | open-soft | 6.50 | 4.5 | secondary text on the open wash | pass |
| dark | ink | canvas | 15.40 | 4.5 | body text on the page | pass |
| dark | ink | surface | 14.16 | 4.5 | body text on panels | pass |
| dark | ink | surface-muted | 13.03 | 4.5 | body text on muted panels | pass |
| dark | ink-secondary | canvas | 9.40 | 4.5 | secondary text on the page | pass |
| dark | ink-secondary | surface | 8.64 | 4.5 | secondary text on panels | pass |
| dark | ink-secondary | surface-muted | 7.95 | 4.5 | secondary text on muted panels | pass |
| dark | ink-muted | surface | 6.34 | 4.5 | meta text on panels | pass |
| dark | ink-muted | canvas | 6.89 | 4.5 | meta text on the page | pass |
| dark | on-action | action | 15.40 | 4.5 | primary button label | pass |
| dark | on-open | open | 9.82 | 4.5 | label on the open tag | pass |
| dark | ink | open-soft | 11.09 | 4.5 | reviewer quote on the open highlight | pass |
| dark | ink | passes-soft | 12.28 | 4.5 | reviewer quote on the passed highlight | pass |
| dark | ink | fails-soft | 13.21 | 4.5 | text on the fails wash | pass |
| dark | on-state | fails | 6.06 | 4.5 | label on the fails tag | pass |
| dark | on-state | passes | 6.22 | 4.5 | label on the passes tag | pass |
| dark | fails-text | surface | 8.28 | 4.5 | fails words on panels | pass |
| dark | fails-text | fails-soft | 7.73 | 4.5 | fails words on the fails wash | pass |
| dark | passes-text | surface | 9.93 | 4.5 | passes words on panels | pass |
| dark | passes-text | passes-soft | 8.62 | 4.5 | passes words on the passes wash | pass |
| dark | ink-secondary | unsure-soft | 7.06 | 4.5 | label on the not-sure tag | pass |
| dark | ink | open-mark | 7.57 | 4.5 | reviewer quote on the open highlighter stroke | pass |
| dark | ink | fails-mark | 9.10 | 4.5 | reviewer quote on the still-missing stroke | pass |
| dark | ink | passes-mark | 8.04 | 4.5 | reviewer quote on the works stroke | pass |
| dark | ink | stage | 14.81 | 4.5 | text on the concrete stage | pass |
| dark | ink-secondary | stage | 9.04 | 4.5 | secondary text on the concrete stage | pass |
| dark | ink-secondary | stage-line | 7.66 | 4.5 | secondary text where it crosses the stage grid | pass |
| dark | log-ink | log | 13.94 | 4.5 | log text | pass |
| dark | log-muted | log | 7.40 | 4.5 | log meta text | pass |
| dark | open | log | 11.78 | 3 | focus ring on the graphite band | pass |
| dark | on-open | log-strong | 16.04 | 4.5 | inverse button and section pin on the graphite band | pass |
| dark | log-fail | log | 9.35 | 4.5 | failing log line | pass |
| dark | log-pass | log | 11.63 | 4.5 | passing log line | pass |
| dark | border-control | surface | 4.19 | 3 | input boundary | pass |
| dark | focus | surface | 10.06 | 3 | focus ring on panels | pass |
| dark | focus | canvas | 10.95 | 3 | focus ring on the page | pass |
| dark | open | surface | 10.06 | 1.4 | open tag edge, carried by its ink border | pass |
| dark | log-strong | log | 19.24 | 4.5 | headings on the graphite band | pass |
| dark | on-action | ink | 15.40 | 4.5 | initials and active navigation tag | pass |
| dark | ink-secondary | open-soft | 6.77 | 4.5 | secondary text on the open wash | pass |
