#!/usr/bin/env node

/**
 * Migracion de ficheros .erd a la sintaxis actual de bigER
 *
 * Tres transformaciones, cada una con su interruptor:
 *
 *   JERARQUIAS (siempre)
 *     //total,disjunta + extends Superclase
 *       ->  hierarchy h_superclase Superclase total disjoint
 *           entity Subclase extends h_superclase
 *
 *   UNIQUE (siempre)
 *     atributo //UNIQUE  ->  atributo unique
 *
 *   ASOCIATIVAS (solo con --assoc)
 *     entity Asoc_X { clave_a key  clave_b key }
 *       ->  associative entity Asoc_X { }
 *     y las relaciones que la unen con las entidades cuya clave primaria
 *     aparecia dentro de ella pasan a ser "associative relationship".
 *
 * Uso:
 *   node migrate-erd.js <carpeta>                    inventario, no toca nada
 *   node migrate-erd.js <carpeta> --assoc            inventario incluyendo asociativas
 *   node migrate-erd.js <carpeta> --write --backup   aplica jerarquias y unique
 *   node migrate-erd.js <carpeta> --write --assoc    aplica ademas las asociativas
 *
 * El inventario marca con AVISO los casos que el script no puede decidir
 * por su cuenta. Conviene revisarlos antes de escribir.
 */

const fs = require('fs');
const path = require('path');

const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    grey: '\x1b[90m'
};

const COMPLETENESS = { total: 'total', parcial: 'partial' };
const CONSTRAINT = { disjunta: 'disjoint', solapada: 'overlapping' };

const SPECIALIZATION_RE = /^\s*\/\/\s*(parcial|total)\s*(?:,\s*(solapada|disjunta))?\s*$/i;
const EXTENDS_RE = /^(\s*)(?:(weak|associative)\s+)?entity\s+(\w+)\s+extends\s+(\w+)(\s*\{.*)$/;
const UNIQUE_RE = /^(\s*)(.*?)\s*\/\/\s*UNIQUE\s*$/i;

const ENTITY_OPEN_RE = /^(\s*)(?:(weak|associative)\s+)?entity\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{(.*)$/;
const REL_OPEN_RE = /^(\s*)(?:(weak|associative)\s+)?relationship\s+(\w+)\s*\{(.*)$/;
const KEY_ATTR_RE = /^\s*(\w+)(?:\s*:\s*\w+(?:\s*\([^)]*\))?)?\s+key\s*(?:\/\/.*)?$/;

const ASSOC_PREFIX = /^Asoc_/i;

function hierarchyName(base) {
    return 'h_' + base.toLowerCase();
}

function findErdFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...findErdFiles(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.erd')) out.push(full);
    }
    return out.sort();
}

/** Localiza la llave de cierre de un bloque abierto en la linea open. */
function findClose(lines, open) {
    if (lines[open].includes('}')) return open;
    for (let i = open + 1; i < lines.length; i++) {
        if (lines[i].includes('}')) return i;
    }
    return lines.length - 1;
}

/** Lee entidades y relaciones con la informacion necesaria para migrar. */
function scanModel(lines) {
    const entities = [];
    const relationships = [];

    for (let i = 0; i < lines.length; i++) {
        const em = lines[i].match(ENTITY_OPEN_RE);
        if (em) {
            const close = findClose(lines, i);
            const keys = [];

            // Cuerpo en la misma linea: entity X { a key }
            if (close === i) {
                const inner = em[5].replace(/\}.*$/, '');
                for (const part of inner.split(/\s{2,}|\t/)) {
                    const km = part.match(KEY_ATTR_RE);
                    if (km) keys.push({ name: km[1], line: i, inline: true });
                }
            } else {
                for (let j = i + 1; j < close; j++) {
                    const km = lines[j].match(KEY_ATTR_RE);
                    if (km) keys.push({ name: km[1], line: j, inline: false });
                }
            }

            entities.push({
                name: em[3],
                modifier: em[2] || null,
                indent: em[1],
                extendsTarget: em[4] || null,
                open: i,
                close,
                keys
            });
            continue;
        }

        const rm = lines[i].match(REL_OPEN_RE);
        if (rm) {
            const close = findClose(lines, i);
            const links = [];

            for (let j = i; j <= close; j++) {
                const text = lines[j].replace(/\/\/.*$/, '');
                if (!text.includes('->')) continue;
                const segs = text.split('->').map(s => s.trim());
                for (let k = 0; k < segs.length - 1; k++) {
                    const a = segs[k].match(/(\w+)\s*(?:\[([^\]]*)\])?$/);
                    const b = segs[k + 1].match(/^(\w+)\s*(?:\[([^\]]*)\])?/);
                    if (a && b) {
                        links.push({
                            from: a[1], fromCard: (a[2] || '').split('|')[0].trim(),
                            to: b[1], toCard: (b[2] || '').split('|')[0].trim()
                        });
                    }
                }
            }

            relationships.push({
                name: rm[3],
                modifier: rm[2] || null,
                indent: rm[1],
                open: i,
                close,
                links
            });
        }
    }

    return { entities, relationships };
}

