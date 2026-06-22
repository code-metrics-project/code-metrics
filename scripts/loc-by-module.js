#!/usr/bin/env node
/**
 * Reports lines of code (LOC) and non-comment LOC (NCLOC) per module,
 * broken down by source file type.
 *
 * Usage:
 *   node scripts/loc-by-module.js [OPTIONS] [module ...]
 *
 * Options:
 *   --csv <file>   Write results to a CSV file
 *   --list         List discovered modules and exit
 *   --help, -h     Show this help message
 *
 * Examples:
 *   node scripts/loc-by-module.js
 *   node scripts/loc-by-module.js --csv metrics.csv
 *   node scripts/loc-by-module.js backend ui
 *   node scripts/loc-by-module.js --csv metrics.csv backend ui
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = path.dirname(path.resolve(process.argv[1]));
const ROOT_DIR = path.dirname(SCRIPT_DIR);

const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'dist-build', 'dist-dev',
  '.venv', '__pycache__', '.git', '.cache',
]);
const EXCLUDE_DIR_PATTERNS = [/^coverage/];

// Multiple extensions can share a label (e.g. .js and .mjs both → 'JavaScript')
const FILE_TYPES = {
  '.ts':    { label: 'TypeScript',  comment: 'c'      },
  '.tsx':   { label: 'TSX',         comment: 'c'      },
  '.js':    { label: 'JavaScript',  comment: 'c'      },
  '.mjs':   { label: 'JavaScript',  comment: 'c'      },
  '.cjs':   { label: 'JavaScript',  comment: 'c'      },
  '.vue':   { label: 'Vue',         comment: 'c'      },
  '.astro': { label: 'Astro',       comment: 'c'      },
  '.css':   { label: 'CSS',         comment: 'css'    },
  '.scss':  { label: 'CSS',         comment: 'css'    },
  '.sass':  { label: 'CSS',         comment: 'css'    },
  '.py':    { label: 'Python',      comment: 'python' },
  '.go':    { label: 'Go',          comment: 'c'      },
  '.sh':    { label: 'Shell',       comment: 'shell'  },
};

const LANGUAGE_ORDER = [
  'TypeScript', 'TSX', 'JavaScript', 'Vue', 'Astro', 'CSS', 'Python', 'Go', 'Shell',
];

const MODULE_MARKERS = ['package.json', 'pyproject.toml', 'go.mod'];

//######################################
// File helpers
//######################################

/**
 * Returns the logical extension for a file path, handling compound suffixes
 * like .d.ts and .min.js. Returns null for generated/minified files to skip.
 * @param {string} filePath
 * @returns {string|null}
 */
function getEffectiveExtension(filePath) {
  const base = path.basename(filePath);
  if (base.endsWith('.d.ts')) return null;
  if (base.endsWith('.min.js') || base.endsWith('.min.css')) return null;
  return path.extname(base);
}

//######################################
// Line counting
//######################################

/**
 * Counts physical lines (LOC) and non-comment, non-blank lines (NCLOC).
 *
 * Comment styles:
 *   c      – // line comments and /* block comments (TS, JS, Go, Vue, Astro)
 *   css    – /* block comments only
 *   python – # line comments and triple-quote docstrings
 *   shell  – # line comments
 *
 * A line is counted as NCLOC only when it contains at least some code — blank
 * lines and comment-only lines are excluded. Lines with trailing inline
 * comments are still counted as code.
 *
 * @param {string} content
 * @param {'c'|'css'|'python'|'shell'} style
 * @returns {{ loc: number, ncloc: number }}
 */
function countLines(content, style) {
  const lines = content.split('\n');
  // A trailing newline produces an empty final element — don't count it.
  const loc = content.endsWith('\n') ? lines.length - 1 : lines.length;

  let ncloc = 0;
  let inBlock = false;      // inside /* … */ block
  let inTriple = false;     // inside Python """ or ''' block
  let tripleChar = '"';     // which triple-quote character opened the block

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;

    if (style === 'shell') {
      if (!line.startsWith('#')) ncloc++;
      continue;
    }

    if (style === 'python') {
      if (inTriple) {
        if (line.includes(tripleChar.repeat(3))) inTriple = false;
        continue; // still inside (or just closed) a docstring — not code
      }
      if (line.startsWith('#')) continue;
      if (line.startsWith('"""') || line.startsWith("'''")) {
        tripleChar = line.startsWith('"""') ? '"' : "'";
        const rest = line.slice(3);
        if (!rest.includes(tripleChar.repeat(3))) inTriple = true;
        // Comment-only line whether it closes on the same line or not
        continue;
      }
      ncloc++;
      continue;
    }

    // C-style and CSS ─────────────────────────────────────────────────────────

    if (inBlock) {
      const closeAt = line.indexOf('*/');
      if (closeAt >= 0) {
        inBlock = false;
        // Code after */ on the same line → count as code
        const after = line.slice(closeAt + 2).trim();
        if (after && !after.startsWith('//')) ncloc++;
      }
      continue;
    }

    if (style === 'css') {
      if (line.startsWith('/*')) {
        const closeAt = line.indexOf('*/', 2);
        if (closeAt < 0) {
          inBlock = true;
        } else if (line.slice(closeAt + 2).trim()) {
          ncloc++; // code follows the closing */
        }
        continue;
      }
      ncloc++;
      continue;
    }

    // c style
    if (line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      const closeAt = line.indexOf('*/', 2);
      if (closeAt < 0) {
        inBlock = true;
      } else {
        const after = line.slice(closeAt + 2).trim();
        if (after && !after.startsWith('//')) ncloc++;
      }
      continue;
    }
    ncloc++;
  }

  return { loc, ncloc };
}

