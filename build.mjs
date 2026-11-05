// Build: bundle src/main.tsx with esbuild and copy public/ into dist/.
//   API_URL   — backend base URL (default: production worker). Use "" for same-origin.
//   --watch   — rebuild on change
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const apiUrl = process.env.API_URL ?? 'https://balance-our-day-api.nattsummer-14.workers.dev';
const version = Date.now().toString(36);

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
cpSync('public', 'dist', { recursive: true });
// cache-bust the bundle and stylesheet
const html = readFileSync('public/index.html', 'utf8').replaceAll('__V__', version);
writeFileSync('dist/index.html', html);

const options = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/assets/app.js',
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  minify: !watch,
  sourcemap: true,
  define: {
    __API_URL__: JSON.stringify(apiUrl),
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
  },
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