function analyse(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const lines = original.split('\n');
    const model = scanModel(lines);

    // ---------- JERARQUIAS ----------
    const subclasses = [];
    const usedComments = new Set();

    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(EXTENDS_RE);
        if (!m) continue;

        let commentLine = -1;
        for (let j = i - 1; j >= 0; j--) {
            if (lines[j].trim() === '') continue;
            if (SPECIALIZATION_RE.test(lines[j])) commentLine = j;
            break;
        }
        if (commentLine !== -1) usedComments.add(commentLine);

        subclasses.push({
            line: i, indent: m[1], modifier: m[2] || null,
            name: m[3], base: m[4], rest: m[5], commentLine
        });
    }

    const orphanComments = [];
    for (let i = 0; i < lines.length; i++) {
        if (SPECIALIZATION_RE.test(lines[i]) && !usedComments.has(i)) orphanComments.push(i);
    }

    const groups = new Map();
    for (const s of subclasses) {
        if (!groups.has(s.base)) groups.set(s.base, []);
        groups.get(s.base).push(s);
    }

    const hierarchies = [];
    const warnings = [];

    for (const [base, subs] of groups) {
        const found = [];
        for (const s of subs) {
            if (s.commentLine === -1) continue;
            const cm = lines[s.commentLine].match(SPECIALIZATION_RE);
            found.push({
                completeness: COMPLETENESS[cm[1].toLowerCase()],
                constraint: cm[2] ? CONSTRAINT[cm[2].toLowerCase()] : null
            });
        }

        const distinct = [...new Set(found.map(f => `${f.completeness}|${f.constraint}`))];
        let completeness = 'partial';
        let constraint = null;

        if (found.length === 0) {
            warnings.push(`"${base}" tiene subclases [${subs.map(s => s.name).join(', ')}] pero ningun comentario de especializacion. Se pondra "partial"; revisalo.`);
        } else if (distinct.length > 1) {
            warnings.push(`"${base}" tiene comentarios contradictorios: ${distinct.join(' / ')}. Se usa el primero; revisalo.`);
            completeness = found[0].completeness;
            constraint = found[0].constraint;
        } else {
            completeness = found[0].completeness;
            constraint = found[0].constraint;
        }

        if (subs.length === 1) {
            if (completeness !== 'partial' || constraint !== null) {
                warnings.push(`"${base}" tiene una sola subclase (${subs[0].name}), asi que solo cabe "partial". Habia "${completeness}${constraint ? ' ' + constraint : ''}"; se escribira "partial".`);
            }
            completeness = 'partial';
            constraint = null;
        } else if (!constraint) {
            warnings.push(`"${base}" tiene ${subs.length} subclases pero no se indico disjunta/solapada. Con dos o mas subclases la restriccion es obligatoria; revisalo.`);
        }

        hierarchies.push({
            base, name: hierarchyName(base), completeness, constraint,
            subs, insertAt: Math.min(...subs.map(s => s.line))
        });
    }

    // ---------- UNIQUE ----------
    const uniqueLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (UNIQUE_RE.test(lines[i])) uniqueLines.push(i);
    }

    // ---------- ASOCIATIVAS ----------
    // Una entidad Asoc_* lleva como claves las claves primarias de las
    // entidades que asocia. Eso identifica sin ambiguedad que relaciones
    // son constitutivas: las que la unen con esas entidades.
    const associatives = [];
    const byName = new Map(model.entities.map(e => [e.name, e]));

    for (const ent of model.entities) {
        if (!ASSOC_PREFIX.test(ent.name)) continue;
        if (ent.modifier === 'associative') continue; // ya migrada

        const assocKeys = ent.keys.map(k => k.name);
        const constitutive = [];
        const other = [];
        const matchedKeys = new Set();

        for (const rel of model.relationships) {
            const touches = rel.links.some(l => l.from === ent.name || l.to === ent.name);
            if (!touches) continue;

            // La otra entidad del enlace
            const link = rel.links.find(l => l.from === ent.name || l.to === ent.name);
            const otherName = link.from === ent.name ? link.to : link.from;
            const otherEnt = byName.get(otherName);

            const otherKeys = otherEnt ? otherEnt.keys.map(k => k.name) : [];
            const shared = otherKeys.filter(k => assocKeys.includes(k));
            const isConstitutive = otherKeys.length > 0 && shared.length === otherKeys.length;

            const normalSideCard = link.from === ent.name ? link.toCard : link.fromCard;

            if (isConstitutive) {
                shared.forEach(k => matchedKeys.add(k));
                constitutive.push({ rel, otherName, shared, normalSideCard });
            } else {
                other.push({ rel, otherName });
            }
        }

        const unmatched = assocKeys.filter(k => !matchedKeys.has(k));

        if (constitutive.length < 2) {
            warnings.push(`"${ent.name}" solo tiene ${constitutive.length} relacion(es) constitutiva(s); una entidad asociativa necesita al menos dos. Revisalo a mano.`);
        }
        if (unmatched.length > 0) {
            warnings.push(`"${ent.name}" tiene la(s) clave(s) [${unmatched.join(', ')}] que no corresponden a ninguna entidad relacionada. Revisalo a mano.`);
        }
        for (const cst of constitutive) {
            if (cst.normalSideCard && !/^1\.\.1$|^1$/.test(cst.normalSideCard)) {
                warnings.push(`"${ent.name}" <-> "${cst.otherName}": el lado de la entidad normal es [${cst.normalSideCard}] y deberia ser [1..1]. Revisalo.`);
            }
        }

        associatives.push({ entity: ent, assocKeys, constitutive, other, unmatched });
    }

    return { filePath, original, lines, hierarchies, uniqueLines, orphanComments, associatives, warnings };
}

