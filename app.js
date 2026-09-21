// --- 1. THE EXPECTED SOLUTION ---
// This comes from the URL query string parameter 's' (base64 encoded)
let expectedSolutionText = '';

// --- Configuration ---
const CONFIG = {
    MAX_SOLUTION_SIZE: 100000, // 100KB max (encoded)
    MAX_DECODED_SIZE: 200000,  // 200KB max (decoded)
    isDevelopment: typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
    COOKIE_NAME: 'erd_student_solution',
    COOKIE_EXPIRY_DAYS: 30
};

// --- Cookie Helper Functions ---
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') cookie = cookie.substring(1);
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// --- Function to get URL parameters ---
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// --- Function to decode base64 ---
function decodeBase64(str) {
    try {
        const base64Decoded = atob(str);
        return decodeURIComponent(base64Decoded);
    } catch (e) {
        if (CONFIG.isDevelopment) {
            console.error('Error decoding base64:', e);
        }
        return null;
    }
}

// --- Validate ERD content ---
function validateERDContent(content) {
    const lower = content.toLowerCase();
    return lower.includes('erdiagram') || lower.includes('entity') || lower.includes('relationship');
}

// --- Load expected solution from URL ---
function loadExpectedSolution() {
    const encodedSolution = getUrlParameter('s');

    if (!encodedSolution) {
        return {
            success: false,
            errorType: 'missing',
            message: 'No expected parameter found in URL.',
            details: 'This page requires a URL parameter.',
            suggestion: 'Provide a valid URL.'
        };
    }

    if (encodedSolution.length > CONFIG.MAX_SOLUTION_SIZE) {
        return {
            success: false,
            errorType: 'too_large',
            message: 'Parameter is too large.',
            details: `Maximum allowed size is ${CONFIG.MAX_SOLUTION_SIZE} characters (current: ${encodedSolution.length}).`,
            suggestion: 'The encoded parameter exceeds the maximum allowed size.'
        };
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(encodedSolution)) {
        return {
            success: false,
            errorType: 'invalid_format',
            message: 'The parameter is not valid base64.',
            details: 'The parameter contains invalid characters for base64 encoding.',
            suggestion: 'Make sure the URL was correct.'
        };
    }

    const decodedSolution = decodeBase64(encodedSolution);

    if (!decodedSolution) {
        return {
            success: false,
            errorType: 'decode_error',
            message: 'Failed to decode the parameter.',
            details: 'The base64 decoding process failed. The parameter may be corrupted.',
            suggestion: 'Please verify the URL was correct.'
        };
    }

    if (decodedSolution.length > CONFIG.MAX_DECODED_SIZE) {
        return {
            success: false,
            errorType: 'decoded_too_large',
            message: 'Decoded solution is too large.',
            details: `Maximum allowed size is ${CONFIG.MAX_DECODED_SIZE} characters.`,
            suggestion: 'The solution content is too large to process.'
        };
    }

    if (!validateERDContent(decodedSolution)) {
        return {
            success: false,
            errorType: 'invalid_content',
            message: 'Warning: Content does not appear to be valid.',
            details: 'The decoded content does not contain expected keywords.',
            suggestion: 'The content may be encoded incorrectly.',
            isWarning: true
        };
    }

    expectedSolutionText = decodedSolution;

    if (CONFIG.isDevelopment) {
        console.log('Expected solution decoded successfully:', expectedSolutionText.substring(0, 100) + '...');
        console.log('Solution length:', decodedSolution.length, 'characters');
    }

    return {
        success: true,
        message: 'Expected solution loaded successfully!',
        details: `Loaded ${decodedSolution.length} characters.`
    };
}


// --- 2. THE PARSER ---
// Adaptado a la sintaxis actual de bigER:
//   - jerarquias como elemento propio del modelo:
//         hierarchy <nombre> <EntidadBase> <total|partial> [disjoint|overlapping]
//   - extends apunta a una jerarquia, no a una entidad
//   - entidades y relaciones asociativas: associative entity / associative relationship
//   - unique es palabra clave del lenguaje (antes era el comentario //UNIQUE)
//
// derived, multivalued y optional se reconocen para que el parser no se
// atasque si aparecen, pero no se evaluan: no forman parte de lo que se
// ensena en la asignatura.

const ATTRIBUTE_TYPES = ['partial-key', 'multivalued', 'optional', 'derived', 'unique', 'key', 'none'];
const VISIBILITY = ['public', 'private', 'protected', 'package'];

