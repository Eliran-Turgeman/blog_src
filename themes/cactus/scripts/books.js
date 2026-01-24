var fs = require('fs');
var path = require('path');
var matter = require('hexo-front-matter');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isAbsoluteOrSpecialUrl(url) {
  if (!url) return true;
  // Absolute-from-root, fragment, or any scheme (http:, https:, data:, etc.)
  return url[0] === '/' || url[0] === '#' || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function rewriteMarkdownImageUrls(markdown, fileWithinSourceDir) {
  if (!markdown) return markdown;
  if (!fileWithinSourceDir) return markdown;

  var dirWithinSource = toPosixPath(path.dirname(fileWithinSourceDir));
  if (!dirWithinSource) return markdown;

  // Absolute base (from site root) where the chapter's sibling assets are emitted.
  // Example: file=books/chapters/build_vuln_scanner/01.md -> base=/books/chapters/build_vuln_scanner
  var baseUrl = '/' + dirWithinSource.replace(/^\/+/, '').replace(/\/+$/, '');

  var text = String(markdown);

  // Rewrite HTML image syntax: <img ... src="..." ...>
  text = text.replace(/<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, function (full, attrValue, dq, sq, bare) {
    var originalUrl = (dq || sq || bare || '').trim();
    if (!originalUrl || isAbsoluteOrSpecialUrl(originalUrl)) return full;

    var resolved = path.posix.normalize(baseUrl + '/' + toPosixPath(originalUrl));
    if (resolved[0] !== '/') resolved = '/' + resolved;

    // Preserve original quoting style
    var quote = dq != null ? '"' : (sq != null ? "'" : '"');
    var replacement = 'src=' + quote + resolved + quote;
    return full.replace(/\bsrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, replacement);
  });

  // Rewrite Markdown image syntax: ![alt](url "optional title")
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (full, alt, rawTarget) {
    var target = String(rawTarget || '').trim();
    if (!target) return full;

    // Strip angle brackets: (<./img.png>)
    var wrapped = target[0] === '<' && target[target.length - 1] === '>';
    if (wrapped) target = target.slice(1, -1).trim();

    // Keep optional title after the URL.
    var parts = target.split(/\s+/);
    var url = parts[0] || '';
    var title = parts.slice(1).join(' ');

    // Do not touch absolute URLs, hash links, or protocols (http:, https:, data:, etc.).
    if (!url || isAbsoluteOrSpecialUrl(url)) {
      return full;
    }

    // Resolve relative URL against the chapter file directory.
    var resolved = path.posix.normalize(baseUrl + '/' + toPosixPath(url));
    if (resolved[0] !== '/') resolved = '/' + resolved;

    var rebuilt = resolved + (title ? ' ' + title : '');
    if (wrapped) rebuilt = '<' + rebuilt + '>';
    return '![' + alt + '](' + rebuilt + ')';
  });

  return text;
}

function normalizeSlug(value) {
  if (!value) return '';
  return String(value)
    .replace(/index\.html$/i, '')
    .replace(/\.md$/i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\s+/g, '-');
}

function slugFromPath(path) {
  if (!path) return '';
  var normalized = String(path).replace(/index\.html$/i, '');
  normalized = normalized.replace(/^\/+/, '').replace(/\/+$/, '');
  if (normalized.indexOf('/') === -1) return normalized;
  var segments = normalized.split('/').filter(Boolean);
  if (segments[0] === 'books') {
    return segments[1] || segments[segments.length - 1];
  }
  return segments[segments.length - 1];
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.toArray === 'function') return value.toArray();
  return [value];
}

function uniqueStrings(values) {
  var out = [];
  var seen = {};
  asArray(values)
    .map(function (v) {
      return normalizeSlug(v);
    })
    .filter(Boolean)
    .forEach(function (v) {
      if (seen[v]) return;
      seen[v] = true;
      out.push(v);
    });
  return out;
}

function redirectHtml(targetPath) {
  var target = String(targetPath || '/');
  return (
    '<!doctype html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="refresh" content="0; url=' + target + '">' +
    '<link rel="canonical" href="' + target + '">' +
    '<title>Redirecting…</title>' +
    '</head>' +
    '<body>' +
    '<p>Redirecting to <a href="' + target + '">' + target + '</a>…</p>' +
    '<script>window.location.replace(' + JSON.stringify(target) + ');</script>' +
    '</body>' +
    '</html>'
  );
}

function isBook(page) {
  return page && (page.type === 'book' || page.layout === 'book');
}

