#!/usr/bin/env node

/**
 * Genera los dos valores que hay que actualizar en cada ejercicio del
 * campus virtual a partir de los ficheros .erd:
 *
 *   1. checker_parameter : el .erd en base64, igual que encode-erd.js
 *         Buffer.from(encodeURIComponent(texto)).toString('base64')
 *
 *   2. Respuesta 1 (MD5) : el hash que app.js envia al pulsar Enviar
 *         MD5(texto.trim())
 *
 * Importante: en el campus, el contenido de la pagina incluye el enunciado
 * ademas del bloque del checker. Hay que sustituir SOLO la cadena entre
 * comillas de checker_parameter, nunca pegar el bloque completo, o se
 * perderia el enunciado.
 *
 * Uso:
 *   node tools/regen-campus.js erd --html campus.html    panel para trabajar
 *   node tools/regen-campus.js erd --csv > campus.csv     hoja de calculo
 *   node tools/regen-campus.js erd                        listado por pantalla
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function findErdFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...findErdFiles(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.erd')) out.push(full);
    }
    return out.sort();
}

function encodeErd(text) {
    return Buffer.from(encodeURIComponent(text)).toString('base64');
}

function md5OfSolution(text) {
    return crypto.createHash('md5').update(text.trim(), 'utf8').digest('hex');
}

function roundTripOk(text, encoded) {
    const decoded = decodeURIComponent(Buffer.from(encoded, 'base64').toString('binary'));
    return decoded === text;
}

/** Restos de la sintaxis anterior que no deberian quedar tras la migracion */
function legacyMarkers(text) {
    const found = [];
    if (/\/\/\s*UNIQUE\b/i.test(text)) found.push('//UNIQUE');
    if (/^\s*\/\/\s*(total|parcial)\b/im.test(text)) found.push('comentario de especializacion');
    if (/\bentity\s+Asoc_\w+/i.test(text) && !/associative\s+entity\s+Asoc_/i.test(text)) found.push('Asoc_ sin associative');
    const hierNames = [...text.matchAll(/\bhierarchy\s+(\w+)/g)].map(m => m[1]);
    const extendsTargets = [...text.matchAll(/\bextends\s+(\w+)/g)].map(m => m[1]);
    const huerfanos = extendsTargets.filter(t => !hierNames.includes(t));
    if (huerfanos.length > 0) found.push('extends sin jerarquia: ' + [...new Set(huerfanos)].join(', '));
    return found;
}