// Comentario de especializacion de la sintaxis antigua (//parcial,disjunta)
const LEGACY_SPECIALIZATION = /^\s*\/\/\s*(parcial|total)\s*(?:,\s*(solapada|disjunta))?\s*$/im;

/**
 * Elimina comentarios de bloque y de linea, salvo //UNIQUE, que se conserva
 * por compatibilidad con soluciones escritas con la sintaxis anterior.
 * Limpiar antes de buscar entidades evita que una palabra como "entity"
 * dentro de un comentario produzca un elemento fantasma.
 */
function stripComments(text) {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/(?!\s*UNIQUE\b).*$/gim, '');
}

/**
 * Parsea una linea de atributo. Admite visibilidad, tipo de dato con
 * tamano (VARCHAR(20)) y el tipo de atributo al final.
 * Devuelve null si la linea no es un atributo.
 */
function parseAttributeLine(rawLine) {
    const legacyUnique = /\/\/\s*UNIQUE\b/i.test(rawLine);
    const line = rawLine.replace(/\/\/.*$/, '').trim();

    if (!line || /[{}]/.test(line) || line.includes('->')) {
        return null;
    }

    const visibility = VISIBILITY.concat(['\\+', '-', '#', '~']).join('|');
    const types = ATTRIBUTE_TYPES.join('|');

    const attrRegex = new RegExp(
        '^(?:(' + visibility + ')\\s*)?' +
        '(\\w+)' +
        '(?:\\s*:\\s*(\\w+(?:\\s*\\([^)]*\\))?))?' +
        '(?:\\s+(' + types + '))?' +
        '\\s*$',
        'i'
    );

    const m = line.match(attrRegex);
    if (!m) return null;

    const type = m[4] ? m[4].toLowerCase() : null;

    return {
        name: m[2],
        datatype: m[3] ? m[3].replace(/\s+/g, '') : null,
        isKey: type === 'key',
        isPartialKey: type === 'partial-key',
        isUnique: type === 'unique' || legacyUnique
    };
}

/**
 * Convierte el texto ERD en un objeto estructurado.
 */
function parseERD(text) {
    const erd = {
        entities: [],
        relationships: [],
        hierarchies: [],
        usesLegacySpecialization: LEGACY_SPECIALIZATION.test(text)
    };

    const cleanText = stripComments(text);
    let match;

    // --- Hierarchies ---
    const hierarchyRegex = /\bhierarchy\s+(\w+)\s+(\w+)\s+(total|partial)(?:\s+(disjoint|overlapping))?/gi;

    while ((match = hierarchyRegex.exec(cleanText)) !== null) {
        erd.hierarchies.push({
            name: match[1],
            base: match[2],
            completeness: match[3].toLowerCase(),
            constraint: match[4] ? match[4].toLowerCase() : null
        });
    }

    // --- Entities ---
    const entityRegex = /(?:\b(weak|associative)\s+)?\bentity\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([\s\S]*?)\}/g;

    while ((match = entityRegex.exec(cleanText)) !== null) {
        const modifier = match[1] ? match[1].toLowerCase() : null;

        const entity = {
            name: match[2],
            isWeak: modifier === 'weak',
            isAssociative: modifier === 'associative',
            extendsHierarchy: match[3] || null,
            attributes: []
        };

        for (const line of match[4].split('\n')) {
            const attr = parseAttributeLine(line);
            if (attr) entity.attributes.push(attr);
        }

        erd.entities.push(entity);
    }

    // --- Relationships ---
    const relRegex = /(?:\b(weak|associative)\s+)?\brelationship\s+(\w+)\s*\{([\s\S]*?)\}/g;

    while ((match = relRegex.exec(cleanText)) !== null) {
        const modifier = match[1] ? match[1].toLowerCase() : null;

        const relationship = {
            name: match[2],
            isWeak: modifier === 'weak',
            isAssociative: modifier === 'associative',
            links: [],
            attributes: []
        };

        for (const rawLine of match[3].split('\n')) {
            const linkLine = rawLine.replace(/\/\/.*$/, '').trim();

            if (!linkLine || /^[{}]$/.test(linkLine)) continue;

            if (linkLine.includes('->')) {
                const segments = linkLine.split('->').map(s => s.trim());

                for (let i = 0; i < segments.length - 1; i++) {
                    const fromMatch = segments[i].match(/(\w+)\s*(\[[^\]]*\])?$/);
                    const toMatch = segments[i + 1].match(/^(\w+)\s*(\[[^\]]*\])?/);

                    if (!fromMatch || !toMatch) {
                        throw new Error(`The relationship "${relationship.name}" has a malformed line: "${linkLine}". Each arrow (->) must connect two entities, for example: Estudiante[1..1] -> Matricula[1..N]`);
                    }

                    const parseCardinalityAndRole = (bracketContent) => {
                        if (!bracketContent) return { cardinality: '1', role: null };
                        const cleaned = bracketContent.replace(/[[\]]/g, '');
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
            } else {
                const attr = parseAttributeLine(rawLine);
                if (attr) relationship.attributes.push(attr);
            }
        }

        erd.relationships.push(relationship);
    }

    return erd;
}


