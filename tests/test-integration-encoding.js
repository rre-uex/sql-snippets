/**
 * Test de Integración: Codificación Base64 + Validación ERD
 * 
 * Este test verifica que el proceso completo funciona:
 * 1. Leer archivo .erd
 * 2. Codificar a base64 (como encode-erd.js)
 * 3. Decodificar (como appParametrizable.js)
 * 4. Comparar soluciones (validación)
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
    bold: '\x1b[1m'
};

// ============================================================================
// PARSER REAL DE app.js - Función completa copiada desde app.js
// ============================================================================
function parseERD(text) {
    const erd = {
        entities: [],
        relationships: []
    };

    // Clean up text: remove block comments but keep line comments (we need //UNIQUE)
    const cleanText = text.replace(/\/\*[\s\S]*?\*\//g, '').trim();

    // Regex to find entities (including weak ones) with possible preceding comment
    const entityRegex = /(?:\/\/([^\n]*)\n\s*)?(weak\s+)?entity\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([\s\S]*?)\}/g;
    let match;

    // --- Parse Entities ---
    while ((match = entityRegex.exec(cleanText)) !== null) {
        const precedingComment = match[1] ? match[1].trim() : null;
        const isWeak = !!match[2];
        const name = match[3];
        const extendsFrom = match[4] || null;
        const body = match[5];

        const entity = {
            name: name,
            isWeak: isWeak,
            extendsFrom: extendsFrom,
            specialization: null,
            attributes: []
        };

        // Parse specialization comment (parcial/total, solapada/disjunta)
        if (precedingComment) {
            const specializationMatch = precedingComment.match(/^\s*(parcial|total)(?:\s*,\s*(solapada|disjunta))?\s*$/i);
            if (specializationMatch) {
                entity.specialization = {
                    completeness: specializationMatch[1].toLowerCase(),
                    overlap: specializationMatch[2] ? specializationMatch[2].toLowerCase() : null
                };
            }
        }

        // Parse attributes within the entity body
        const lines = body.trim().split('\n');
        for (const line of lines) {
            const attrLine = line.trim();
            if (attrLine) {
                const hasUniqueComment = /\/\/\s*UNIQUE/.test(attrLine);
                const attrMatch = attrLine.match(/^(\w+)\s*(:\s*\w+)?\s*(key|partial-key|derived)?/);
                if (attrMatch) {
                    entity.attributes.push({
                        name: attrMatch[1],
                        isKey: attrMatch[3] === 'key',
                        isPartialKey: attrMatch[3] === 'partial-key',
                        isUnique: hasUniqueComment
                    });
                }
            }
        }
        erd.entities.push(entity);
    }
    
    // --- Parse Relationships ---
    const relRegex = /(weak\s+)?relationship\s+(\w+)\s*\{([\s\S]*?)\}/g;

    while ((match = relRegex.exec(cleanText)) !== null) {
        const isWeak = !!match[1];
        const name = match[2];
        const body = match[3];

        const relationship = {
            name: name,
            isWeak: isWeak,
            links: [],
            attributes: []
        };

        // Parse links and attributes within the relationship body
        const lines = body.trim().split('\n');
        for (const line of lines) {
            const linkLine = line.replace(/\/\/(?!UNIQUE).*/g, '').trim();
            const arrowCount = (linkLine.match(/->/g) || []).length;
            
            if (arrowCount > 0) {
                const segments = linkLine.split('->').map(s => s.trim());
                
                for (let i = 0; i < segments.length - 1; i++) {
                    const fromPart = segments[i];
                    const toPart = segments[i + 1];
                    
                    const fromMatch = fromPart.match(/(\w+)\s*(\[[^\]]*\])?$/);
                    const toMatch = toPart.match(/^(\w+)\s*(\[[^\]]*\])?/);
                    
                    if (!fromMatch || !toMatch) {
                        throw new Error(`Invalid link syntax in relationship "${name}": "${linkLine}".`);
                    }
                    
                    if (fromMatch && toMatch) {
                        const parseCardinalityAndRole = (bracketContent) => {
                            if (!bracketContent) return { cardinality: '1', role: null };
                            const cleaned = bracketContent.replace(/[\[\]]/g, '');
                            const parts = cleaned.split('|').map(p => p.trim());
                            return {
                                cardinality: parts[0],
                                role: parts[1] ? parts[1].replace(/['"]/g, '') : null
                            };
                        };
                        
                        const fromData = parseCardinalityAndRole(fromMatch[2]);
                        const toData = parseCardinalityAndRole(toMatch[2]);
                        
                        relationship.links.push({
                            from: fromMatch[1],
                            fromCardinality: fromData.cardinality,
                            fromRole: fromData.role,
                            to: toMatch[1],
                            toCardinality: toData.cardinality,
                            toRole: toData.role
                        });
                    }
                }
            } else if (linkLine && !linkLine.match(/[{}]/)) {
                const attrMatch = linkLine.match(/^(\w+)/);
                if (attrMatch) {
                    relationship.attributes.push({
                        name: attrMatch[1]
                    });
                }
            }
        }
        erd.relationships.push(relationship);
    }
    
    return erd;
}