//######################################
// Module discovery
//######################################

/**
 * Discovers code modules by looking for package.json, pyproject.toml, or
 * go.mod at depth 1 and depth 2 (e.g. tools/mergecoverage).
 * @returns {Array<{name: string, path: string}>}
 */
function discoverModules() {
  const modules = [];
  let rootEntries;
  try {
    rootEntries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading root directory: ${err.message}`);
    process.exit(1);
  }

  for (const entry of rootEntries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (EXCLUDE_DIRS.has(entry.name)) continue;

    const dirPath = path.join(ROOT_DIR, entry.name);
    if (MODULE_MARKERS.some(m => fs.existsSync(path.join(dirPath, m)))) {
      modules.push({ name: entry.name, path: dirPath });
      continue;
    }

    // Look one level deeper (e.g. tools/mergecoverage, tools/userconfig)
    let subEntries;
    try {
      subEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const sub of subEntries) {
      if (!sub.isDirectory() || sub.name.startsWith('.')) continue;
      if (EXCLUDE_DIRS.has(sub.name)) continue;
      const subPath = path.join(dirPath, sub.name);
      if (MODULE_MARKERS.some(m => fs.existsSync(path.join(subPath, m)))) {
        modules.push({ name: `${entry.name}/${sub.name}`, path: subPath });
      }
    }
  }

  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

//######################################
// Module scanning
//######################################

/**
 * Recursively scans a module directory and returns LOC/NCLOC per language.
 * @param {string} modulePath
 * @returns {Object.<string, {loc: number, ncloc: number}>}
 */
function scanModule(modulePath) {
  const stats = {};

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        if (EXCLUDE_DIR_PATTERNS.some(p => p.test(entry.name))) continue;
        walk(fullPath);
        continue;
      }

      const ext = getEffectiveExtension(fullPath);
      if (!ext) continue;
      const fileType = FILE_TYPES[ext];
      if (!fileType) continue;

      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      const { loc, ncloc } = countLines(content, fileType.comment);
      const { label } = fileType;
      if (!stats[label]) stats[label] = { loc: 0, ncloc: 0 };
      stats[label].loc += loc;
      stats[label].ncloc += ncloc;
    }
  }

  walk(modulePath);
  return stats;
}

//######################################
// Output formatting
//######################################

function fmt(n) {
  return n.toLocaleString('en-US');
}

/**
 * Prints a formatted table of LOC/NCLOC per module and language.
 * Language columns show NCLOC.
 * @param {Array<{name: string, stats: Object, totalLoc: number, totalNcloc: number}>} results
 * @param {string[]} languages
 */
function printTable(results, languages) {
  const grandLoc = results.reduce((s, r) => s + r.totalLoc, 0);
  const grandNcloc = results.reduce((s, r) => s + r.totalNcloc, 0);

  // Column widths
  const nameW = Math.max(
    'Module'.length,
    'TOTAL'.length,
    ...results.map(r => r.name.length),
  );
  const locW = Math.max(
    'LOC'.length,
    ...results.map(r => fmt(r.totalLoc).length),
    fmt(grandLoc).length,
  );
  const nclocW = Math.max(
    'NCLOC'.length,
    ...results.map(r => fmt(r.totalNcloc).length),
    fmt(grandNcloc).length,
  );
  const langW = languages.map(lang => {
    const langTotal = results.reduce(
      (s, r) => s + (r.stats[lang]?.ncloc ?? 0), 0,
    );
    return Math.max(
      lang.length,
      ...results.map(r => (r.stats[lang] ? fmt(r.stats[lang].ncloc).length : 1)),
      fmt(langTotal).length,
    );
  });

  const totalCols = nameW + 2 + locW + 2 + nclocW
    + languages.reduce((s, _, i) => s + 2 + langW[i], 0);
  const divider = '─'.repeat(totalCols);

  function row(name, loc, ncloc, langValues) {
    let line = name.padEnd(nameW)
      + '  ' + fmt(loc).padStart(locW)
      + '  ' + fmt(ncloc).padStart(nclocW);
    languages.forEach((lang, i) => {
      const v = langValues[lang];
      line += '  ' + (v > 0 ? fmt(v) : '-').padStart(langW[i]);
    });
    return line;
  }

  // Header
  let header = 'Module'.padEnd(nameW)
    + '  ' + 'LOC'.padStart(locW)
    + '  ' + 'NCLOC'.padStart(nclocW);
  languages.forEach((lang, i) => {
    header += '  ' + lang.padStart(langW[i]);
  });

  console.log('');
  console.log('Lines of Code by Module');
  console.log('═'.repeat(totalCols));
  console.log(header);
  console.log(divider);

  for (const r of results) {
    const langValues = {};
    for (const lang of languages) {
      langValues[lang] = r.stats[lang]?.ncloc ?? 0;
    }
    console.log(row(r.name, r.totalLoc, r.totalNcloc, langValues));
  }

  console.log(divider);

  const totalLangValues = {};
  for (const lang of languages) {
    totalLangValues[lang] = results.reduce(
      (s, r) => s + (r.stats[lang]?.ncloc ?? 0), 0,
    );
  }
  console.log(row('TOTAL', grandLoc, grandNcloc, totalLangValues));
  console.log('');
  console.log('Note: language columns show NCLOC (non-comment, non-blank lines).');
  console.log('');
}

/**
 * Writes per-module, per-language LOC and NCLOC to a CSV file.
 * Each module gets a summary row followed by one row per language.
 * @param {string} filePath
 * @param {Array<{name: string, stats: Object, totalLoc: number, totalNcloc: number}>} results
 * @param {string[]} languages
 */
function writeCsv(filePath, results, languages) {
  const rows = ['module,language,loc,ncloc'];

  for (const r of results) {
    rows.push(`${r.name},ALL,${r.totalLoc},${r.totalNcloc}`);
    for (const lang of languages) {
      if (r.stats[lang]) {
        const { loc, ncloc } = r.stats[lang];
        rows.push(`${r.name},${lang},${loc},${ncloc}`);
      }
    }
  }

  const grandLoc = results.reduce((s, r) => s + r.totalLoc, 0);
  const grandNcloc = results.reduce((s, r) => s + r.totalNcloc, 0);
  rows.push(`TOTAL,ALL,${grandLoc},${grandNcloc}`);
  for (const lang of languages) {
    const loc = results.reduce((s, r) => s + (r.stats[lang]?.loc ?? 0), 0);
    const ncloc = results.reduce((s, r) => s + (r.stats[lang]?.ncloc ?? 0), 0);
    if (loc > 0) rows.push(`TOTAL,${lang},${loc},${ncloc}`);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(resolved, rows.join('\n') + '\n', 'utf8');
  console.log(`CSV written to: ${resolved}`);
}

//######################################
// CLI entry point
//######################################

function printHelp() {
  console.log(`
Usage: node scripts/loc-by-module.js [OPTIONS] [module ...]

Counts lines of code (LOC) and non-comment LOC (NCLOC) per module,
with a breakdown by source file type.

Options:
  --csv <file>   Write results to a CSV file
  --list         List discovered modules and exit
  --help, -h     Show this help message

Arguments:
  module ...     Restrict output to specific modules (e.g. backend frontend)

Examples:
  node scripts/loc-by-module.js
  node scripts/loc-by-module.js --csv metrics.csv
  node scripts/loc-by-module.js --csv out.csv backend ui
`);
}

function main() {
  const args = process.argv.slice(2);
  let csvPath = null;
  let listOnly = false;
  const moduleFilter = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    } else if (args[i] === '--list') {
      listOnly = true;
    } else if (args[i] === '--csv') {
      csvPath = args[++i];
      if (!csvPath) {
        process.stderr.write('Error: --csv requires a file path\n');
        process.exit(1);
      }
    } else {
      moduleFilter.push(args[i]);
    }
  }

  let modules = discoverModules();

  if (listOnly) {
    console.log('Discovered modules:');
    for (const m of modules) console.log(`  ${m.name}`);
    process.exit(0);
  }

  if (moduleFilter.length > 0) {
    modules = modules.filter(m => moduleFilter.includes(m.name));
    if (modules.length === 0) {
      process.stderr.write(
        `No modules matched: ${moduleFilter.join(', ')}\n`
        + `Run with --list to see available modules.\n`,
      );
      process.exit(1);
    }
  }

  const results = modules.map(mod => {
    const stats = scanModule(mod.path);
    const totalLoc = Object.values(stats).reduce((s, v) => s + v.loc, 0);
    const totalNcloc = Object.values(stats).reduce((s, v) => s + v.ncloc, 0);
    return { name: mod.name, stats, totalLoc, totalNcloc };
  });

  // Only show language columns that have at least one NCLOC line somewhere
  const activeLangs = LANGUAGE_ORDER.filter(lang =>
    results.some(r => (r.stats[lang]?.ncloc ?? 0) > 0),
  );

  printTable(results, activeLangs);

  if (csvPath) writeCsv(csvPath, results, activeLangs);
}

main();
