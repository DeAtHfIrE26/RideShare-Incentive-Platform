# Changes

Performance, algorithms, UI/motion and the About section, in that order.
Everything below was measured rather than estimated. Where something was tried
and did not work, it is recorded with the number that killed it.

## How things were measured

- **Client**: Playwright driving Chromium at 390 x 844, 4x CPU throttling and
  Fast 3G (1.6 Mbps down, 150ms RTT), against a database seeded with 120 rides,
  179 bookings and 40 accounts. Figures are medians of four runs.
- **API**: 30-40 requests per endpoint against a local Postgres. For the
  round-trip-sensitive work, a TCP proxy adding 40ms each way (80ms per round
  trip) stands in for a database in another region, since the deployed function
  runs in `iad1` and the database does not.
- **Database**: `EXPLAIN (ANALYZE)` on a 200,000-ride, 500,000-booking copy.
- **Cold start**: importing the built `api/index.js` and timing the module
  graph, five runs after warming the filesystem cache.

The stack is React 18 + Vite 5 + wouter 3 on the client, Express 4 + Passport on
the server, and **PostgreSQL on Neon through Drizzle** — not MongoDB. The Mongo
URI in `main`'s history at `b9f390f` is a dead credential; nothing imports a
Mongo driver.

## Results against the targets

| Target | Before | After |
| --- | --- | --- |
| LCP < 2.5s (`/auth`, cold) | 3000ms | **2460ms** |
| LCP (`/rides`) | 1020ms | **656ms** |
| CLS < 0.1 (worst route) | 0.481 (`/safety`) | **0.019** (`/profile`) |
| Longest task > 100ms after first load | 105ms (`/rides`) | **95ms** |
| INP < 200ms (worst measured interaction) | not measured | **192ms** |
| Main bundle | 413.7 kB / 124.2 kB gzip | **329.4 kB / 102.3 kB gzip** |

CLS per route, before to after: `/` 0.000 -> 0.000, `/rides` 0.058 -> 0.007,
`/rewards` 0.036 -> 0.000, `/safety` 0.481 -> 0.000, `/profile` 0.011 -> 0.019,
`/chat` 0.264 -> 0.000.

INP is reported as the worst `event` timing entry across opening the navigation
sheet, navigating from it, switching tabs, opening and closing the booking
dialog and loading another page of rides, all at 4x CPU throttling. 192ms is
the sheet opening; on an unthrottled machine it is well under a quarter of that.

## 1. Performance

### Route-level code splitting

The client built into one 413.7 kB chunk, so a first visit downloaded the
safety console and the chat client before it could paint the sign-in form. That
download was 2470ms of a 3000ms LCP.

Only the two heavy routes are split: `safety-page` (44.2 kB) and `chat-page`
(29.0 kB). **Splitting every route was tried first and measured worse** — a cold
deep link to `/rides` went from 1020ms to 1276ms, because the 6.7 kB chunk
became an extra round trip on a 150ms link. The remaining pages are 1-7 kB each
and stay inline.

Both split chunks are prefetched on hover, focus and touch from the navigation,
and at startup when the URL opens straight onto one, so the split is not felt
in use. Route changes measured 32-88ms, against 66-81ms before.

### date-fns replaced with Intl.DateTimeFormat

19.9 kB of the bundle produced five fixed date formats. `Intl.DateTimeFormat`
is built into the browser. Every pattern was compared against the date-fns call
it replaced across midnight, noon, single-digit days and year boundaries, and
the output is identical in all cases. Formatters are constructed once at module
scope, since construction is the expensive part of `Intl`.

### Query waves instead of query chains

`/api/user/stats` issued seven queries one after another, each a separate round
trip, plus an eighth that re-fetched the user `req.user` already held and whose
result was assigned and never read. Only two of the seven depend on an earlier
result. `/api/rides/active` and `/api/rides/recommended` had the same shape.

Through the 80ms-per-round-trip proxy:

| Endpoint | Before p50 | After p50 |
| --- | --- | --- |
| `/api/user/stats` | 828.7ms | **419.3ms** |
| `/api/rides/recommended` | 540.1ms | 419.5ms |
| `/api/rides/active` | 497.1ms | 417.8ms |

Output is unchanged. Both demo accounts return the same rides, distance, saved,
enabled, impact, rating and points figures as before the change.

### Index for the list ordering

`listRides` orders by `created_at`, which no index covered, so every page was a
full sort of the table. `id` is now a tiebreaker in both the query and the
index, so a row cannot appear on two pages, or on none, when two rides share a
timestamp. At 200,000 rows:

