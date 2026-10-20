#!/usr/bin/env node
// Assembles the presentation from src/ into:
//   index.html         – self-contained (Three.js inlined), opens offline by double-click
//   dist/artifact.html – same page, Three.js from cdnjs, for publishing as a claude.ai artifact
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const spec = JSON.parse(read('src/spec.json'));
const css = read('src/styles.css');
const body = read('src/body.html');
const scripts = ['src/orbit.js', 'src/sim.js', 'src/device.js', 'src/blueprint.js', 'src/viewer.js', 'src/content.js', 'src/deck.js']
  .map((f) => '// ---- ' + f + ' ----\n' + read(f)).join('\n;\n');
const threeInline = read('assets/three.min.js');
if (threeInline.includes('</script')) throw new Error('three.min.js contains a closing script tag');
const threeCdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>';

const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">';

const head = '<title>' + spec.page_title + '</title>\n' +
  '<meta name="claude:viewport-fit-sides" content="cover">\n' + fonts + '\n<style>\n' + css + '\n</style>';

function page(three, standalone) {
  const tail = three + '\n<script>\nconst SPEC = ' + JSON.stringify(spec) + ';\n</script>\n<script>\n' + scripts + '\n</script>';
  if (!standalone) return head + '\n' + body + '\n' + tail + '\n';
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    head + '\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>\n' +
    '</head>\n<body>\n' + body + '\n' + tail + '\n</body>\n</html>\n';
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'index.html'), page('<script>\n' + threeInline + '\n</script>', true));
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), page(threeCdn, false));
const kb = (f) => Math.round(fs.statSync(path.join(root, f)).size / 1024) + ' KB';
console.log('index.html ' + kb('index.html') + ' | dist/artifact.html ' + kb('dist/artifact.html'));
