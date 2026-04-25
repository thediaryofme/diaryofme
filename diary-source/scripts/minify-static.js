#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const targetRoot = process.argv[2];

if (!targetRoot) {
  console.error("Usage: node scripts/minify-static.js <directory>");
  process.exit(1);
}

const root = path.resolve(targetRoot);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".svg", ".webmanifest"]);
const CUSTOM_PROPERTY_PATTERNS = [
  /var\(\s*(--[A-Za-z0-9_-]+)/g,
  /(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/gm,
  /["'](--[A-Za-z0-9_-]+)["']/g,
];
const NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let index = 0;

  while (true) {
    index = haystack.indexOf(needle, index);
    if (index === -1) {
      return count;
    }

    count += 1;
    index += needle.length;
  }
}

function encodeName(index) {
  let value = index;
  let output = "";

  do {
    output = NAME_ALPHABET[value % NAME_ALPHABET.length] + output;
    value = Math.floor(value / NAME_ALPHABET.length) - 1;
  } while (value >= 0);

  return `--${output}`;
}

function buildVariableMap(files) {
  const frequency = new Map();
  const originals = new Set();

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of CUSTOM_PROPERTY_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const token = match[1] || match[2];
        if (!token) {
          continue;
        }

        originals.add(token);
        frequency.set(token, (frequency.get(token) || 0) + 1);
      }
    }
  }

  const sorted = [...frequency.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      if (b[0].length !== a[0].length) {
        return b[0].length - a[0].length;
      }

      return a[0].localeCompare(b[0]);
    });

  const mapping = new Map();
  let index = 0;

  for (const [name] of sorted) {
    let candidate = encodeName(index);
    while (originals.has(candidate) || mapping.has(candidate)) {
      index += 1;
      candidate = encodeName(index);
    }

    index += 1;

    if (candidate.length >= name.length) {
      continue;
    }

    mapping.set(name, candidate);
  }

  return mapping;
}

function replaceVariables(text, mapping) {
  let next = text;

  for (const [from, to] of mapping) {
    next = next.split(from).join(to);
  }

  return next;
}

function minifyCss(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>~])\s*/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/;}/g, "}")
    .replace(/(^|[(:,\s])0(?:px|rem|em|vh|vw|vmin|vmax|%|ch|ex|cm|mm|in|pt|pc)/g, "$10")
    .replace(/(:|\s)0+\.(\d+)/g, "$1.$2")
    .trim();
}

function minifyHtml(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

function minifySvg(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

function minifyManifest(text) {
  return JSON.stringify(JSON.parse(text));
}

function writeIfChanged(filePath, nextText) {
  const current = fs.readFileSync(filePath, "utf8");
  if (current === nextText) {
    return false;
  }

  fs.writeFileSync(filePath, nextText, "utf8");
  return true;
}

const files = walk(root);
const variableMap = buildVariableMap(files);

for (const file of files) {
  let next = replaceVariables(fs.readFileSync(file, "utf8"), variableMap);
  const ext = path.extname(file);

  if (ext === ".css") {
    next = minifyCss(next);
  } else if (ext === ".html") {
    next = minifyHtml(next);
  } else if (ext === ".svg") {
    next = minifySvg(next);
  } else if (ext === ".webmanifest") {
    next = minifyManifest(next);
  }

  writeIfChanged(file, next);
}

if (variableMap.size > 0) {
  console.log(`Minified ${files.length} text assets and rewrote ${variableMap.size} custom properties.`);
} else {
  console.log(`Minified ${files.length} text assets.`);
}
