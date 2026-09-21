/**
 * Test de Integración: Codificación Base64 + Validación ERD
 *
 * Este test verifica que el proceso completo funciona:
 * 1. Leer archivo .erd
 * 2. Codificar a base64 (como encode-erd.js)
 * 3. Decodificar (como app.js)
 * 4. Comparar soluciones (validación)
 *
 * Criterio de los casos con errores:
 *
 *   No se comprueba el NUMERO de errores, sino que se detecten los
 *   errores concretos que cada caso pretende ejercitar. Contar errores
 *   hace el test fragil: cualquier mejora en la redaccion de un mensaje
 *   lo rompe sin que nada este realmente mal, y un numero como "43
 *   errores" no documenta que se esta probando.
 *
 *   Cada caso declara en "mustDetect" una lista de comportamientos con
 *   el patron que los identifica. Si alguno no aparece, el test falla
 *   diciendo exactamente que comprobacion se ha perdido.
 */

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    grey: '\x1b[90m',
    bold: '\x1b[1m'
};

const { parseERD, compareSolutions } = require('../app.js');

// Función de codificación (como encode-erd.js)
function encodeToBase64(text) {
    return Buffer.from(encodeURIComponent(text)).toString('base64');
}

// Función de decodificación (como app.js)
function decodeFromBase64(base64Str) {
    return decodeURIComponent(atob(base64Str));
}

// Implementación de atob para Node.js
function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

// Rutas usadas por varios casos
const TERNARIA_OK = 'erd/Teoria/Ternarias/Ternaria correcto.erd';
const SUPERHEROES_OK = 'erd/01 Superheroes/ER 01 Superheroes final.erd';
const EXPANSE_OK = 'erd/04 The Expanse Completo/ER 04 The Expanse Completo final.erd';

// Tests
const tests = [
    {
        name: 'Ternaria - la solución correcta no produce errores',
        correctFile: TERNARIA_OK,
        userFile: TERNARIA_OK,
        expectNoErrors: true
    },
    {
        name: 'Ternaria - cardinalidades incorrectas',
        description: 'Las cardinalidades de los dos enlaces de la ternaria están cambiadas',
        correctFile: TERNARIA_OK,
        userFile: 'erd/Teoria/Ternarias/Ternaria incorrecta cardinalidades incorrectas.erd',
        mustDetect: [
            ['cardinalidad Proveedor-Proyecto', /Relationship "suministra".*"Proveedor" and "Proyecto".*is not correct/],
            ['cardinalidad Proyecto-Repuesto', /Relationship "suministra".*"Proyecto" and "Repuesto".*is not correct/]
        ]
    },
    {
        name: 'Ternaria - modelada con dos participantes en lugar de tres',
        description: 'La relación ternaria pierde un participante, así que le falta un enlace',
        correctFile: TERNARIA_OK,
        userFile: 'erd/Teoria/Ternarias/Ternaria incorrecta falta relacion.erd',
        mustDetect: [
            ['número de enlaces de la ternaria', /Relationship "suministra": expected 2 connection\(s\).*but found 1/]
        ]
    },
    {
        name: 'Superhéroes - la solución correcta no produce errores',
        correctFile: SUPERHEROES_OK,
        userFile: SUPERHEROES_OK,
        expectNoErrors: true
    },
    {
        name: 'Superhéroes - errores de entidades, atributos y relaciones',
        description: 'Atributos mal nombrados, entidades débiles mal marcadas, relaciones renombradas y cardinalidades',
        correctFile: SUPERHEROES_OK,
        userFile: 'erd/01 Superheroes/ER 01 Superheroes incorrecto.erd',
        mustDetect: [
            ['atributo que falta', /Entity "Superheroe": the attribute "nombre" is missing/],
            ['atributo que sobra', /Entity "Superheroe": the attribute "nombre_superheroe" should not be there/],
            ['entidad marcada débil sin serlo', /Entity "Planeta": should be a normal entity, not a weak one/],
            ['entidad débil sin marcar', /Entity "Mision_Realizada": should be declared as "weak entity"/],
            ['relación que sobra', /Unexpected relationship: "responsableDe"/],
            ['relación que falta', /Missing relationship: "responsable_de"/],
            ['cardinalidad incorrecta', /Relationship "procede".*is not correct/],
            ['atributo de relación que falta', /Relationship "posee": the attribute "nivel" is missing/],
            ['relación débil sin marcar', /Relationship "ha_realizado": should be declared as "weak relationship"/]
        ]
    },
    {
        name: 'The Expanse - la solución correcta no produce errores',
        correctFile: EXPANSE_OK,
        userFile: EXPANSE_OK,
        expectNoErrors: true
    },
    {
        name: 'The Expanse - errores de modelado y de jerarquías',
        description: 'El modelo más complejo: entidades que faltan y sobran, jerarquías sobre la superclase equivocada, enlaces y atributos',
        correctFile: EXPANSE_OK,
        userFile: 'erd/04 The Expanse Completo/ER 04 The Expanse Completo incorrecto.erd',
        mustDetect: [
            ['entidad que falta', /Missing entity: "Mineral"/],
            ['entidad que sobra', /Unexpected entity: "Dron"/],
            ['superclase equivocada', /Entity "Directivo": should be a subclass of "Personal"/],
            ['jerarquía que falta', /Missing hierarchy: .*over "Personal"/],
            ['jerarquía que sobra', /Unexpected hierarchy: .*over "Persona"/],
            ['atributo mal nombrado', /Entity "Vuelo": the attribute "fecha_inicio" is missing/],
            ['enlace que falta en una relación', /Relationship "coordina": there should be a connection/],
            ['relación que falta', /Missing relationship: "pilota"/]
        ]
    },
    {
        name: 'Preservación de caracteres especiales en el encoding',
        description: 'Acentos, eñes y espacios sobreviven al viaje a base64 y vuelta',
        correctFile: TERNARIA_OK,
        userFile: TERNARIA_OK,
        expectNoErrors: true,
        customValidation: (encoded, decoded, original) => {
            const errors = [];
            if (decoded !== original) {
                errors.push('El texto decodificado no coincide exactamente con el original');
            }
            if (original.includes('ñ') && !decoded.includes('ñ')) {
                errors.push('Se perdió la letra ñ en el encoding/decoding');
            }
            if (original.includes('á') && !decoded.includes('á')) {
                errors.push('Se perdieron los acentos en el encoding/decoding');
            }
            return errors;
        }
    }
];