// --- 3. HELPERS SOBRE EL MODELO ---

/** Subclases declaradas en una jerarquia, ordenadas alfabeticamente. */
function subclassesOf(erd, hierarchyName) {
    return erd.entities
        .filter(e => e.extendsHierarchy === hierarchyName)
        .map(e => e.name)
        .sort();
}

/** Entidad base de la jerarquia a la que pertenece una entidad, o null. */
function superclassOf(erd, entity) {
    if (!entity.extendsHierarchy) return null;
    const h = erd.hierarchies.find(x => x.name === entity.extendsHierarchy);
    return h ? h.base : null;
}

/** Propiedades de una jerarquia en texto: "total disjoint", "partial"... */
function hierarchyProps(hierarchy) {
    return hierarchy.constraint
        ? `${hierarchy.completeness} ${hierarchy.constraint}`
        : hierarchy.completeness;
}

function listOrNone(arr) {
    return arr.length ? arr.join(', ') : 'none';
}

/** Identifica una jerarquia por su contenido, no por su nombre interno. */
function describeHierarchy(erd, hierarchy) {
    const subs = subclassesOf(erd, hierarchy.name);
    return `hierarchy over "${hierarchy.base}" with subclasses [${listOrNone(subs)}]`;
}

/** Entidades distintas que participan en una relacion. */
function endpointsOf(relationship) {
    return relationship.links
        .flatMap(l => [l.from, l.to])
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();
}

/** Descripcion de un extremo de enlace, con cardinalidad y rol. */
function describeEndpoint(entity, cardinality, role) {
    return role
        ? `${entity}[${cardinality} | "${role}"]`
        : `${entity}[${cardinality}]`;
}

function sameSet(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}