// ============================================================================
// FUNCIÓN DE COMPARACIÓN REAL DE app.js - Función completa copiada desde app.js
// ============================================================================
function compareSolutions(student, expected) {
    const errors = [];
    
    const findByName = (arr, name) => arr.find(item => item.name === name);

    // --- Check Entities ---
    if (student.entities.length !== expected.entities.length) {
        errors.push(`Problem: Expected ${expected.entities.length} entities, but found ${student.entities.length}.`);
    }

    for (const expEntity of expected.entities) {
        const stuEntity = findByName(student.entities, expEntity.name);
        if (!stuEntity) {
            errors.push(`Missing Entity: The entity "${expEntity.name}" is missing.`);
            continue;
        }

        if (expEntity.isWeak && !stuEntity.isWeak) {
            errors.push(`Incorrect Entity Type: The entity "${expEntity.name}" should be marked as weak.`);
        }
        if (!expEntity.isWeak && stuEntity.isWeak) {
            errors.push(`Incorrect Entity Type: The entity "${expEntity.name}" should NOT be marked as weak.`);
        }

        // Check extends (inheritance)
        if (expEntity.extendsFrom !== stuEntity.extendsFrom) {
            if (expEntity.extendsFrom && !stuEntity.extendsFrom) {
                errors.push(`Incorrect Entity: The entity "${expEntity.name}" should extend "${expEntity.extendsFrom}".`);
            } else if (!expEntity.extendsFrom && stuEntity.extendsFrom) {
                errors.push(`Incorrect Entity: The entity "${expEntity.name}" should NOT extend any entity.`);
            } else {
                errors.push(`Incorrect Entity: The entity "${expEntity.name}" should extend "${expEntity.extendsFrom}" but extends "${stuEntity.extendsFrom}".`);
            }
        }

        // Check specialization (parcial/total, solapada/disjunta) for entities with extends
        if (expEntity.extendsFrom) {
            const expSpec = expEntity.specialization;
            const stuSpec = stuEntity.specialization;

            if (expSpec) {
                if (!stuSpec) {
                    const expectedComment = expSpec.overlap 
                        ? `//${expSpec.completeness},${expSpec.overlap}` 
                        : `//${expSpec.completeness}`;
                    errors.push(`Missing Specialization Comment: The entity "${expEntity.name}" should have the comment "${expectedComment}" before its declaration.`);
                } else {
                    // Verificar completeness (parcial/total) primero
                    if (expSpec.completeness !== stuSpec.completeness) {
                        errors.push(`Incorrect Specialization in "${expEntity.name}": Expected "${expSpec.completeness}" but found "${stuSpec.completeness}".`);
                    } else {
                        // Solo verificar overlap si completeness es correcto
                        if (expSpec.overlap !== stuSpec.overlap) {
                            if (expSpec.overlap && !stuSpec.overlap) {
                                errors.push(`Incorrect Specialization in "${expEntity.name}": "${expSpec.completeness}" is correct but missing "${expSpec.overlap}".`);
                            } else if (!expSpec.overlap && stuSpec.overlap) {
                                errors.push(`Incorrect Specialization in "${expEntity.name}": Should only have "${expSpec.completeness}", not "${stuSpec.overlap}".`);
                            } else {
                                errors.push(`Incorrect Specialization in "${expEntity.name}": "${expSpec.completeness}" is correct but "${stuSpec.overlap}" is incorrect, should be "${expSpec.overlap}".`);
                            }
                        }
                    }
                }
            }
        } else {
            // Si NO tiene extends, NO debería tener comentario de especialización
            if (stuEntity.specialization) {
                const stuSpec = stuEntity.specialization;
                const incorrectComment = stuSpec.overlap 
                    ? `//${stuSpec.completeness},${stuSpec.overlap}` 
                    : `//${stuSpec.completeness}`;
                errors.push(`Incorrect Specialization Comment: The entity "${expEntity.name}" does not extend any entity and should NOT have the comment "${incorrectComment}" before its declaration.`);
            }
        }

        if (expEntity.attributes.length !== stuEntity.attributes.length) {
            errors.push(`Problem in Entity "${expEntity.name}": Expected ${expEntity.attributes.length} attributes, but found ${stuEntity.attributes.length}.`);
        }

        for (const expAttr of expEntity.attributes) {
            const stuAttr = findByName(stuEntity.attributes, expAttr.name);
            if (!stuAttr) {
                errors.push(`Missing Attribute in "${expEntity.name}": The attribute "${expAttr.name}" is missing.`);
            } else {
                if (expAttr.isKey && !stuAttr.isKey) {
                    errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should be a key.`);
                }
                if (!expAttr.isKey && stuAttr.isKey) {
                    errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should NOT be a key.`);
                }
                if (expAttr.isPartialKey && !stuAttr.isPartialKey) {
                     errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should be a partial-key.`);
                }
                if (!expAttr.isPartialKey && stuAttr.isPartialKey) {
                     errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should NOT be a partial-key.`);
                }
                if (expAttr.isUnique && !stuAttr.isUnique) {
                     errors.push(`Incorrect Unique constraint in "${expEntity.name}": The attribute "${expAttr.name}" should be marked as UNIQUE (//UNIQUE).`);
                }
                if (!expAttr.isUnique && stuAttr.isUnique) {
                     errors.push(`Incorrect Unique constraint in "${expEntity.name}": The attribute "${expAttr.name}" should NOT be marked as UNIQUE.`);
                }
            }
        }
    }

    // --- Check Relationships ---
    if (student.relationships.length !== expected.relationships.length) {
        errors.push(`Problem: Expected ${expected.relationships.length} relationships, but found ${student.relationships.length}.`);
    }

    for (const expRel of expected.relationships) {
        const stuRel = findByName(student.relationships, expRel.name);
        if (!stuRel) {
            errors.push(`Missing Relationship: The relationship "${expRel.name}" is missing.`);
            continue;
        }

        if (expRel.isWeak && !stuRel.isWeak) {
            errors.push(`Incorrect Relationship Type: The relationship "${expRel.name}" should be marked as weak.`);
        }
        if (!expRel.isWeak && stuRel.isWeak) {
            errors.push(`Incorrect Relationship Type: The relationship "${expRel.name}" should NOT be marked as weak.`);
        }

        if (expRel.links.length !== stuRel.links.length) {
            errors.push(`Problem in Relationship "${expRel.name}": Expected ${expRel.links.length} links, but found ${stuRel.links.length}.`);
        } else {
            // Verificar cada link esperado
            for (const expLink of expRel.links) {
                // Buscar si existe un link que coincida (en cualquier dirección)
                const matchingLink = stuRel.links.find(stuLink => {
                    // Dirección normal: A -> B
                    const normalMatch = 
                        stuLink.from === expLink.from && 
                        stuLink.to === expLink.to &&
                        stuLink.fromCardinality === expLink.fromCardinality &&
                        stuLink.toCardinality === expLink.toCardinality &&
                        stuLink.fromRole === expLink.fromRole &&
                        stuLink.toRole === expLink.toRole;
                    
                    // Dirección inversa: B -> A (intercambiando también las cardinalidades Y roles)
                    const reverseMatch = 
                        stuLink.from === expLink.to && 
                        stuLink.to === expLink.from &&
                        stuLink.fromCardinality === expLink.toCardinality &&
                        stuLink.toCardinality === expLink.fromCardinality &&
                        stuLink.fromRole === expLink.toRole &&
                        stuLink.toRole === expLink.fromRole;
                    
                    return normalMatch || reverseMatch;
                });
                
                if (!matchingLink) {
                    const fromDesc = expLink.fromRole ? `${expLink.from}[${expLink.fromCardinality} | "${expLink.fromRole}"]` : `${expLink.from}[${expLink.fromCardinality}]`;
                    const toDesc = expLink.toRole ? `${expLink.to}[${expLink.toCardinality} | "${expLink.toRole}"]` : `${expLink.to}[${expLink.toCardinality}]`;
                    errors.push(`Incorrect Link in "${expRel.name}": Expected link between ${fromDesc} and ${toDesc} not found or has wrong cardinalities/roles.`);
                }
            }
        }

        // Verificar atributos de la relación
        if (expRel.attributes.length !== stuRel.attributes.length) {
            errors.push(`Problem in Relationship "${expRel.name}": Expected ${expRel.attributes.length} attributes, but found ${stuRel.attributes.length}.`);
        }

        for (const expAttr of expRel.attributes) {
            const stuAttr = findByName(stuRel.attributes, expAttr.name);
            if (!stuAttr) {
                errors.push(`Missing Attribute in Relationship "${expRel.name}": The attribute "${expAttr.name}" is missing.`);
            }
        }
    }

    return errors;
}