// Ejecutar tests
console.log(`${colors.bold}${colors.blue}===============================================${colors.reset}`);
console.log(`${colors.bold}${colors.blue}  Tests de Integración: Encoding Base64 + ERD${colors.reset}`);
console.log(`${colors.bold}${colors.blue}===============================================${colors.reset}\n`);

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
    console.log(`${colors.bold}Test ${index + 1}/${tests.length}: ${test.name}${colors.reset}`);
    if (test.description) {
        console.log(`${colors.yellow}  ${test.description}${colors.reset}`);
    }

    try {
        // 1. Leer archivo esperado
        const correctPath = path.join(__dirname, '..', test.correctFile);
        const correctContent = fs.readFileSync(correctPath, 'utf-8');

        // 2. Codificar a base64 (simula encode-erd.js)
        const encoded = encodeToBase64(correctContent);

        // 3. Decodificar (simula app.js)
        const decoded = decodeFromBase64(encoded);

        // 4. Verificar que el contenido se preserva exactamente
        if (decoded !== correctContent) {
            throw new Error('El contenido decodificado no coincide con el original');
        }
        console.log(`  ${colors.grey}base64: ${encoded.length} caracteres, decodificado: ${decoded.length}, contenido preservado${colors.reset}`);

        // 5. Leer archivo del usuario
        const userPath = path.join(__dirname, '..', test.userFile);
        const userContent = fs.readFileSync(userPath, 'utf-8');

        // 6. Parsear ambos y comparar
        const expectedSolution = parseERD(decoded); // Usando el decodificado
        const userSolution = parseERD(userContent);
        const errors = compareSolutions(userSolution, expectedSolution);

        // 7. Validación personalizada (si existe)
        const customErrors = test.customValidation
            ? test.customValidation(encoded, decoded, correctContent)
            : [];

        // 8. Verificar resultado
        if (customErrors.length > 0) {
            console.log(`  ${colors.red}✗ FAIL - la validación específica del caso encontró problemas:${colors.reset}`);
            customErrors.forEach(e => console.log(`    - ${e}`));
            failed++;
        } else if (test.expectNoErrors) {
            if (errors.length === 0) {
                console.log(`  ${colors.green}✓ PASS - sin errores, como debe ser${colors.reset}`);
                passed++;
            } else {
                console.log(`  ${colors.red}✗ FAIL - se esperaban 0 errores y se han detectado ${errors.length}:${colors.reset}`);
                errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
                if (errors.length > 10) console.log(`    ... y ${errors.length - 10} más`);
                failed++;
            }
        } else if (test.mustDetect) {
            const missing = test.mustDetect.filter(([, re]) => !errors.some(e => re.test(e)));

            if (missing.length === 0) {
                console.log(`  ${colors.green}✓ PASS - detectadas las ${test.mustDetect.length} comprobaciones del caso${colors.reset}`);
                console.log(`  ${colors.grey}${errors.length} errores en total${colors.reset}`);
                passed++;
            } else {
                console.log(`  ${colors.red}✗ FAIL - no se han detectado ${missing.length} de ${test.mustDetect.length} comprobaciones:${colors.reset}`);
                missing.forEach(([what, re]) => console.log(`    - ${what}  ${colors.grey}${re}${colors.reset}`));
                console.log(`  ${colors.grey}errores que sí se detectaron (${errors.length}):${colors.reset}`);
                errors.slice(0, 10).forEach(e => console.log(`    ${colors.grey}- ${e}${colors.reset}`));
                if (errors.length > 10) console.log(`    ${colors.grey}... y ${errors.length - 10} más${colors.reset}`);
                failed++;
            }
        } else {
            throw new Error('El caso no declara ni expectNoErrors ni mustDetect');
        }

    } catch (error) {
        console.log(`  ${colors.red}✗ ERROR - ${error.message}${colors.reset}`);
        failed++;
    }

    console.log('');
});

// Resumen
console.log(`${colors.bold}${colors.blue}===============================================${colors.reset}`);
console.log(`${colors.bold}Resumen:${colors.reset}`);
console.log(`  ${colors.green}✓ Pasados: ${passed}${colors.reset}`);
if (failed > 0) {
    console.log(`  ${colors.red}✗ Fallados: ${failed}${colors.reset}`);
}
console.log(`${colors.bold}${colors.blue}===============================================${colors.reset}\n`);

process.exit(failed > 0 ? 1 : 0);