| Query | Before | After |
| --- | --- | --- |
| list page 1 | 20.5ms | **0.11ms** |
| list page 500 | 27.4ms | 2.6ms |

Shipped as `rideshare-migration-003.sql`, using `CREATE INDEX CONCURRENTLY` so
a live table stays readable and writable while it builds.

### Cold start

`server/db.ts` imported `node-postgres` and its Drizzle adapter statically,
although only the Neon branch runs on Vercel — 30 files the deployed function
never calls. They are now pulled in through `createRequire` on the branch that
uses them, which keeps the exports synchronous.

Module graph load: 733ms -> **663ms**, 214 -> 181 modules.

Most of what remains is `drizzle-orm/neon-serverless` at 460ms, which is the
price of the ORM. Skipping the `WebSocketServer` construction in the serverless
entry was considered and dropped: it is object construction, not module
loading, and does not show up in the measurement.

### Dependencies removed

Nine dependencies were imported nowhere at all, and eight shadcn primitives
were rendered by nothing: `chart`, `carousel`, `calendar`, `command`, `drawer`,
`form`, `input-otp`, `resizable`. Those primitives were the only importers of
another eight dependencies. Removing the seventeen entries takes **54 packages**
out of the install, among them `react-icons` (83 MB), `stripe` with `@stripe/*`
(8.9 MB) and `recharts` (5.4 MB). Each primitive is one `shadcn add` away if it
is wanted later.

## 2. Algorithms and data structures

Only the changes that moved a measured number. At 120 rides most of the usual
techniques would have been ceremony; what is not here is listed under
**Follow-ups**.

- **Parallel query waves** — above. Seven sequential round trips to two waves.
- **Composite index matched to the query** — above. 186x on the list's first
  page at 200k rows.
- **Cached row count.** `count(*)` has no shortcut in Postgres: it reads every
  row, 21.2ms at 200,000 rows, and no index changes that. It ran on every
  request for a page of twenty. It is cached for five seconds and dropped when
  a ride is created, so a new ride still appears in the total immediately —
  verified by creating one and watching the total go from 120 to 121 on the
  next request rather than after the TTL. Concurrent callers share one query
  rather than each starting their own. On Vercel the cache is per warm
  instance, which is the right scope for a read cache.
- **Batched inserts.** Notifying a ride's passengers ran `createMessage` in a
  loop, so a ride with six confirmed seats cost six sequential round trips
  while the request was held open. Both sites — starting a ride, and raising a
  safety alert — now insert in one statement.
- **Request deduplication** was already in place: the unread-message count is
  polled from one shared query key, so the desktop rail and the mobile sheet do
  not each open a poll.
- **Memoised list rows.** `RideCard` is memoised. It does not help the first
  render, but a page of twenty used to re-render whenever the page's own state
  changed, such as opening the publish dialog.

## 3. UI and motion

### The animation library, and why there isn't one

`framer-motion` was already a dependency, so it was the obvious choice and was
built first: `LazyMotion` with the `domAnimation` feature set and `m`
components, which is its smallest useful build.

**It was then removed, because it was measured.** It added 77.8 kB raw / 27.0 kB
gzip to the main chunk and cost **388ms of LCP** on a throttled phone, 2520ms to
2908ms — putting the page back over the 2.5s target that the code splitting had
just brought it under. Nothing here needs gestures, drag or layout projection,
so it was not buying anything the platform does not already do.

The same motion is now CSS animations plus one `requestAnimationFrame` loop for
the counting numbers, at **+1.9 kB raw**. `framer-motion` was removed from the
dependencies with the rest of the dead weight.

### What moves, and why

Every animation has a job, runs for 160-700ms, and animates **only `transform`
and `opacity`** — verified by reading the keyframes off the running animations
in the browser, which reports exactly `["opacity", "transform"]`. Both are
composited, so no transition triggers layout or paint, and nothing runs in a
loop.

- **Route change** — a 260ms fade with an 8px rise on the page body. Navigation
  used to swap one screen for another between frames, which reads as a flicker
  rather than as movement. The shell stays put; only the body moves.
- **List entrances** — rides, rewards, dashboard tiles and the About cards rise
  in with a 35ms stagger, capped at 280ms so a long list never crawls.
- **Counting figures** — the dashboard and rewards totals count to their value
  over 700ms on a decelerating curve. The text is written straight to the DOM
  node, so a count does not re-render the tree once per frame, and the rendered
  markup is always the final value.
