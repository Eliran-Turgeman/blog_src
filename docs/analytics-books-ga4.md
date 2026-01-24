# GA4 tracking for Books (Hexo + Cactus)

This repo uses GA4 via the theme config (`themes/cactus/_config.yml` → `google_analytics.id: G-...`).

A small delegated click tracker lives in:
- themes/cactus/source/js/analytics-events.js

It sends GA4 events using `gtag('event', ...)` when a clicked element has `data-analytics-action` (and optional other `data-analytics-*` fields).

## What gets tracked

All tracked interactions emit a GA4 event named `ui_click` with parameters.

### Actions you’ll see

- `nav_books` — user clicks the “Books” nav item (header/footer/post menus)
- `book_open` — user clicks a book card or title on `/books/`
- `book_buy` — user clicks a purchase link on a book detail page
- `chapter_open` — user clicks a chapter in the book’s table of contents
- `chapter_prev` / `chapter_next` — user navigates between chapters

### Parameters (event details)

Common fields sent:
- `ui_action` — one of the actions above
- `ui_location` — where the click happened (e.g. `header_nav`, `books_index`, `book_page`, `book_toc`, `chapter_nav`)
- `book_slug` — for book-related clicks
- `chapter_slug` — for chapter-related clicks
- `ui_label` — extra disambiguation (used for nav menu variants)
- `content_title` — short title where relevant
- `link_url`, `link_path`, `link_domain`, `link_text` — link context
- `page_path` — current page path
- `page_referrer` — document referrer (if present)

## How to verify locally

1) Run a build:
- `npx hexo generate`

2) Serve locally (if you do local preview):
- `npx hexo server`

3) Append `?debug_analytics=1` to any URL and click around.
- The browser console will log the event name + params.

Note: GA4 realtime/debug views may not show events from `localhost` unless you explicitly allow/test that way.

## How to view this in the GA4 UI

### 1) Realtime (quick sanity check)
- Reports → Realtime
- Click the Books nav, a book, a chapter, a buy link.
- Look for `ui_click` events and (if available) the parameter values.

### 2) Events report (counts over time)
- Reports → Engagement → Events
- Find `ui_click`
- Click into it to see counts and basic breakdowns.

### 3) Make the parameters usable (Custom dimensions)
GA4 does not automatically show custom event parameters everywhere. Create dimensions for the params you care about:

- Admin → Custom definitions → Create custom dimensions
- Scope: **Event**
- Event parameter:
  - `ui_action`
  - `ui_location`
  - `book_slug`
  - `chapter_slug`
  - `link_domain`
  - `link_path`
  - `page_path`
  - `page_referrer`

After creating them, it can take time (often up to ~24h) for populated values to appear in standard reports.

### 4) “From where they arrived” for Books clicks
Two useful approaches:

A) Referrer-based
- Explore → Free form
- Rows: `page_referrer`
- Columns (optional): `ui_action`
- Filter: `event_name` exactly matches `ui_click`
- Filter: `ui_action` exactly matches `nav_books`

B) Landing page / previous page context
- Explore → Free form
- Rows: `page_path` (the page the user was on when they clicked)
- Filter: `event_name` = `ui_click` AND `ui_action` = `nav_books`

### 5) Track “Buy” performance
- Explore → Free form
- Rows: `book_slug`
- Columns: `link_domain` (or `ui_label` if you prefer)
- Filter: `event_name` = `ui_click` AND `ui_action` = `book_buy`

### 6) Optional: mark key actions as conversions
If you want a KPI:
- Admin → Conversions
- Create a conversion for:
  - Event name = `ui_click` (not ideal), OR
  - Preferably create a GA4 Event (Admin → Events → Create event) that maps `ui_click` with a specific `ui_action` to a new event name like `book_buy`, then mark that as a conversion.

Recommended mapping examples:
- Create event `book_buy` when `event_name=ui_click` and `ui_action=book_buy`
- Create event `book_open` when `event_name=ui_click` and `ui_action=book_open`

## Where the tags live in the theme

Instrumentation is applied in these templates:
- themes/cactus/layout/_partial/header.ejs
- themes/cactus/layout/_partial/footer.ejs
- themes/cactus/layout/_partial/post/actions_desktop.ejs
- themes/cactus/layout/_partial/post/actions_mobile.ejs
- themes/cactus/layout/_partial/book-card.ejs
- themes/cactus/layout/book.ejs
- themes/cactus/layout/book-chapter.ejs

Script loading:
- themes/cactus/layout/_partial/scripts.ejs