function modelName(text) {
    const m = text.match(/\berdiagram\s+(\w+)/);
    return m ? m[1] : '';
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(rows) {
    const data = JSON.stringify(rows);
    return `<!DOCTYPE html>
<meta charset="utf-8">
<title>Actualizar ejercicios del campus</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --line: #ddd;
    --card: #fafafa; --ok: #1a7f37; --warn: #9a6700; --accent: #0969da;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#151515; --fg:#e8e8e8; --muted:#999; --line:#333;
            --card:#1e1e1e; --ok:#3fb950; --warn:#d29922; --accent:#58a6ff; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; background:var(--bg); color:var(--fg);
         font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:var(--muted); margin-bottom:20px; }
  .bar { position:sticky; top:0; background:var(--bg); padding:12px 0;
         border-bottom:1px solid var(--line); margin-bottom:16px; z-index:10;
         display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  input[type=search] { flex:1; min-width:240px; padding:8px 12px; font-size:15px;
         border:1px solid var(--line); border-radius:6px; background:var(--card); color:var(--fg); }
  .count { color:var(--muted); font-variant-numeric:tabular-nums; }
  .item { border:1px solid var(--line); border-radius:8px; padding:14px 16px;
          margin-bottom:10px; background:var(--card); }
  .item.done { opacity:.45; }
  .head { display:flex; gap:10px; align-items:baseline; }
  .name { font-weight:600; flex:1; word-break:break-word; }
  .model { color:var(--muted); font-size:13px; }
  .row { display:flex; gap:10px; align-items:center; margin-top:10px; }
  .label { width:70px; color:var(--muted); font-size:13px; flex:none; }
  code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:13px;
         background:var(--bg); padding:4px 8px; border-radius:4px; border:1px solid var(--line);
         overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
  button { padding:5px 12px; font-size:13px; cursor:pointer; border:1px solid var(--line);
           border-radius:6px; background:var(--bg); color:var(--accent); flex:none; }
  button:hover { border-color:var(--accent); }
  button.copied { color:var(--ok); border-color:var(--ok); }
  .warn { color:var(--warn); font-size:13px; margin-top:10px; }
  label.check { display:flex; gap:6px; align-items:center; font-size:13px; color:var(--muted); flex:none; }
  .hidden { display:none; }
</style>

<h1>Actualizar los ejercicios del campus</h1>
<div class="sub">
  En cada ejercicio de Moodle: sustituye <strong>solo</strong> la cadena entre comillas de
  <code style="display:inline;flex:none">checker_parameter</code> por el base64, y el campo
  <strong>Respuesta 1</strong> por el MD5. No pegues el bloque completo: perderias el enunciado.
</div>

<div class="bar">
  <input type="search" id="q" placeholder="Filtrar por nombre de fichero o de modelo...">
  <span class="count" id="count"></span>
  <button id="reset">Reiniciar progreso</button>
</div>

<div id="list"></div>

<script>
const DATA = ${data};
const KEY = 'campus-erd-hechos';
let done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));

function save() { localStorage.setItem(KEY, JSON.stringify([...done])); }

function copy(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = 'copiado';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1200);
  });
}

function render() {
  const q = document.getElementById('q').value.toLowerCase();
  const list = document.getElementById('list');
  list.innerHTML = '';
  let shown = 0;

  for (const r of DATA) {
    if (q && !(r.rel.toLowerCase().includes(q) || r.model.toLowerCase().includes(q))) continue;
    shown++;

    const item = document.createElement('div');
    item.className = 'item' + (done.has(r.rel) ? ' done' : '');

    const head = document.createElement('div');
    head.className = 'head';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = r.rel;
    const model = document.createElement('div');
    model.className = 'model';
    model.textContent = r.model ? 'erdiagram ' + r.model + '  ·  ' + r.chars + ' car.' : r.chars + ' car.';
    const check = document.createElement('label');
    check.className = 'check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = done.has(r.rel);
    cb.onchange = () => { cb.checked ? done.add(r.rel) : done.delete(r.rel); save(); render(); };
    check.appendChild(cb);
    check.appendChild(document.createTextNode('hecho'));
    head.append(name, model, check);

    const mk = (label, value, short) => {
      const row = document.createElement('div');
      row.className = 'row';
      const l = document.createElement('div');
      l.className = 'label';
      l.textContent = label;
      const c = document.createElement('code');
      c.textContent = short;
      const b = document.createElement('button');
      b.textContent = 'copiar';
      b.onclick = () => copy(value, b);
      row.append(l, c, b);
      return row;
    };

    item.append(head);
    item.append(mk('MD5', r.md5, r.md5));
    item.append(mk('base64', r.encoded, r.encoded.slice(0, 60) + '... (' + r.encoded.length + ' car.)'));

    if (r.warnings.length > 0) {
      const w = document.createElement('div');
      w.className = 'warn';
      w.textContent = 'Aviso: ' + r.warnings.join('; ');
      item.append(w);
    }

    list.append(item);
  }

  document.getElementById('count').textContent =
    done.size + ' de ' + DATA.length + ' hechos' + (shown !== DATA.length ? '  ·  ' + shown + ' visibles' : '');
}

document.getElementById('q').oninput = render;
document.getElementById('reset').onclick = () => {
  if (confirm('¿Reiniciar el progreso marcado?')) { done = new Set(); save(); render(); }
};
render();
</script>
`;
}

// --- MAIN ---
const args = process.argv.slice(2);

let dir = null;
let htmlOut = null;
let asCsv = false;

for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv') {
        asCsv = true;
    } else if (a === '--html') {
        htmlOut = args[++i] || 'campus.html';
    } else if (!a.startsWith('--') && dir === null) {
        dir = a;
    }
}

if (!dir || !fs.existsSync(dir)) {
    console.error('Uso: node tools/regen-campus.js <carpeta> [--html salida.html] [--csv]');
    process.exit(1);
}

const files = findErdFiles(dir);
const rows = [];
let totalWarnings = 0;

for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const encoded = encodeErd(text);
    const rel = path.relative(dir, file);
    const warnings = legacyMarkers(text);

    if (!roundTripOk(text, encoded)) warnings.push('el texto no sobrevive al viaje a base64');
    if (!/\berdiagram\b/.test(text)) warnings.push('no contiene "erdiagram"');

    totalWarnings += warnings.length;

    rows.push({
        rel,
        model: modelName(text),
        chars: text.length,
        md5: md5OfSolution(text),
        encoded,
        warnings
    });
}

if (htmlOut) {
    fs.writeFileSync(htmlOut, buildHtml(rows), 'utf8');
    console.error(`Panel escrito en ${htmlOut} con ${rows.length} ejercicios.`);
} else if (asCsv) {
    console.log('fichero,modelo,caracteres,md5,base64,avisos');
    for (const r of rows) {
        console.log(`"${r.rel}","${r.model}",${r.chars},${r.md5},"${r.encoded}","${r.warnings.join('; ')}"`);
    }
} else {
    for (const r of rows) {
        console.log('─'.repeat(70));
        console.log(r.rel + (r.model ? `  [erdiagram ${r.model}]` : '') + `  (${r.chars} car.)`);
        console.log('MD5:    ' + r.md5);
        console.log('base64: ' + r.encoded);
        if (r.warnings.length) console.log('AVISO:  ' + r.warnings.join('; '));
        console.log();
    }
}

console.error(`${rows.length} ficheros procesados, ${totalWarnings} aviso(s).`);
if (totalWarnings > 0) {
    console.error('Revisa los avisos antes de subir nada: pueden indicar sintaxis antigua sin migrar.');
}