- **Card hover** — a 2px lift and a shadow over 160ms, behind `@media (hover:
  hover)` so it does not fire on touch.

### Reduced motion

`prefers-reduced-motion: reduce` is honoured twice over: the components ask
`useMotionEnabled()` and render their final state without scheduling anything,
and a CSS rule collapses every animation and transition for anything that
forgets to ask. Durations are collapsed to 0.01ms rather than zero, so
`transitionend` still fires for anything waiting on it. Verified in a Chromium
context with reduced motion forced: zero running animations, all content at
final opacity, transitions at 1e-05s.

### Loading states, and the layout shift they were causing

The skeletons were shorter than the content they stood in for — `h-28` (112px)
against a 232px ride card — and `/safety` reserved 64px for a list that turned
out to be hundreds of pixels tall, which pushed the safety panel below it down
the page. That was a 0.481 shift, the worst in the app.

- `/safety`: the tracking card holds a fixed height across loading, loaded and
  empty, with the list scrolling inside it. **0.481 -> 0.000**.
- `/chat`: the conversation list is bounded the same way, and the notifications
  card no longer carries `h-full` fighting the fixed-height scroll area inside
  it. **0.264 -> 0.000**.
- `/rides`, `/`, `/rewards`: skeletons at the height of a rendered card.
  **0.058 -> 0.007** and **0.036 -> 0.000**.

### Accessibility

- A visible `:focus-visible` ring on every interactive element, including the
  ones Radix renders without one. A pointer click leaves no ring behind.
- Skeleton blocks are `aria-hidden`, so a screen reader is not read a wall of
  placeholders.
- Decorative icons are `aria-hidden`; the contact links announce that they open
  in a new tab.
- The route-loading fallback is `role="status"` with `aria-live="polite"`.

### Responsiveness

No horizontal overflow at **375, 768, 1280 or 1920px**, on every route,
signed in.

## 4. About

`/about` was extended in place rather than replaced. It keeps its four feature
cards and gains a fuller opening paragraph, an "About the builder" line, and
four contact links with icons — portfolio, GitHub, LinkedIn and email — each
opening in a new tab with `rel="noreferrer noopener"`. No phone number, asserted
by a test.

The footer carries a single `Contact` link pointing at `/about#contact` rather
than a route of its own. Client-side navigation does not act on a fragment, so
the page scrolls to the section itself, after two animation frames so the cards
above have been laid out first.

## What was kept from the release hygiene audit

Re-run after every step and unchanged throughout: **0 findings** across 7 routes
x 3 viewports, and **11/11** interaction checks — one nav definition with all
seven destinations, exactly one item marked current, no nested or dangling
anchors, no dead internal links, no horizontal overflow on phones, scrollable
dialogs and sheets, `/about` inside the app shell, human-readable status labels.

## New dependencies

**None.** Three packages were removed on top of the 54 from the cleanup:
`framer-motion` and its two transitive packages.

## Trade-offs and follow-ups

- **The ride count can be up to five seconds stale** when it changes for a
  reason other than a ride being created — a ride deleted directly in the
  database, for instance. Creating a ride through the app invalidates it
  immediately.
- **Eight shadcn primitives were deleted.** Nothing rendered them, and each is
  one `shadcn add` away, but they are gone from the tree.
- **`content-visibility` on the ride list was tried and reverted**: it made the
  longest task worse, 109ms to 146ms.
- **Keyset (cursor) pagination is not implemented.** Measured at 200k rows it
  is 0.10ms against 2.6ms for `OFFSET`, but the table holds 120 rows and offset
  paging is correct; it is worth doing if the table grows past roughly ten
  thousand.
- **List virtualisation is not implemented**, for the same reason: twenty rows
  per page do not need it.
- **The Neon region is still unknown here**, so the 80ms round trip used for
  the API figures is a stand-in. If the database is far from `iad1`, the real
  numbers are larger than the local ones and the wave change is worth more than
  it looks; if they are co-located, it is worth less.
- **Opening the navigation sheet is 192ms** at 4x CPU throttling, the closest
  thing to the 200ms INP limit in the app. It is Radix's sheet mounting; worth
  revisiting if it ever crosses.
- **The `/ws` realtime channel does not run on Vercel.** A serverless function
  has no long-lived server to attach a WebSocket to. REST works; chat delivery
  and live tracking need Vercel's WebSocket support or a long-running host.
  Unchanged by this work, but still true.
- **The MongoDB credential in `main`'s history at `b9f390f` has not been
  rotated**, and the repository is public.