// Función de codificación (como encode-erd.js)
function encodeToBase64(text) {
    return Buffer.from(encodeURIComponent(text)).toString('base64');
}

// Función de decodificación (como appParametrizable.js - VERSIÓN CORREGIDA)
function decodeFromBase64(base64Str) {
    return decodeURIComponent(atob(base64Str));
}

// Implementación de atob para Node.js
function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

// Tests
const tests = [
    {
        name: 'Ternaria - Solución correcta (encoding completo)',
        correctFile: 'erd/Ternaria correcto.erd',
        userFile: 'erd/Ternaria correcto.erd',
        expectedErrors: 0
    },
    {
        name: 'Ternaria - Cardinalidades incorrectas (encoding completo)',
        correctFile: 'erd/Ternaria correcto.erd',
        userFile: 'erd/Ternaria incorrecta cardinalidades incorrectas.erd',
        expectedErrors: 2, // Ahora detecta las cardinalidades incorrectas
        description: 'Verifica que el encoding/decoding preserva el contenido y detecta errores de cardinalidad'
    },
    {
        name: 'Ternaria - Falta relación (encoding completo)',
        correctFile: 'erd/Ternaria correcto.erd',
        userFile: 'erd/Ternaria incorrecta falta relacion.erd',
        expectedErrors: 1,
        description: 'Detecta que falta un link en la relación ternaria'
    },
    {
        name: 'Superhéroes - Solución completa (encoding completo)',
        correctFile: 'erd/Enunciado 1 ER Superhéroesv1 completo.erd',
        userFile: 'erd/Enunciado 1 ER Superhéroesv1 completo.erd',
        expectedErrors: 0
    },
    {
        name: 'Superhéroes - 9 errores (encoding completo)',
        correctFile: 'erd/Enunciado 1 ER Superhéroesv1 completo.erd',
        userFile: 'erd/Enunciado 1 ER Superhéroesv1 incorrecto.erd',
        expectedErrors: 9, // Ahora detecta todos los errores
        description: 'Detecta todos los tipos de errores: entidades débiles, atributos, relaciones, roles'
    },
    {
        name: 'The Expanse - Solución completa (encoding completo)',
        correctFile: 'erd/Enunciado 4 ER The Expanse v2 completo.erd',
        userFile: 'erd/Enunciado 4 ER The Expanse v2 completo.erd',
        expectedErrors: 0
    },
    {
        name: 'The Expanse - 23 errores (encoding completo)',
        correctFile: 'erd/Enunciado 4 ER The Expanse v2 completo.erd',
        userFile: 'erd/Enunciado 4 ER The Expanse v2 incorrecto.erd',
        expectedErrors: 23, // Ahora detecta todos los errores
        description: 'Test completo de encoding con el ERD más complejo - detecta todos los tipos de errores'
    },
    {
        name: 'Test de preservación de caracteres especiales',
        correctFile: 'erd/Ternaria correcto.erd',
        userFile: 'erd/Ternaria correcto.erd',
        expectedErrors: 0,
        description: 'Verifica que acentos, espacios y caracteres especiales se preservan',
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
        console.log(`  📦 Codificado a base64: ${encoded.length} caracteres`);
        
        // 3. Decodificar (simula appParametrizable.js)
        const decoded = decodeFromBase64(encoded);
        console.log(`  📂 Decodificado: ${decoded.length} caracteres`);
        
        // 4. Verificar que el contenido se preserva exactamente
        if (decoded !== correctContent) {
            throw new Error('El contenido decodificado no coincide con el original');
        }
        console.log(`  ✓ Contenido preservado correctamente`);
        
        // 5. Leer archivo del usuario
        const userPath = path.join(__dirname, '..', test.userFile);
        const userContent = fs.readFileSync(userPath, 'utf-8');
        
        // 6. Parsear ambos
        const expectedSolution = parseERD(decoded); // Usando el decodificado
        const userSolution = parseERD(userContent);
        
        // 7. Comparar
        const errors = compareSolutions(userSolution, expectedSolution);
        
        // 8. Validación personalizada (si existe)
        if (test.customValidation) {
            const customErrors = test.customValidation(encoded, decoded, correctContent);
            errors.push(...customErrors);
        }
        
        // 9. Verificar resultado
        if (errors.length === test.expectedErrors) {
            console.log(`  ${colors.green}✓ PASS - ${errors.length} errores detectados (esperados: ${test.expectedErrors})${colors.reset}`);
            passed++;
        } else {
            console.log(`  ${colors.red}✗ FAIL - ${errors.length} errores detectados, esperados: ${test.expectedErrors}${colors.reset}`);
            if (errors.length > 0 && errors.length <= 10) {
                console.log(`  ${colors.red}Errores encontrados:${colors.reset}`);
                errors.forEach(e => console.log(`    - ${e}`));
            } else if (errors.length > 10) {
                console.log(`  ${colors.red}Primeros 10 errores:${colors.reset}`);
                errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
                console.log(`    ... y ${errors.length - 10} más`);
            }
            failed++;
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
