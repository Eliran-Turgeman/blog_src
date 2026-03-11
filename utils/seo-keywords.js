const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

const postsDir = path.join(__dirname, '..', 'source/_posts');
const taxonomyPath = path.join(__dirname, 'keyword-taxonomy.json');

function loadTaxonomy() {
  const raw = fs.readFileSync(taxonomyPath, 'utf8');
  return JSON.parse(raw);
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s\-\/]/g, ' ');
}

function countOccurrences(text, term) {
  const normalized = normalizeText(text);
  const normalizedTerm = term.toLowerCase();
  const regex = new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  return (normalized.match(regex) || []).length;
}

function scoreKeywordsForPost(post, taxonomy) {
  const title = (post.data.title || '').toLowerCase();
  const description = (post.data.description || '').toLowerCase();
  const tags = (post.data.tags || []).map(t => t.toLowerCase());
  const body = normalizeText(post.content);

  const scores = {};

  for (const [clusterId, cluster] of Object.entries(taxonomy.clusters)) {
    for (const keyword of cluster.keywords) {
      const kw = keyword.toLowerCase();
      let score = 0;

      // Title match (highest weight)
      if (title.includes(kw)) {
        score += 10;
      }

      // Description match
      if (description.includes(kw)) {
        score += 6;
      }

      // Tag match
      for (const tag of tags) {
        if (tag.includes(kw) || kw.includes(tag)) {
          score += 5;
          break;
        }
      }

      // Body frequency (capped contribution)
      const bodyCount = countOccurrences(post.content, keyword);
      if (bodyCount > 0) {
        score += Math.min(bodyCount, 8);
      }

      // Boost multi-word keywords that match (more specific = more valuable)
      if (score > 0 && kw.split(/\s+/).length > 1) {
        score += 2;
      }

      if (score > 0) {
        // Keep the highest score if same keyword appears in multiple clusters
        if (!scores[keyword] || scores[keyword].score < score) {
          scores[keyword] = { keyword, score, cluster: cluster.label };
        }
      }
    }
  }

  // Also check contentSignals for broader topic matching
  for (const [topic, signals] of Object.entries(taxonomy.contentSignals || {})) {
    for (const signal of signals) {
      const signalLower = signal.toLowerCase();
      if (title.includes(signalLower) || description.includes(signalLower)) {
        // Boost keywords from related clusters
        for (const [kw, entry] of Object.entries(scores)) {
          if (entry.cluster.toLowerCase().includes(topic)) {
            entry.score += 1;
          }
        }
      }
    }
  }

  return scores;
}

function selectTopKeywords(scores, maxKeywords = 8) {
  const sorted = Object.values(scores).sort((a, b) => b.score - a.score);

  // Ensure diversity: pick from different clusters
  const selected = [];
  const clusterCount = {};

  for (const entry of sorted) {
    if (selected.length >= maxKeywords) break;

    const clusterUsed = clusterCount[entry.cluster] || 0;
    // Allow max 3 keywords from the same cluster
    if (clusterUsed < 3) {
      selected.push(entry.keyword);
      clusterCount[entry.cluster] = clusterUsed + 1;
    }
  }

  return selected;
}

async function processPosts() {
  const taxonomy = loadTaxonomy();
  const files = await fs.readdir(postsDir);
  const mdFiles = files.filter(f => path.extname(f) === '.md');

  const report = {
    posts: [],
    keywordCoverage: {},
    contentGaps: [],
  };

  // Track which keywords are used across all posts
  const globalKeywordUsage = {};

  for (const file of mdFiles) {
    const filePath = path.join(postsDir, file);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsed = matter(fileContent);

    const scores = scoreKeywordsForPost(parsed, taxonomy);
    const keywords = selectTopKeywords(scores);

    // Update front matter
    parsed.data.keywords = keywords;

    const updatedContent = matter.stringify(parsed.content, parsed.data);
    await fs.writeFile(filePath, updatedContent);

    // Track for report
    report.posts.push({
      file,
      title: parsed.data.title,
      keywords,
    });

    for (const kw of keywords) {
      globalKeywordUsage[kw] = (globalKeywordUsage[kw] || 0) + 1;
    }

    console.log(`✓ ${file} → ${keywords.length} keywords assigned`);
  }

  // Build coverage report
  console.log('\n' + '='.repeat(70));
  console.log('SEO KEYWORD ANALYSIS REPORT');
  console.log('='.repeat(70));

  console.log(`\nProcessed ${mdFiles.length} posts\n`);

  // Per-post summary
  console.log('─'.repeat(70));
  console.log('KEYWORDS PER POST');
  console.log('─'.repeat(70));
  for (const post of report.posts) {
    console.log(`\n  ${post.title}`);
    console.log(`  └─ ${post.keywords.join(', ') || '(no keywords matched)'}`);
  }

  // Most used keywords
  const sortedUsage = Object.entries(globalKeywordUsage).sort((a, b) => b[1] - a[1]);
  console.log('\n' + '─'.repeat(70));
  console.log('MOST USED KEYWORDS (across all posts)');
  console.log('─'.repeat(70));
  for (const [kw, count] of sortedUsage.slice(0, 20)) {
    const bar = '█'.repeat(count);
    console.log(`  ${bar} ${kw} (${count} posts)`);
  }

  // Content gaps: keywords in taxonomy that no post targets
  const allTaxonomyKeywords = [];
  for (const cluster of Object.values(taxonomy.clusters)) {
    for (const kw of cluster.keywords) {
      allTaxonomyKeywords.push({ keyword: kw, cluster: cluster.label });
    }
  }

  const unusedKeywords = allTaxonomyKeywords.filter(
    entry => !globalKeywordUsage[entry.keyword]
  );

  if (unusedKeywords.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('CONTENT GAPS (taxonomy keywords with no posts targeting them)');
    console.log('─'.repeat(70));

    const gapsByCluster = {};
    for (const entry of unusedKeywords) {
      if (!gapsByCluster[entry.cluster]) gapsByCluster[entry.cluster] = [];
      gapsByCluster[entry.cluster].push(entry.keyword);
    }

    for (const [cluster, keywords] of Object.entries(gapsByCluster)) {
      console.log(`\n  ${cluster}:`);
      for (const kw of keywords) {
        console.log(`    • ${kw}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Done! Keywords written to front matter of all posts.');
  console.log('='.repeat(70) + '\n');
}

processPosts();