// --- 4. THE COMPARISON LOGIC ---
function compareSolutions(student, expected) {
    const errors = [];
    const findByName = (arr, name) => arr.find(item => item.name === name);

    // Aviso de migracion: sintaxis antigua de especializacion por comentario
    if (student.usesLegacySpecialization) {
        errors.push('Outdated syntax: specialization is no longer written as a comment such as //parcial,disjunta. Declare a hierarchy instead, for example: hierarchy h_persona Persona total disjoint');
    }

    // ============================================================
    // ENTIDADES
    // ============================================================

    const expEntityNames = expected.entities.map(e => e.name);
    const stuEntityNames = student.entities.map(e => e.name);

    for (const name of expEntityNames.filter(n => !stuEntityNames.includes(n))) {
        errors.push(`Missing entity: "${name}" is not declared.`);
    }
    for (const name of stuEntityNames.filter(n => !expEntityNames.includes(n))) {
        errors.push(`Unexpected entity: "${name}" should not be part of this model.`);
    }

    for (const expEntity of expected.entities) {
        const stuEntity = findByName(student.entities, expEntity.name);
        if (!stuEntity) continue;

        if (expEntity.isWeak !== stuEntity.isWeak) {
            errors.push(expEntity.isWeak
                ? `Entity "${expEntity.name}": should be declared as "weak entity", because it does not have an identifier of its own.`
                : `Entity "${expEntity.name}": should be a normal entity, not a weak one.`);
        }

        if (expEntity.isAssociative !== stuEntity.isAssociative) {
            errors.push(expEntity.isAssociative
                ? `Entity "${expEntity.name}": should be declared as "associative entity", because it represents a relationship promoted to an entity.`
                : `Entity "${expEntity.name}": should be a normal entity, not an associative one.`);
        }

        // Herencia: se compara la superclase resuelta a traves de la jerarquia,
        // no el nombre de la jerarquia, que el alumno elige libremente
        const expSuper = superclassOf(expected, expEntity);
        const stuSuper = superclassOf(student, stuEntity);

        if (stuEntity.extendsHierarchy && stuSuper === null) {
            errors.push(`Entity "${stuEntity.name}": extends "${stuEntity.extendsHierarchy}", but no hierarchy with that name is declared. Remember that "extends" must reference a hierarchy, not an entity.`);
        } else if (expSuper !== stuSuper) {
            if (expSuper && !stuSuper) {
                errors.push(`Entity "${expEntity.name}": should be a subclass of "${expSuper}", declared through a hierarchy.`);
            } else if (!expSuper && stuSuper) {
                errors.push(`Entity "${expEntity.name}": should not be a subclass of anything, but it is a subclass of "${stuSuper}".`);
            } else {
                errors.push(`Entity "${expEntity.name}": should be a subclass of "${expSuper}", but it is a subclass of "${stuSuper}".`);
            }
        }

        // Atributos
        const expAttrNames = expEntity.attributes.map(a => a.name);
        const stuAttrNames = stuEntity.attributes.map(a => a.name);

        for (const name of expAttrNames.filter(n => !stuAttrNames.includes(n))) {
            errors.push(`Entity "${expEntity.name}": the attribute "${name}" is missing.`);
        }
        for (const name of stuAttrNames.filter(n => !expAttrNames.includes(n))) {
            errors.push(`Entity "${expEntity.name}": the attribute "${name}" should not be there.`);
        }

        for (const expAttr of expEntity.attributes) {
            const stuAttr = findByName(stuEntity.attributes, expAttr.name);
            if (!stuAttr) continue;

            const where = `Entity "${expEntity.name}", attribute "${expAttr.name}"`;

            if (expAttr.isKey !== stuAttr.isKey) {
                errors.push(expAttr.isKey
                    ? `${where}: should be marked as "key".`
                    : `${where}: should not be marked as "key".`);
            }
            if (expAttr.isPartialKey !== stuAttr.isPartialKey) {
                errors.push(expAttr.isPartialKey
                    ? `${where}: should be marked as "partial-key", since it identifies the entity together with its owner.`
                    : `${where}: should not be marked as "partial-key".`);
            }
            if (expAttr.isUnique !== stuAttr.isUnique) {
                errors.push(expAttr.isUnique
                    ? `${where}: should be marked as "unique".`
                    : `${where}: should not be marked as "unique".`);
            }
        }
    }

    // ============================================================
    // JERARQUIAS
    // Se emparejan por entidad base y conjunto de subclases, no por
    // nombre: el nombre es un identificador interno que el alumno elige
    // libremente y que no se representa en el diagrama.
    // ============================================================

    const matchedHierarchies = new Set();

    for (const expHier of expected.hierarchies) {
        const expSubs = subclassesOf(expected, expHier.name);
        const where = `Hierarchy over "${expHier.base}" [${listOrNone(expSubs)}]`;

        const stuHier = student.hierarchies.find(h =>
            !matchedHierarchies.has(h) &&
            h.base === expHier.base &&
            sameSet(subclassesOf(student, h.name), expSubs)
        );

        if (!stuHier) {
            // Emparejamiento laxo por entidad base, para dar un mensaje util
            const sameBase = student.hierarchies.find(h =>
                !matchedHierarchies.has(h) && h.base === expHier.base
            );

            if (sameBase) {
                matchedHierarchies.add(sameBase);
                const stuSubs = subclassesOf(student, sameBase.name);
                errors.push(`Hierarchy over "${expHier.base}": expected the subclasses [${listOrNone(expSubs)}] but found [${listOrNone(stuSubs)}]. Each subclass must be declared with "extends ${sameBase.name}".`);
            } else {
                errors.push(`Missing hierarchy: there should be a ${describeHierarchy(expected, expHier)}, declared as "${hierarchyProps(expHier)}".`);
            }
            continue;
        }

        matchedHierarchies.add(stuHier);

        if (expHier.completeness !== stuHier.completeness) {
            const reason = expHier.completeness === 'total'
                ? 'every instance of the superclass must belong to one of the subclasses'
                : 'an instance of the superclass may belong to none of the subclasses';
            errors.push(`${where}: should be "${expHier.completeness}" instead of "${stuHier.completeness}", because ${reason}.`);
        } else if (expHier.constraint !== stuHier.constraint) {
            if (expHier.constraint && !stuHier.constraint) {
                errors.push(`${where}: "${expHier.completeness}" is correct, but "${expHier.constraint}" is missing. With two or more subclasses the constraint must always be stated.`);
            } else if (!expHier.constraint && stuHier.constraint) {
                errors.push(`${where}: should be only "${expHier.completeness}", without "${stuHier.constraint}". With a single subclass there is nothing that can overlap or be disjoint.`);
            } else {
                const reason = expHier.constraint === 'disjoint'
                    ? 'an instance cannot belong to more than one subclass at the same time'
                    : 'an instance may belong to more than one subclass at the same time';
                errors.push(`${where}: should be "${expHier.constraint}" instead of "${stuHier.constraint}", because ${reason}.`);
            }
        }
    }

    for (const stuHier of student.hierarchies) {
        if (!matchedHierarchies.has(stuHier)) {
            errors.push(`Unexpected hierarchy: there should not be a ${describeHierarchy(student, stuHier)}.`);
        }
    }

    // ============================================================
    // RELACIONES
    // Las normales se emparejan por nombre, porque el nombre se representa
    // en el diagrama. Las asociativas se emparejan por las entidades que
    // conectan, porque su nombre no se dibuja y el alumno lo elige libremente.
    // ============================================================

    const expNormalRels = expected.relationships.filter(r => !r.isAssociative);
    const stuNormalRels = student.relationships.filter(r => !r.isAssociative);
    const expAssocRels = expected.relationships.filter(r => r.isAssociative);
    const stuAssocRels = student.relationships.filter(r => r.isAssociative);

    const checkLinks = (expRel, stuRel, where) => {
        if (expRel.links.length !== stuRel.links.length) {
            errors.push(`${where}: expected ${expRel.links.length} connection(s) between entities, but found ${stuRel.links.length}.`);
            return;
        }

        for (const expLink of expRel.links) {
            const matchingLink = stuRel.links.find(stuLink => {
                const normalMatch =
                    stuLink.from === expLink.from &&
                    stuLink.to === expLink.to &&
                    stuLink.fromCardinality === expLink.fromCardinality &&
                    stuLink.toCardinality === expLink.toCardinality &&
                    stuLink.fromRole === expLink.fromRole &&
                    stuLink.toRole === expLink.toRole;

                const reverseMatch =
                    stuLink.from === expLink.to &&
                    stuLink.to === expLink.from &&
                    stuLink.fromCardinality === expLink.toCardinality &&
                    stuLink.toCardinality === expLink.fromCardinality &&
                    stuLink.fromRole === expLink.toRole &&
                    stuLink.toRole === expLink.fromRole;

                return normalMatch || reverseMatch;
            });

            if (matchingLink) continue;

            // Se busca un enlace entre las mismas entidades para poder decir
            // exactamente que es lo que no cuadra
            const sameEntities = stuRel.links.find(l =>
                (l.from === expLink.from && l.to === expLink.to) ||
                (l.from === expLink.to && l.to === expLink.from)
            );

            const expDesc = `${describeEndpoint(expLink.from, expLink.fromCardinality, expLink.fromRole)} -> ${describeEndpoint(expLink.to, expLink.toCardinality, expLink.toRole)}`;

            if (sameEntities) {
                const stuDesc = `${describeEndpoint(sameEntities.from, sameEntities.fromCardinality, sameEntities.fromRole)} -> ${describeEndpoint(sameEntities.to, sameEntities.toCardinality, sameEntities.toRole)}`;
                errors.push(`${where}: the connection between "${expLink.from}" and "${expLink.to}" is not correct. Expected ${expDesc} but found ${stuDesc}.`);
            } else {
                errors.push(`${where}: there should be a connection ${expDesc}.`);
            }
        }
    };

    const checkRelAttributes = (expRel, stuRel, where) => {
        const expNames = expRel.attributes.map(a => a.name);
        const stuNames = stuRel.attributes.map(a => a.name);

        for (const name of expNames.filter(n => !stuNames.includes(n))) {
            errors.push(`${where}: the attribute "${name}" is missing.`);
        }
        for (const name of stuNames.filter(n => !expNames.includes(n))) {
            errors.push(`${where}: the attribute "${name}" should not be there.`);
        }
    };

    // --- Relaciones normales, emparejadas por nombre ---
    const expNormalNames = expNormalRels.map(r => r.name);
    const stuNormalNames = stuNormalRels.map(r => r.name);

    for (const name of stuNormalNames.filter(n => !expNormalNames.includes(n))) {
        const stuRel = findByName(stuNormalRels, name);
        const ends = endpointsOf(stuRel);
        const belongsToAssoc = expAssocRels.some(r => sameSet(endpointsOf(r), ends));

        // Si coincide con una asociativa esperada, el error real es el tipo,
        // y se informa mas abajo al tratar las asociativas
        if (!belongsToAssoc) {
            errors.push(`Unexpected relationship: "${name}" should not be part of this model.`);
        }
    }

    for (const expRel of expNormalRels) {
        const where = `Relationship "${expRel.name}"`;
        let stuRel = findByName(stuNormalRels, expRel.name);

        if (!stuRel) {
            const misclassified = findByName(stuAssocRels, expRel.name);
            if (misclassified) {
                errors.push(`${where}: should be a normal relationship, not an associative one. Only the relationships that identify an associative entity are declared with "associative relationship".`);
                stuRel = misclassified;
            } else {
                errors.push(`Missing relationship: "${expRel.name}" is not declared.`);
                continue;
            }
        }

        if (expRel.isWeak !== stuRel.isWeak) {
            errors.push(expRel.isWeak
                ? `${where}: should be declared as "weak relationship", because it links a weak entity with its owner.`
                : `${where}: should be a normal relationship, not a weak one.`);
        }

        checkLinks(expRel, stuRel, where);
        checkRelAttributes(expRel, stuRel, where);
    }

    // --- Relaciones asociativas, emparejadas por las entidades que conectan ---
    const matchedAssocRels = new Set();

    for (const expRel of expAssocRels) {
        const expEnds = endpointsOf(expRel);
        const where = `Associative relationship between ${expEnds.join(' and ')}`;

        const stuRel = stuAssocRels.find(r =>
            !matchedAssocRels.has(r) && sameSet(endpointsOf(r), expEnds)
        );

        if (!stuRel) {
            const misclassified = stuNormalRels.find(r => sameSet(endpointsOf(r), expEnds));

            if (misclassified) {
                errors.push(`Relationship "${misclassified.name}": should be declared as "associative relationship", because it connects the associative entity with one of the entities that identify it.`);
            } else {
                errors.push(`Missing associative relationship: there should be one connecting ${expEnds.join(' and ')}.`);
            }
            continue;
        }

        matchedAssocRels.add(stuRel);
        checkLinks(expRel, stuRel, where);
        checkRelAttributes(expRel, stuRel, where);
    }

    for (const stuRel of stuAssocRels) {
        if (!matchedAssocRels.has(stuRel)) {
            const ends = endpointsOf(stuRel);
            errors.push(`Unexpected associative relationship: "${stuRel.name}" connects ${ends.join(' and ')} and should not be part of this model.`);
        }
    }

    return errors;
}


