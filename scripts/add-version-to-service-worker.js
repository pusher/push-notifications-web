const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_JSON_PATH = '../package.json';
const SW_FILE_PATH = '../dist/service-worker.js';

// Get SDK version
const packageJSONFullPath = path.join(__dirname, PACKAGE_JSON_PATH);
let packageJSONContents = '';
try {
  packageJSONContents = fs.readFileSync(packageJSONFullPath, 'utf8');
} catch (e) {
  console.error('Could not read package.json', e.message);
  process.exit(1);
}

let packageJSON = {};
try {
  packageJSON = JSON.parse(packageJSONContents);
} catch (e) {
  console.error('Could not parse package.json', e.message);
  process.exit(1);
}

const version = packageJSON.version;
if (!version) {
  console.error('Version not set in package.json');
  process.exit(1);
}

// Get current git commit
const commitHash = childProcess
  .execSync('git rev-parse HEAD')
  .toString()
  .trim();

// Add version comment to generated Service Worker file
const versionComment = `// SDK version: v${version}\n// Git commit: ${commitHash}`;

const swFileFullPath = path.join(__dirname, SW_FILE_PATH);
let swContents = '';
try {
  swContents = fs.readFileSync(swFileFullPath, 'utf8');
} catch (e) {
  console.error('Could not read ../dist/service-worker.js:', e.message);
  process.exit(1);
}

const versionedSw = versionComment + '\n\n' + swContents;
try {
  fs.writeFileSync(swFileFullPath, versionedSw);
} catch (e) {
  console.error('Could not overwrite service worker:', e.message);
  process.exit(1);
}