function migrate(a, opts) {
    let lines = [...a.lines];
    const drop = new Set();

    // --- jerarquias: extends apunta a la jerarquia ---
    for (const h of a.hierarchies) {
        for (const s of h.subs) {
            const prefix = s.modifier ? `${s.modifier} ` : '';
            lines[s.line] = `${s.indent}${prefix}entity ${s.name} extends ${h.name}${s.rest}`;
            if (s.commentLine !== -1) drop.add(s.commentLine);
        }
    }
    for (const i of a.orphanComments) drop.add(i);

    // --- unique ---
    for (const i of a.uniqueLines) {
        const m = lines[i].match(UNIQUE_RE);
        if (m && m[2].trim() !== '') lines[i] = `${m[1]}${m[2].trim()} unique`;
    }

    // --- asociativas ---
    if (opts.assoc) {
        for (const as of a.associatives) {
            const e = as.entity;
            lines[e.open] = lines[e.open].replace(
                /^(\s*)entity\s+/,
                '$1associative entity '
            );

            // Las claves heredadas de las entidades asociadas desaparecen
            const matched = new Set();
            for (const cst of as.constitutive) cst.shared.forEach(k => matched.add(k));
            for (const k of e.keys) {
                if (matched.has(k.name) && !k.inline) drop.add(k.line);
            }

            for (const cst of as.constitutive) {
                lines[cst.rel.open] = lines[cst.rel.open].replace(
                    /^(\s*)relationship\s+/,
                    '$1associative relationship '
                );
            }
        }
    }

    // --- declaraciones de jerarquia, de abajo arriba ---
    const marker = '\u0000DROP\u0000';
    for (const i of drop) lines[i] = marker;

    const inserts = a.hierarchies.slice().sort((x, y) => y.insertAt - x.insertAt);
    for (const h of inserts) {
        const props = h.constraint ? `${h.completeness} ${h.constraint}` : h.completeness;
        lines = [
            ...lines.slice(0, h.insertAt),
            `hierarchy ${h.name} ${h.base} ${props}`,
            '',
            ...lines.slice(h.insertAt)
        ];
    }

    lines = lines.filter(l => l !== marker);

    // Compactar huecos de mas de dos lineas en blanco
    const out = [];
    let blanks = 0;
    for (const line of lines) {
        if (line.trim() === '') {
            blanks++;
            if (blanks > 2) continue;
        } else blanks = 0;
        out.push(line);
    }

    return out.join('\n');
}

