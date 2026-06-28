import fs from 'node:fs';
import path from 'node:path';

const profile = process.env.EAS_BUILD_PROFILE;
if (profile !== 'local-standalone') {
  process.exit(0);
}

const buildGradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (!fs.existsSync(buildGradlePath)) {
  console.warn('[patch-standalone-debug-bundle] android/app/build.gradle not found; skipping');
  process.exit(0);
}

let contents = fs.readFileSync(buildGradlePath, 'utf8');
if (contents.includes('debuggableVariants = []')) {
  console.log('[patch-standalone-debug-bundle] already patched');
  process.exit(0);
}

const reactBlockMatch = contents.match(/^react\s*\{/m);
if (!reactBlockMatch) {
  console.warn('[patch-standalone-debug-bundle] react {} block not found; skipping');
  process.exit(0);
}

contents = contents.replace(
  /^react\s*\{/m,
  `react {
    // Embed JS in debug APK so RevenueCat Test Store keys work without Metro.
    debuggableVariants = []`,
);

fs.writeFileSync(buildGradlePath, contents);
console.log('[patch-standalone-debug-bundle] enabled embedded debug bundle');
