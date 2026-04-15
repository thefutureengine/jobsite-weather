const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

// Clean www
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

// Files to copy from root
const rootFiles = ['index.html', 'manifest.json', 'sw.js', 'privacy.html', 'sitemap.xml', 'netlify.toml'];
rootFiles.forEach(f => {
  const src = path.join(ROOT, f);
  if(fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(WWW, f));
    console.log(`✓ ${f}`);
  }
});

// Directories to copy
const dirs = ['icons', 'css', 'js'];
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(f => {
    const srcPath = path.join(src, f);
    const destPath = path.join(dest, f);
    if(fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ ${f}`);
    }
  });
}

dirs.forEach(d => {
  const src = path.join(ROOT, d);
  if(fs.existsSync(src)) {
    copyDir(src, path.join(WWW, d));
  }
});

console.log('www/ populated successfully');
