// scripts/copy-three.js — runs on `npm install`
// Copies the three.js UMD build into renderer/vendor so the overlay window
// can load it with a plain <script src="./vendor/three.min.js"> and never
// needs internet access (the overlay must work even with network off).
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.min.js');
const destDir = path.join(__dirname, '..', 'renderer', 'vendor');
const dest = path.join(destDir, 'three.min.js');

if (!fs.existsSync(src)) {
  console.warn('[zenski] Could not find three.min.js in node_modules — did npm install run correctly?');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[zenski] Copied three.min.js -> renderer/vendor/three.min.js');
