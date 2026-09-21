#!/usr/bin/env node

/**
 * Genera, para cada fichero .erd, los dos valores que hay que pegar en el
 * ejercicio correspondiente del campus virtual:
 *
 *   1. checker_parameter : el .erd codificado en base64, igual que hace
 *      encode-erd.js  ->  Buffer.from(encodeURIComponent(texto)).toString('base64')
 *
 *   2. MD5 : el hash que app.js envia al pulsar Enviar, calculado sobre
 *      el texto decodificado y recortado  ->  MD5(texto.trim())
 *
 * Uso:
 *   node tools/regen-campus.js erd                      tabla por pantalla
 *   node tools/regen-campus.js erd --csv > campus.csv   CSV para hoja de calculo
 *   node tools/regen-campus.js erd --md > campus.md     tabla markdown
 *   node tools/regen-campus.js erd --snippets salida    un .html por ejercicio
 *
 * El modo --snippets deja en la carpeta indicada un fichero por ejercicio
 * con el bloque completo listo para copiar y pegar en Moodle, con el
 * mismo nombre que el .erd. Es el modo mas comodo para ir uno a uno.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHECKER_JS = 'https://i3lab.unex.es/sql-snippets/erd-checker.js';

function findErdFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...findErdFiles(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.erd')) out.push(full);
    }
    return out.sort();
}

/** Igual que encode-erd.js */
function encodeErd(text) {
    return Buffer.from(encodeURIComponent(text)).toString('base64');
}

/** Igual que app.js: CryptoJS.MD5(expectedSolutionText.trim()) */
function md5OfSolution(text) {
    return crypto.createHash('md5').update(text.trim(), 'utf8').digest('hex');
}

/** Comprueba que el viaje a base64 y vuelta no altera el texto */
function roundTripOk(text, encoded) {
    const decoded = decodeURIComponent(Buffer.from(encoded, 'base64').toString('binary'));
    return decoded === text;
}

function snippetFor(base64) {
    return `<div>
<p>Enunciado del ejercicio:</p>
<iframe id="checker" src="" width="100%" height="800" hidden></iframe>
<script>const checker_parameter = "${base64}";</script>
<script src="${CHECKER_JS}"></script>
</div>
`;
}

// --- MAIN ---
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--') && !path.isAbsolute(a) || (a && !a.startsWith('--')));
const asCsv = args.includes('--csv');
const asMd = args.includes('--md');
const snippetsIdx = args.indexOf('--snippets');
const snippetsDir = snippetsIdx !== -1 ? args[snippetsIdx + 1] : null;

if (!dir || !fs.existsSync(dir)) {
    console.error('Uso: node tools/regen-campus.js <carpeta> [--csv] [--md] [--snippets <carpeta>]');
    process.exit(1);
}

const files = findErdFiles(dir);
const rows = [];
const problems = [];

for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const encoded = encodeErd(text);
    const md5 = md5OfSolution(text);
    const rel = path.relative(dir, file);

    if (!roundTripOk(text, encoded)) {
        problems.push(`${rel}: el texto no sobrevive al viaje a base64 y vuelta`);
    }
    if (!/\berdiagram\b/.test(text)) {
        problems.push(`${rel}: no parece un ERD, no contiene "erdiagram"`);
    }

    rows.push({ rel, chars: text.length, encoded, md5 });
}

if (snippetsDir) {
    fs.mkdirSync(snippetsDir, { recursive: true });
    for (const r of rows) {
        const out = path.join(snippetsDir, r.rel.replace(/[\\/]/g, ' - ').replace(/\.erd$/i, '') + '.html');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, `<!-- ${r.rel}\n     MD5 de la solucion esperada: ${r.md5} -->\n\n` + snippetFor(r.encoded), 'utf8');
    }
    console.error(`${rows.length} bloques escritos en ${snippetsDir}`);
}

if (asCsv) {
    console.log('fichero,caracteres,md5,base64');
    for (const r of rows) {
        console.log(`"${r.rel}",${r.chars},${r.md5},"${r.encoded}"`);
    }
} else if (asMd) {
    console.log('| Fichero | MD5 | base64 |');
    console.log('|---|---|---|');
    for (const r of rows) {
        console.log(`| ${r.rel} | \`${r.md5}\` | \`${r.encoded}\` |`);
    }
} else if (!snippetsDir) {
    for (const r of rows) {
        console.log('─'.repeat(70));
        console.log(r.rel + `  (${r.chars} caracteres)`);
        console.log('MD5:    ' + r.md5);
        console.log('base64: ' + r.encoded);
        console.log();
    }
}

if (problems.length > 0) {
    console.error('\nAVISOS:');
    for (const p of problems) console.error('  ' + p);
}

console.error(`\n${rows.length} ficheros procesados, ${problems.length} aviso(s).`);
