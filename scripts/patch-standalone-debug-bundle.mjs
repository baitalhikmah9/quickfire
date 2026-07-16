import fs from 'node:fs';
import path from 'node:path';

const profile = process.env.EAS_BUILD_PROFILE;
const buildGradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.warn('[patch-standalone-debug-bundle] android/app/build.gradle not found; skipping');
  process.exit(0);
}

let contents = fs.readFileSync(buildGradlePath, 'utf8');
let changed = false;

/**
 * Always force RevenueCat Test Store keys when embedding JS for Android *debug* variants.
 * createBundleDebugJsAndAssets uses --dev false (NODE_ENV=production), which would otherwise
 * bake production appl_/goog_ keys from .env.production.
 */
const REVENUECAT_DEBUG_MARKER = 'EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=1';
if (!contents.includes(REVENUECAT_DEBUG_MARKER)) {
  const revenueCatBlock = `
/**
 * Standalone debug APKs embed JS with --dev false (NODE_ENV=production), which would
 * otherwise bake production App Store / Play keys from .env.production.
 * Force RevenueCat Test Store public API key for debug bundles only.
 */
def revenueCatTestStoreApiKey = "test_hbpxoGCDXRBRDjhBSdRMowxgIVL"
tasks.withType(com.facebook.react.tasks.BundleHermesCTask).configureEach { task ->
    if (task.name.toLowerCase().contains("debug")) {
        def originalNodeArgs = task.nodeExecutableAndArgs.get()
        task.nodeExecutableAndArgs.set(
            [
                "env",
                "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=\${revenueCatTestStoreApiKey}",
                "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=\${revenueCatTestStoreApiKey}",
                "EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=1",
            ] + originalNodeArgs
        )
    }
}
`;

  // Prefer inserting after the react { } block closes, else append.
  const reactClose = contents.search(/^}\s*$/m);
  if (reactClose !== -1) {
    // First top-level closing brace after `react {` — fragile; append near end of file is safer.
    contents = contents.trimEnd() + '\n' + revenueCatBlock + '\n';
  } else {
    contents = contents.trimEnd() + '\n' + revenueCatBlock + '\n';
  }
  changed = true;
  console.log('[patch-standalone-debug-bundle] injected RevenueCat Test Store keys for debug bundles');
} else {
  console.log('[patch-standalone-debug-bundle] RevenueCat debug Test Store inject already present');
}

// Embed JS in debug APK (no Metro) for local-standalone only.
if (profile === 'local-standalone') {
  if (!contents.includes('debuggableVariants = []')) {
    const reactBlockMatch = contents.match(/^react\s*\{/m);
    if (!reactBlockMatch) {
      console.warn('[patch-standalone-debug-bundle] react {} block not found; skipping debuggableVariants patch');
    } else {
      contents = contents.replace(
        /^react\s*\{/m,
        `react {
    // Embed JS in debug APK so RevenueCat Test Store keys work without Metro.
    debuggableVariants = []`,
      );
      changed = true;
      console.log('[patch-standalone-debug-bundle] enabled embedded debug bundle');
    }
  } else {
    console.log('[patch-standalone-debug-bundle] debuggableVariants already patched');
  }
}

if (changed) {
  fs.writeFileSync(buildGradlePath, contents);
}

