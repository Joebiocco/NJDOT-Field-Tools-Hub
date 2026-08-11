/*
 * Zero-dependency static-correctness checks for the Field Tools Hub site.
 * No DOM parser, no npm package — matches the style of the other tools/*.js
 * regression scripts (fs/path/vm only).
 *
 * Checks:
 *   1. Every standalone .js file under js/ and tools/ parses (node --check).
 *   2. Every inline <script> block in each tracked HTML page compiles on
 *      its own (vm.Script per block, not concatenated — concatenating can
 *      produce false-positive redeclaration errors that don't reflect real
 *      browser behavior, since each <script> tag is its own top-level scope
 *      for `var`/function declarations but real duplicate top-level `const`/
 *      `let` across script tags is still a real error browsers throw too).
 *   3. Every data/**\/*.json and manifest.json file parses as JSON.
 *   4. No duplicate `id="..."` attribute within a single HTML file.
 *   5. Every local (relative, non-http(s)/data:) asset referenced via
 *      src=/href= in a tracked HTML or CSS file exists on disk.
 *
 * Run from the repository root:
 *   node tools/verify-static.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, filterExt, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '__pycache__' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, filterExt, out);
    } else if (filterExt.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function checkJsSyntax(errors) {
  const jsFiles = [
    ...walk(path.join(ROOT, 'js'), /\.js$/),
    ...walk(path.join(ROOT, 'tools'), /\.js$/)
  ];
  for (const file of jsFiles) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (e) {
      errors.push(`JS syntax error in ${rel(file)}:\n${(e.stderr || e.message).toString().trim()}`);
    }
  }
  return jsFiles.length;
}

function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue; // external script, nothing to compile
    if (/type\s*=\s*["'](?!text\/javascript|module)[^"']*["']/i.test(attrs)) continue; // e.g. application/json
    scripts.push(match[2]);
  }
  return scripts;
}

function checkInlineScripts(htmlFiles, errors) {
  let total = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = extractInlineScripts(html);
    scripts.forEach((code, i) => {
      if (!code.trim()) return;
      total++;
      try {
        new vm.Script(code, { filename: `${rel(file)}#inline-script-${i + 1}` });
      } catch (e) {
        errors.push(`Inline <script> syntax error in ${rel(file)} (block ${i + 1}): ${e.message}`);
      }
    });
  }
  return total;
}

function checkJsonFiles(errors) {
  const jsonFiles = [
    ...walk(path.join(ROOT, 'data'), /\.json$/),
    path.join(ROOT, 'manifest.json')
  ].filter((f) => fs.existsSync(f));
  for (const file of jsonFiles) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    } catch (e) {
      errors.push(`JSON parse error in ${rel(file)}: ${e.message}`);
    }
  }
  return jsonFiles.length;
}

function stripScriptsAndComments(html) {
  // Duplicate-id detection only matters for markup actually parsed into the
  // DOM. Script bodies routinely contain id="..." inside JS string/template
  // literals that build replacement innerHTML for a single existing element
  // (e.g. re-rendering a button's label) — that is not a second live element
  // and must not be flagged.
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function checkDuplicateIds(htmlFiles, errors) {
  for (const file of htmlFiles) {
    const markup = stripScriptsAndComments(fs.readFileSync(file, 'utf8'));
    const seen = new Map();
    const re = /\bid\s*=\s*["']([^"']+)["']/g;
    let match;
    while ((match = re.exec(markup))) {
      const id = match[1];
      seen.set(id, (seen.get(id) || 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) errors.push(`Duplicate id="${id}" (${count}x) in ${rel(file)}`);
    }
  }
}

function checkLocalAssets(htmlFiles, cssFiles, errors) {
  let total = 0;
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
  const cssUrlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

  function isSkippable(url) {
    return !url || /^(https?:)?\/\//i.test(url) || /^(data|mailto|tel|javascript|#):/i.test(url) || url.startsWith('#');
  }

  function resolveAndCheck(baseFile, url) {
    if (isSkippable(url)) return;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) return;
    total++;
    const resolved = path.resolve(path.dirname(baseFile), clean);
    if (!fs.existsSync(resolved)) {
      errors.push(`Missing local asset ${url} referenced from ${rel(baseFile)}`);
    }
  }

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    let match;
    attrRe.lastIndex = 0;
    while ((match = attrRe.exec(html))) resolveAndCheck(file, match[1]);
  }
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, 'utf8');
    let match;
    cssUrlRe.lastIndex = 0;
    while ((match = cssUrlRe.exec(css))) resolveAndCheck(file, match[1]);
  }
  return total;
}

function main() {
  const errors = [];
  const htmlFiles = [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'offline.html'),
    ...walk(path.join(ROOT, 'pages'), /\.html$/)
  ].filter((f) => fs.existsSync(f));
  const cssFiles = walk(path.join(ROOT, 'css'), /\.css$/);

  const jsCount = checkJsSyntax(errors);
  const inlineCount = checkInlineScripts(htmlFiles, errors);
  const jsonCount = checkJsonFiles(errors);
  checkDuplicateIds(htmlFiles, errors);
  const assetCount = checkLocalAssets(htmlFiles, cssFiles, errors);

  console.log('Static verification');
  console.log(`HTML pages checked: ${htmlFiles.length}`);
  console.log(`Standalone JS files checked: ${jsCount}`);
  console.log(`Inline <script> blocks checked: ${inlineCount}`);
  console.log(`JSON files checked: ${jsonCount}`);
  console.log(`Local asset references checked: ${assetCount}`);

  if (errors.length) {
    console.error(`\nFailed with ${errors.length} error(s):`);
    errors.forEach((msg) => console.error(`- ${msg}`));
    process.exitCode = 1;
    return;
  }
  console.log('\nAll static checks passed.');
}

main();
