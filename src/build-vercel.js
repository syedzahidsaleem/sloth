import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const vercelOutputDir = path.join(root, '.vercel', 'output');
const vercelStaticDir = path.join(vercelOutputDir, 'static');

console.log('[sloth-deploy] Validating build artifacts in:', distDir);

if (!fs.existsSync(distDir)) {
  console.error('[sloth-deploy] ERROR: dist directory was not created!');
  process.exit(1);
}

const distEntries = fs.readdirSync(distDir);
console.log(`[sloth-deploy] dist contains ${distEntries.length} items:`, distEntries);

// Mirror dist into .vercel/output for Build Output API v3
try {
  fs.mkdirSync(vercelStaticDir, { recursive: true });
  fs.cpSync(distDir, vercelStaticDir, { recursive: true });

  const vercelConfig = {
    version: 3,
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  };

  fs.writeFileSync(
    path.join(vercelOutputDir, 'config.json'),
    JSON.stringify(vercelConfig, null, 2),
  );

  console.log('[sloth-deploy] Successfully synced dist to .vercel/output/static (Build Output API v3)');
} catch (err) {
  console.warn('[sloth-deploy] Warning during Build Output API sync:', err);
}
