// Turns the `share` build into a page for claude.ai Artifacts, which supplies its own
// <html>, <head> and <body> wrapper. Writes share/nutrichef-ai.html.
import { readFileSync, writeFileSync } from 'node:fs';

const built = readFileSync('share/index.html', 'utf8');
const script = built.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
const style = built.match(/<link rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"/)[1];
const fonts = built.match(/<link\s+rel="stylesheet"\s+href="(https:\/\/fonts[^"]+)"/)[1];
const themeScript = built.match(/<script>[\s\S]*?<\/script>/)[0];

const page = `<title>NutriChef AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${fonts.replace(/&amp;/g, '&').replace(/&/g, '&amp;')}" />
<link rel="stylesheet" href="${style}" />
${themeScript}
<div id="root"></div>
<script type="module" src="${script}"></script>
`;

writeFileSync('share/nutrichef-ai.html', page);
console.log('Wrote share/nutrichef-ai.html using', script, style);
