#!/usr/bin/env node
// build-csp-hash.js
// Minifies inline <script> blocks in HTML files and recomputes the CSP SHA256 hashes.
// Usage: node build-csp-hash.js <directory>
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sha256Base64(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("base64");
}

function minifyScript(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\];,:?])\s*/g, "$1")
    .replace(/\s*([=!<>+\-*/%&|]+)\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function processHtmlFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let html = original;
  const newHashTokens = [];

  // Match every <script ...>...</script> pair; skip ones with a src= attribute.
  html = html.replace(
    /(<script(\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,
    (match, openTag, _attrs, content, closeTag) => {
      if (/\bsrc\s*=/i.test(openTag)) return match; // external script <-€<- skip
      if (!content.trim()) return match;             // empty script <-€<- skip

      const minified = minifyScript(content.trim());
      newHashTokens.push(`'sha256-${sha256Base64(minified)}'`);
      return openTag + minified + closeTag;
    }
  );

  if (newHashTokens.length === 0) return; // no inline scripts in this file

  // Update the Content-Security-Policy meta tag:
  // Remove all existing 'sha256-...' tokens then insert the freshly computed ones
  // right after the script-src (or script-src-elem / script-src-attr) keyword.
  html = html.replace(
    /(<meta\b[^>]*\bhttp-equiv=["']Content-Security-Policy["'][^>]*\bcontent=)(["'])((?:(?!\2).)+)\2/i,
    (match, prefix, quote, cspValue) => {
      // Strip old hash tokens
      let updated = cspValue.replace(/'sha256-[A-Za-z0-9+/=]+'\s*/g, "");
      // Normalise extra whitespace introduced by stripping
      updated = updated.replace(/\s{2,}/g, " ").trim();
      // Insert new hash tokens after the script-src directive keyword
      updated = updated.replace(
        /(script-src(?:-elem|-attr)?)(\s)/,
        `$1$2${newHashTokens.join(" ")} `
      );
      return `${prefix}${quote}${updated}${quote}`;
    }
  );

  if (html === original) return; // nothing changed <-€<- skip the write
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`  ${filePath} <-<-<- ${newHashTokens.join(", ")}`);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".html")) {
      processHtmlFile(full);
    }
  }
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node build-csp-hash.js <directory>");
  process.exit(1);
}

walk(path.resolve(target));