// --- MAIN ---
const args = process.argv.slice(2);
const dir = args.find(x => !x.startsWith('--'));
const write = args.includes('--write');
const backup = args.includes('--backup');
const assoc = args.includes('--assoc');

if (!dir || !fs.existsSync(dir)) {
    console.error('Uso: node migrate-erd.js <carpeta> [--assoc] [--write] [--backup]');
    process.exit(1);
}

const files = findErdFiles(dir);
console.log(`${c.bold}${files.length} ficheros .erd encontrados en ${dir}${c.reset}\n`);

let touched = 0;
let warn = 0;

for (const file of files) {
    const a = analyse(file);
    const hasAssoc = assoc && a.associatives.length > 0;
    const hasWork = a.hierarchies.length > 0 || a.uniqueLines.length > 0 ||
                    a.orphanComments.length > 0 || hasAssoc;

    if (!hasWork) continue;
    touched++;

    console.log(`${c.blue}${path.relative(dir, file)}${c.reset}`);

    for (const h of a.hierarchies) {
        const props = h.constraint ? `${h.completeness} ${h.constraint}` : h.completeness;
        console.log(`   ${c.green}hierarchy ${h.name} ${h.base} ${props}${c.reset}`);
        console.log(`   ${c.grey}subclases: ${h.subs.map(s => s.name).join(', ')}${c.reset}`);
    }

    if (a.uniqueLines.length > 0) {
        console.log(`   ${c.grey}//UNIQUE -> unique en ${a.uniqueLines.length} atributo(s)${c.reset}`);
    }

    if (assoc) {
        for (const as of a.associatives) {
            console.log(`   ${c.green}associative entity ${as.entity.name}${c.reset}`);
            console.log(`   ${c.grey}claves que se eliminan: ${as.assocKeys.join(', ') || 'ninguna'}${c.reset}`);
            for (const cst of as.constitutive) {
                console.log(`   ${c.green}associative relationship ${cst.rel.name}${c.reset} ${c.grey}<-> ${cst.otherName} (clave ${cst.shared.join('+')})${c.reset}`);
            }
            for (const o of as.other) {
                console.log(`   ${c.grey}se queda normal: ${o.rel.name} <-> ${o.otherName}${c.reset}`);
            }
        }
    } else if (a.associatives.length > 0) {
        console.log(`   ${c.yellow}${a.associatives.length} entidad(es) Asoc_ detectada(s); usa --assoc para tratarlas${c.reset}`);
    }

    if (a.orphanComments.length > 0) {
        console.log(`   ${c.yellow}AVISO: ${a.orphanComments.length} comentario(s) de especializacion sin subclase detras; se eliminaran${c.reset}`);
        warn += a.orphanComments.length;
    }

    for (const w of a.warnings) {
        console.log(`   ${c.yellow}AVISO: ${w}${c.reset}`);
        warn++;
    }

    if (write) {
        if (backup) fs.writeFileSync(file + '.bak', a.original, 'utf8');
        fs.writeFileSync(file, migrate(a, { assoc }), 'utf8');
        console.log(`   ${c.green}escrito${c.reset}`);
    }

    console.log();
}

console.log(`${c.bold}${touched} fichero(s) con cambios pendientes${c.reset}`);
if (warn > 0) console.log(`${c.yellow}${warn} aviso(s) que conviene revisar${c.reset}`);
if (!write) console.log(`${c.grey}Modo inventario: no se ha modificado nada. Anade --write para aplicar.${c.reset}`);
