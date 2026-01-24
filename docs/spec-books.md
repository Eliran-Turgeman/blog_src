# Books Content Type Spec (Hexo + Cactus)

## Summary
Add a new "books" content type alongside posts, with its own index and detail pages,
metadata schema, and navigation entry. Books represent self-published long-form works
and should not inherit post-specific UI (date emphasis, tag lists, archive grouping).

## Goals
- Publish books as first-class content with custom fields (ISBN, series, purchase links).
- Provide a /books landing page that lists books in a grid or list.
- Provide a /books/<slug>/ detail page with richer metadata and a call-to-action area.
- Keep the existing post experience unchanged.

## Non-goals
- E-commerce or checkout integration.
- Automated ebook generation or file hosting.
- Authoring tooling beyond Hexo front-matter.

## Content Model
Store book entries under `source/books/` (Markdown files).

Required front-matter:
- `title` (string)
- `slug` (string)
- `date` (ISO date for ordering)
- `type` (string, fixed value: `book`)

Optional front-matter:
- `subtitle` (string)
- `series` (string)
- `series_order` (number)
- `cover` (path/URL)
- `isbn` (string)
- `status` (enum: `draft` | `published` | `out-of-print`)
- `formats` (list: `paperback`, `hardcover`, `ebook`, `audiobook`)
- `purchase_links` (list of `{ label, url }`)
- `excerpt` (string)
- `genres` (list of strings)
- `word_count` (number)
- `page_count` (number)

Example:
```yaml
---
title: "The Clockmaker's Map"
slug: "the-clockmakers-map"
date: 2025-01-15
type: book
subtitle: "A Cartography Mystery"
series: "Brass & Ink"
series_order: 1
cover: /images/books/clockmakers-map.jpg
isbn: "978-1-23456-789-0"
status: published
formats: [paperback, ebook]
purchase_links:
  - label: "Paperback"
    url: "https://example.com/paperback"
  - label: "Ebook"
    url: "https://example.com/ebook"
excerpt: "A city with no north. A map that remembers."
genres: [fantasy, mystery]
word_count: 98000
page_count: 412
---
```

## URL Structure
- Books index: `/books/`
- Book detail: `/books/<slug>/`

## Theme Changes (Cactus)
Add new templates under `themes/cactus/layout/`:
- `books.ejs`: landing page for all books.
- `book.ejs`: detail page for a single book.

Add partials under `themes/cactus/layout/_partial/` as needed:
- `book-card.ejs` (cover + title + subtitle + status)
- `book-meta.ejs` (metadata block, formats, isbn, links)

Update navigation (likely `themes/cactus/_config.yml`) to include "Books".

## Hexo Generation
Implement a simple generator to create:
- A list page at `/books/` with all `type: book` entries.
- Individual detail pages for each book.

Implementation options:
1) Use a theme script in `themes/cactus/scripts/` that registers a generator for `books`.
2) Use a dedicated plugin if preferred (not required for this spec).

## Listing Page Behavior
- Default sort: `date` desc (or `series_order` asc within `series` if present).
- Show cover, title, subtitle, status, short excerpt.
- Optional filters by genre if genres are present.

## Detail Page Behavior
- Title + subtitle
- Cover image (if present)
- Metadata block (series, formats, isbn, page_count, word_count)
- CTA section for purchase links
- Full markdown content for synopsis and extra details

## Config Surface (root `_config.yml` or theme config)
Add a `books` section:
- `books.index_title` (default "Books")
- `books.per_page` (optional, default no pagination)
- `books.show_genres` (bool)
- `books.show_status` (bool)
- `books.default_cover` (path)

## Acceptance Criteria
- `/books/` renders with all book entries.
- `/books/<slug>/` renders a single book with metadata and purchase links.
- Existing posts and archives are unchanged.
- Books can be authored purely via front-matter + markdown.