function buildChapters(book) {
  var chapterSpecs = asArray(book.chapters);
  if (!chapterSpecs.length) return [];

  var chapters = [];
  chapterSpecs.forEach(function (spec, index) {
    var entry = typeof spec === 'string' ? { file: spec } : (spec || {});
    var file = entry.file || entry.path;
    if (!file) return;

    var fullPath = path.join(hexo.source_dir, file);
    if (!fs.existsSync(fullPath)) return;

    var raw = fs.readFileSync(fullPath, 'utf8');
    var data = matter.parse(raw);
    var body = rewriteMarkdownImageUrls(data._content || '', file);
    var title = data.title || entry.title || slugFromPath(file) || ('Chapter ' + (index + 1));
    var slug = normalizeSlug(data.slug || entry.slug || title || ('chapter-' + (index + 1)));
    var order = typeof data.order === 'number' ? data.order : (typeof entry.order === 'number' ? entry.order : (index + 1));
    var subtitle = data.subtitle || entry.subtitle;
    var summary = data.summary || entry.summary || data.excerpt || entry.excerpt;
    var content = hexo.render.renderSync({ text: body, engine: 'markdown' });
    var aliases = uniqueStrings(data.aliases || data.alias || data.old_slugs || entry.aliases || entry.alias || entry.old_slugs);
    aliases = aliases.filter(function (a) {
      return a && a !== slug;
    });

    chapters.push({
      title: title,
      slug: slug,
      order: order,
      subtitle: subtitle,
      summary: summary,
      content: content,
      aliases: aliases
    });
  });

  chapters.sort(function (a, b) {
    if (a.order !== b.order) return a.order - b.order;
    return String(a.title).localeCompare(String(b.title));
  });

  return chapters;
}

function compareBooks(a, b) {
  if (a.series && b.series && a.series === b.series) {
    var aOrder = typeof a.series_order === 'number' ? a.series_order : Number.MAX_SAFE_INTEGER;
    var bOrder = typeof b.series_order === 'number' ? b.series_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
  }
  var aDate = a.date ? a.date.valueOf() : 0;
  var bDate = b.date ? b.date.valueOf() : 0;
  return bDate - aDate;
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (isBook(data)) {
    data.layout = 'book';
    data.book_chapters = buildChapters(data);
  }
  return data;
});

hexo.extend.generator.register('books', function (locals) {
  var themeBooks = (hexo.theme && hexo.theme.config && hexo.theme.config.books) || {};
  var title = themeBooks.index_title || 'Books';

  var allCandidates = []
    .concat(asArray(locals.pages))
    .concat(asArray(locals.posts))
    .filter(isBook);

  var seenIds = {};
  var books = allCandidates.filter(function (book) {
    if (seenIds[book._id]) return false;
    seenIds[book._id] = true;
    return true;
  });

  books.forEach(function (book) {
    var slug = normalizeSlug(book.slug || slugFromPath(book.path) || slugFromPath(book.source) || book.title);
    book.book_slug = slug;
    book.book_path = '/books/' + slug + '/';
    book.book_chapters = buildChapters(book);
    book.book_chapters.forEach(function (chapter) {
      chapter.book_slug = book.book_slug;
      chapter.book_path = book.book_path;
      chapter.path = '/books/' + book.book_slug + '/' + chapter.slug + '/';
    });
  });

  books.sort(compareBooks);

  var routes = [];
  routes.push({
    path: 'books/index.html',
    data: {
      title: title,
      books: books
    },
    layout: 'books'
  });

  books.forEach(function (book) {
    var hasDefaultPage = typeof book.path === 'string' && /^books\//.test(book.path);
    if (hasDefaultPage) return;
    routes.push({
      path: 'books/' + book.book_slug + '/index.html',
      data: Object.assign({}, book, { book: book }),
      layout: 'book'
    });
  });

  books.forEach(function (book) {
    var chapters = book.book_chapters || [];
    chapters.forEach(function (chapter, index) {
      var prev = index > 0 ? chapters[index - 1] : null;
      var next = index < chapters.length - 1 ? chapters[index + 1] : null;
      var chapterPage = Object.assign({}, chapter, {
        book: book,
        chapters: chapters,
        prev_chapter: prev,
        next_chapter: next
      });
      routes.push({
        path: 'books/' + book.book_slug + '/' + chapter.slug + '/index.html',
        data: {
          title: chapter.title,
          content: chapter.content,
          subtitle: chapter.subtitle,
          book: book,
          chapter: chapter,
          chapters: chapters,
          prev_chapter: prev,
          next_chapter: next
        },
        layout: 'book-chapter'
      });

      // Optional: generate redirect pages for old slugs.
      (chapter.aliases || []).forEach(function (alias) {
        routes.push({
          path: 'books/' + book.book_slug + '/' + alias + '/index.html',
          data: redirectHtml('/books/' + book.book_slug + '/' + chapter.slug + '/'),
          layout: false
        });
      });
    });
  });

  return routes;
});
