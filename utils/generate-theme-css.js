/**
 * Generates themes.css with CSS custom property definitions for all color themes.
 * Usage: node utils/generate-theme-css.js
 */
const stylus = require('stylus');
const fs = require('fs');
const path = require('path');

const colorsDir = path.join(__dirname, '..', 'themes', 'cactus', 'source', 'css', '_colors');
const outputFile = path.join(__dirname, '..', 'themes', 'cactus', 'source', 'css', 'themes.css');

const themeFiles = fs.readdirSync(colorsDir).filter(f => f.endsWith('.styl'));

const baseVars = [
  'color-background', 'color-footer-mobile-1', 'color-footer-mobile-2',
  'color-background-code', 'color-border', 'color-scrollbar', 'color-meta',
  'color-meta-code', 'color-link', 'color-text', 'color-accent-1',
  'color-accent-2', 'color-accent-3', 'color-quote'
];

const derivedVars = [
  { name: 'color-scrollbar-hover', expr: 'darken($color-scrollbar, 20%)' },
  { name: 'color-scrollbar-active', expr: 'darken($color-scrollbar, 30%)' },
  { name: 'color-meta-light', expr: 'lighten($color-meta, 20%)' },
  { name: 'color-meta-dark', expr: 'darken($color-meta, 20%)' },
  { name: 'color-meta-code-light', expr: 'lighten($color-meta-code, 20%)' },
  { name: 'color-link-dark', expr: 'darken($color-link, 10%)' },
  { name: 'color-link-light', expr: 'lighten($color-link, 5%)' },
  { name: 'color-background-light', expr: 'lighten($color-background, 8%)' },
];

function processTheme(themeFile) {
  return new Promise((resolve, reject) => {
    const themeName = path.basename(themeFile, '.styl');
    const themeContent = fs.readFileSync(path.join(colorsDir, themeFile), 'utf8');

    // Remove $highlight line and hexo-config references
    const cleanedLines = themeContent.split('\n')
      .filter(line => !line.includes('$highlight'))
      .map(line => line.replace(/hexo-config\([^)]+\)\s*\|\|\s*/g, ''))
      .filter(line => line.trim() !== '');

    let stylusCode = cleanedLines.join('\n') + '\n\n';

    const allVars = [
      ...baseVars.map(name => ({ name, expr: '$' + name })),
      ...derivedVars,
    ];

    // Output each variable as a CSS property so we can extract computed values
    for (const v of allVars) {
      stylusCode += `.v-${v.name}\n  color ${v.expr}\n`;
    }

    stylus(stylusCode).render((err, result) => {
      if (err) {
        reject(new Error(`Error processing ${themeName}: ${err.message}`));
        return;
      }

      const values = {};
      for (const v of allVars) {
        const regex = new RegExp(`\\.v-${v.name}\\s*\\{[^}]*color:\\s*(.+?)\\s*;`, 's');
        const match = result.match(regex);
        if (match) {
          values[v.name] = match[1].trim();
        }
      }

      resolve({ name: themeName, values });
    });
  });
}

async function main() {
  console.log('Generating theme CSS...\n');

  const results = [];
  for (const themeFile of themeFiles) {
    try {
      const result = await processTheme(themeFile);
      results.push(result);
      console.log(`  \u2713 ${result.name} (${Object.keys(result.values).length} properties)`);
    } catch (err) {
      console.error(`  \u2717 ${err.message}`);
    }
  }

  let css = '/* Auto-generated theme definitions \u2014 do not edit manually */\n';
  css += '/* Regenerate with: node utils/generate-theme-css.js */\n\n';

  for (const theme of results) {
    css += `[data-theme="${theme.name}"] {\n`;
    for (const [key, value] of Object.entries(theme.values)) {
      css += `  --${key}: ${value};\n`;
    }
    css += '}\n\n';

    // Swatch preview colors for theme switcher UI
    const bg = theme.values['color-background'] || '#000';
    const accent = theme.values['color-accent-1'] || '#fff';
    css += `.theme-switcher__swatch[data-theme="${theme.name}"] {\n`;
    css += `  background: ${bg};\n`;
    css += `  box-shadow: inset 0 0 0 2.5px ${accent};\n`;
    css += '}\n\n';
  }

  fs.writeFileSync(outputFile, css);
  console.log(`\nGenerated ${outputFile}`);
  console.log(`  ${results.length} themes, ${Object.keys(results[0]?.values || {}).length} properties each`);
}

main().catch(console.error);
