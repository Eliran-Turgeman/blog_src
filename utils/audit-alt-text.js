const fs = require('fs-extra');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'source', '_posts');

const GENERIC_ALT_TEXTS = new Set([
  'image', 'img', 'photo', 'picture', 'pic',
  'alt text', 'alt', 'screenshot', 'screen shot',
  'figure', 'thumbnail', 'thumb', 'banner',
  'logo', 'icon', 'graphic', 'illustration',
  'placeholder', 'untitled', 'test', 'example',
  'cover', 'header', 'hero',
]);

function isGenericAlt(alt) {
  const normalized = alt.trim().toLowerCase();
  if (GENERIC_ALT_TEXTS.has(normalized)) return true;
  // Single word alt text (excluding reasonable single words longer than 15 chars)
  if (!/\s/.test(normalized) && normalized.length <= 15) return true;
  return false;
}

function isFilenameAlt(alt, src) {
  if (!src) return false;
  const basename = path.basename(src);
  const nameNoExt = basename.replace(/\.[^.]+$/, '');
  const normalized = alt.trim().toLowerCase();
  return (
    normalized === basename.toLowerCase() ||
    normalized === nameNoExt.toLowerCase() ||
    normalized === nameNoExt.toLowerCase().replace(/[-_]/g, ' ')
  );
}

function diagnoseAlt(alt, src) {
  if (!alt || alt.trim() === '') return 'Missing alt text';
  if (isFilenameAlt(alt, src)) return `Alt text is just the filename ("${alt}")`;
  if (isGenericAlt(alt)) return `Generic alt text ("${alt}")`;
  return null;
}

// Match markdown images: ![alt](src) — handles optional title in quotes
const MD_IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Match HTML <img> tags
const HTML_IMG_RE = /<img\s[^>]*?\/?>/gi;
const ALT_ATTR_RE = /alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const SRC_ATTR_RE = /src\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const images = [];

  // Markdown images
  let match;
  while ((match = MD_IMG_RE.exec(content)) !== null) {
    const alt = match[1];
    const src = match[2];
    const line = content.substring(0, match.index).split('\n').length;
    images.push({ alt, src, line, type: 'markdown' });
  }

  // HTML <img> tags
  while ((match = HTML_IMG_RE.exec(content)) !== null) {
    const tag = match[0];
    const altMatch = tag.match(ALT_ATTR_RE);
    const srcMatch = tag.match(SRC_ATTR_RE);
    const alt = altMatch ? (altMatch[1] ?? altMatch[2]) : '';
    const src = srcMatch ? (srcMatch[1] ?? srcMatch[2]) : '';
    const line = content.substring(0, match.index).split('\n').length;
    const hasAltAttr = ALT_ATTR_RE.test(tag);
    images.push({ alt: hasAltAttr ? alt : '', src, line, type: 'html', missingAttr: !hasAltAttr });
  }

  return images;
}

function run() {
  if (!fs.existsSync(postsDir)) {
    console.error(`Posts directory not found: ${postsDir}`);
    process.exit(1);
  }

  const mdFiles = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  let totalImages = 0;
  let totalIssues = 0;
  const fileReports = [];

  for (const file of mdFiles) {
    const filePath = path.join(postsDir, file);
    const images = scanFile(filePath);
    if (images.length === 0) continue;

    totalImages += images.length;
    const issues = [];

    for (const img of images) {
      let issue;
      if (img.type === 'html' && img.missingAttr) {
        issue = 'Missing alt attribute on <img> tag';
      } else {
        issue = diagnoseAlt(img.alt, img.src);
      }
      if (issue) {
        issues.push({ src: img.src, line: img.line, type: img.type, issue });
      }
    }

    if (issues.length > 0) {
      totalIssues += issues.length;
      fileReports.push({ file, issues });
    }
  }

  // Print report
  console.log('\n🔍 Alt Text Audit Report\n');
  console.log('='.repeat(60));

  if (fileReports.length === 0) {
    console.log('\n✅ No alt text issues found!\n');
  } else {
    for (const { file, issues } of fileReports) {
      console.log(`\n📄 ${file}`);
      for (const { src, line, type, issue } of issues) {
        const tag = type === 'html' ? '<img>' : '![]()';
        console.log(`   Line ${line} [${tag}] ${issue}`);
        if (src) console.log(`      src: ${src}`);
      }
    }
  }

  const okCount = totalImages - totalIssues;
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary');
  console.log(`   Total images found: ${totalImages}`);
  console.log(`   Issues found:       ${totalIssues}`);
  console.log(`   OK:                 ${okCount}`);
  console.log();
}

run();
