const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'lib',
  'module',
  'common',
  'types.js'
);

const content = `'use strict';\n\nexport * from './types/index';\n`;

try {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    process.exit(0);
  }

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, content, 'utf8');
    console.log('[fix-reanimated-shim] Created', target);
  } else {
    console.log('[fix-reanimated-shim] Shim already exists');
  }
} catch (error) {
  console.warn('[fix-reanimated-shim] Skipped:', error.message);
}
