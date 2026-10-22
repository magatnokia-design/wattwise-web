/**
 * Writes /about, /privacy and /terms as real HTML pages after `vite build`.
 *
 *   node scripts/prerender-documents.mjs   (run by `npm run build`)
 *
 * Why. This is a single-page app: every URL is served index.html with an empty
 * <div id="root">, and the text appears only after JavaScript runs. A crawler
 * that does not run it - Google's OAuth branding check read /privacy on 22 Oct
 * 2026 and reported "insufficient content" - sees a blank page. So each
 * document is written into its own dist/<name>/index.html with the text already
 * inside #root. Vercel serves a real file before applying the SPA rewrite, and
 * when the bundle loads, React's createRoot replaces this markup with the live
 * page - so nothing about the app changes for a visitor.
 *
 * The text comes from screens/Help/legalContent.js, the same data the app and
 * the phone render, so the static copy cannot drift from the real one.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// legalContent.js uses Vite-style extensionless imports, which Node's own
// loader rejects. Bundling it with esbuild (already installed as Vite's) makes
// one self-contained module, so this runs on whatever Node the Vercel build
// uses - the test suite's resolve hook needs Node 22.15+, and a build step that
// depends on that would fail the whole deploy on an older runtime.
const bundled = path.join(ROOT, 'node_modules', '.cache', 'legal-content.mjs');
await build({
  entryPoints: [path.join(ROOT, 'src/screens/Help/legalContent.js')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundled,
  logLevel: 'error',
});
const { ABOUT_SECTIONS, PRIVACY_SECTIONS, TERMS_SECTIONS } = await import(pathToFileURL(bundled).href);
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://www.dagitab.site';

const DOCUMENTS = [
  { slug: 'about', title: 'About Dagitab', sections: ABOUT_SECTIONS,
    description: 'What Dagitab is, what it does, and the limits it works within.' },
  { slug: 'privacy', title: 'Privacy Policy', sections: PRIVACY_SECTIONS,
    description: 'What Dagitab stores, why, where it lives, and how to delete it.' },
  { slug: 'terms', title: 'Terms & Conditions', sections: TERMS_SECTIONS,
    description: 'What you are agreeing to when you use Dagitab.' },
];

const escape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const renderDocument = ({ title, sections }) => [
  '<main style="max-width:820px;margin:0 auto;padding:32px 16px;font-family:system-ui,sans-serif;line-height:1.6;color:#071B2C">',
  `<p><a href="/">Dagitab</a></p>`,
  `<h1>${escape(title)}</h1>`,
  ...sections.map((section) => [
    `<section id="${escape(section.id)}">`,
    `<h2>${escape(section.title)}</h2>`,
    ...(section.body || []).map((p) => `<p>${escape(p)}</p>`),
    (section.bullets || []).length
      ? `<ul>${section.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>`
      : '',
    '</section>',
  ].join('')),
  '<p>Contact: <a href="mailto:support@dagitab.site">support@dagitab.site</a></p>',
  '</main>',
].join('\n');

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

if (!shell.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html has no empty <div id="root"></div> to fill - did the template change?');
}

for (const doc of DOCUMENTS) {
  const url = `${SITE}/${doc.slug}`;
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(doc.title)} — Dagitab</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escape(doc.description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escape(doc.title)} — Dagitab$2`)
    .replace('<div id="root"></div>', `<div id="root">${renderDocument(doc)}</div>`);

  const outDir = path.join(DIST, doc.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  const words = doc.sections
    .flatMap((s) => [...(s.body || []), ...(s.bullets || [])])
    .join(' ')
    .split(/\s+/).length;
  console.log(`dist/${doc.slug}/index.html  ${doc.sections.length} sections, ${words} words`);
}
