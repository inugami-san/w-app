const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-router',
  'build',
  'routes-manifest.js'
);

const source = path.join(__dirname, 'routes-manifest-shim.js');

try {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir) || !fs.existsSync(source)) {
    console.log('[fix-expo-router-routes-manifest] Skipped: required files missing');
    process.exit(0);
  }

  fs.copyFileSync(source, target);
  console.log('[fix-expo-router-routes-manifest] Wrote', target);
} catch (error) {
  console.warn('[fix-expo-router-routes-manifest] Skipped:', error.message);
}