// --- 5. UI INITIALISATION ---
function initErdChecker() {
    const studentTextArea = document.getElementById('studentSolution');
    const checkButton = document.getElementById('checkBtn');
    const submitButton = document.getElementById('submitBtn');
    const resultsDiv = document.getElementById('results');
    const loadStatusDiv = document.getElementById('loadStatus');

    function displayLoadStatus(result) {
        loadStatusDiv.innerHTML = '';

        if (!result.success) {
            studentTextArea.style.display = 'none';
            checkButton.disabled = true;
            submitButton.disabled = true;

            const icon = result.isWarning ? '⚠️' : '❌';
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '8px';
            title.textContent = `${icon} ${result.message}`;

            const details = document.createElement('div');
            details.style.fontSize = '13px';
            details.style.marginTop = '4px';
            details.textContent = result.details || '';

            if (result.suggestion) {
                const suggestion = document.createElement('div');
                suggestion.style.fontSize = '13px';
                suggestion.style.marginTop = '8px';
                suggestion.style.paddingTop = '8px';
                suggestion.style.borderTop = '1px solid #ccc';
                suggestion.innerHTML = `<strong>Suggestion:</strong> ${result.suggestion}`;
                loadStatusDiv.appendChild(title);
                loadStatusDiv.appendChild(details);
                loadStatusDiv.appendChild(suggestion);
            } else {
                loadStatusDiv.appendChild(title);
                loadStatusDiv.appendChild(details);
            }

            loadStatusDiv.className = result.isWarning ? 'warning' : 'error';

            if (!result.isWarning) {
                submitButton.disabled = true;
            }
        }
    }

    const loadResult = loadExpectedSolution();
    displayLoadStatus(loadResult);

    if (!loadResult.success && !loadResult.isWarning) {
        return;
    }

    // Get the message from iframe document
    window.addEventListener('message', function (event) {
        console.log('Message received: ', event.data);
        if (event.origin !== 'https://campusvirtual.unex.es') return;

        if (event.source === window.parent) {
            console.log('Parent received message:', event.data);
            const submitBt = document.getElementById("submitBtn");
            submitBt.hidden = false;
        }
    });

    // ping the window.parent in case loaded in an iframe
    const message = { type: 'ping' };
    window.parent.postMessage(message, '*');

    // --- CodeMirror con resaltado de la sintaxis actual ---
    // derived, multivalued y optional no se resaltan: no se usan en la
    // asignatura y no conviene sugerir que forman parte de lo que se pide
    CodeMirror.defineSimpleMode("erd", {
        start: [
            {regex: /\b(erdiagram|notation|entity|relationship|hierarchy|weak|associative|extends)\b/, token: "keyword"},
            {regex: /\b(total|partial|disjoint|overlapping)\b/, token: "def"},
            {regex: /\b(key|partial-key|unique)\b/, token: "attribute"},
            {regex: /\[[\d.*N|:\w\s"]+\]/, token: "number"},
            {regex: /->/, token: "operator"},
            {regex: /\/\/.*/, token: "comment"},
            {regex: /\/\*/, token: "comment", next: "comment"},
            {regex: /[{}]/, token: "bracket"},
            {regex: /[a-zA-Z_]\w*/, token: "variable"}
        ],
        comment: [
            {regex: /.*?\*\//, token: "comment", next: "start"},
            {regex: /.*/, token: "comment"}
        ]
    });

    const editor = CodeMirror.fromTextArea(studentTextArea, {
        mode: "erd",
        theme: "monokai",
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false
    });

    const savedSolution = getCookie(CONFIG.COOKIE_NAME);
    if (savedSolution) {
        editor.setValue(savedSolution);
        if (CONFIG.isDevelopment) {
            console.log('Loaded saved solution from cookie');
        }
    }

    // --- Check button ---
    checkButton.addEventListener('click', () => {
        const studentText = editor.getValue();
        if (!studentText) {
            resultsDiv.textContent = 'Please enter your solution first.';
            resultsDiv.className = 'error';
            submitButton.disabled = true;
            return;
        }

        try {
            const studentERD = parseERD(studentText);
            const expectedERD = parseERD(expectedSolutionText);

            if (CONFIG.isDevelopment) {
                console.log('Student ERD:', studentERD);
                console.log('Expected ERD:', expectedERD);
            }

            const errors = compareSolutions(studentERD, expectedERD);

            if (errors.length === 0) {
                resultsDiv.textContent = '✓ Solution is correct! Great job!';
                resultsDiv.className = 'success';
                submitButton.disabled = false;
            } else {
                const heading = errors.length === 1
                    ? 'Found 1 issue:'
                    : `Found ${errors.length} issues:`;
                resultsDiv.textContent = heading + '\n\n- ' + errors.join('\n- ');
                resultsDiv.className = 'error';
                submitButton.disabled = true;
            }

        } catch (e) {
            if (CONFIG.isDevelopment) {
                console.error('Parsing error:', e);
            }
            resultsDiv.textContent = '❌ Your solution could not be read:\n\n' + e.message + '\n\nFix the syntax and try again.';
            resultsDiv.className = 'error';
            submitButton.disabled = true;
        }
    });

    // --- Submit button ---
    submitButton.addEventListener('click', () => {
        const studentText = editor.getValue();
        setCookie(CONFIG.COOKIE_NAME, studentText, CONFIG.COOKIE_EXPIRY_DAYS);

        if (CONFIG.isDevelopment) {
            console.log('Student solution saved to cookie');
        }

        const hash = CryptoJS.MD5(expectedSolutionText.trim()).toString();
        console.log("MD5 Hash of Solution:", hash);
        const message = { type: 'md5', hash: hash };
        window.parent.postMessage(message, 'https://campusvirtual.unex.es');
    });
}

// En el navegador el checker arranca con el DOM.
// En Node no hay document, y el fichero se limita a exportar el parser y
// la comparacion para que los tests usen exactamente el mismo codigo.
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initErdChecker);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseERD, compareSolutions };
}
