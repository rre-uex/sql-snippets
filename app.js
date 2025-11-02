// --- 1. THE EXPECTED SOLUTION ---
// This is the "correct answer" the student's work will be checked against.
// You can change this string to whatever your assignment's correct solution is.
const expectedSolutionText = `
erdiagram Model
notation=crowsfoot


entity Planeta {
    cod_planeta key
    nombre
    num_lunas
    rotacion_horas
    orbita_dias
}


entity Centro {
    cod_centro key
    nom_centro
    coordenadas
    fecha_creacion
}


relationship esPrincipalEn {
    Centro[1..1] ->Planeta[0..1]
}


relationship ubicadoEn {
    Centro[1..N] ->Planeta[1..1]
}

// Entidad ClaseMineral
entity ClaseMineral {
    cod_clase_mineral key
    nom_clase_mineral
}

relationship relacionadoCon {
    Mineral[0..N] ->Mineral[0..N]
}

relationship agrupaA {
    Mineral[1..N] ->ClaseMineral[1..1]
}


// Entidad Mineral
entity Mineral {
    cod_mineral key
    nom_mineral
    desc_propiedades
}


relationship EncontradoPor {
    Mineral[0..N] -> Centro[0..N]  
    fecha_hallazgo
}


weak entity HistoricoExtraccion {
    fecha partial-key
    cantidad
    attr1
}

weak relationship extraidoPor {
    HistoricoExtraccion[0..N] -> Centro[1..1]     
}

weak relationship incluidoEn {
    HistoricoExtraccion[0..N] -> Mineral[1..1] 
}


weak entity Cargamento {
    cod_cargam partial-key
    fecha_cargam
}

weak relationship almacenadoEn {
    Cargamento[0..N] -> Centro[1..1]     
}

relationship formaParteDe {
    Cargamento[0..N] -> Mineral[1..1]  
    cantidad   
}


entity Vehiculo {
    matricula key
    modelo
}

entity NaveEspacial extends Vehiculo{
    matricula key
    capacidad
}

relationship asignadaA {
   Vehiculo[1..N] -> Planeta[1..1]  
}


weak entity Vuelo {
    fecha_ini partial-key
    hora_ini partial-key
    fecha_fin
    hora_fin
}

weak relationship realizadoPor {
    Vuelo[0..N] -> NaveEspacial[1..1]     
}


relationship transportadoEn {
   Cargamento[1..N] -> Vuelo[0..1]  
}

 relationship origenDe {
    Vuelo[0..N] -> Centro[1..1]     
}

 relationship destinoDe {
    Vuelo[0..N] -> Centro[1..1]     
}

entity Persona{
    numPersonal key
    nombrePersona
    fechaAlta
    puesto
    pasaporte //UNIQUE
}

//parcial,solapada
entity Directivo extends Persona{
    numPersonal key
}

//parcial,solapada
entity Astronauta extends Persona{
    numPersonal key
}

relationship trabajaEn {
    Persona[1..N] -> Centro[1..1]     
}

relationship coordina {
    Directivo[1..1] -> Centro[1..1]
    fecha_coor     
}

relationship pilota {
    Astronauta[1..N] -> Vuelo[0..N]     
}

`;

// --- 2. THE PARSER ---
// This function converts the ERD text into a structured object.
// Note: This is a simplified parser for this specific task.
function parseERD(text) {
    const erd = {
        entities: [],
        relationships: []
    };

    // Clean up text: remove block comments but keep line comments (we need //UNIQUE)
    const cleanText = text.replace(/\/\*[\s\S]*?\*\//g, '').trim();

    // Regex to find entities (including weak ones) with possible preceding comment
    // Captura el comentario de la línea anterior si existe
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
        // Solo si la entidad tiene extends
        if (precedingComment) {
            const specializationMatch = precedingComment.match(/^\s*(parcial|total)(?:\s*,\s*(solapada|disjunta))?\s*$/i);
            if (specializationMatch) {
                // Siempre parseamos el comentario si coincide con el patrón
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
                // Verificar si tiene comentario //UNIQUE
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
            attributes: [] // AÑADIR: array para atributos de la relación
        };

        // Parse links and attributes within the relationship body
        const lines = body.trim().split('\n');
        for (const line of lines) {
            // Limpiar comentarios que no sean parte de la sintaxis
            const linkLine = line.replace(/\/\/(?!UNIQUE).*/g, '').trim();
            // Regex para links - ahora busca TODAS las flechas en la línea
            const arrowCount = (linkLine.match(/->/g) || []).length;
            
            if (arrowCount > 0) {
                // Si hay flechas, parsear cada segmento
                const segments = linkLine.split('->').map(s => s.trim());
                
                for (let i = 0; i < segments.length - 1; i++) {
                    const fromPart = segments[i];
                    const toPart = segments[i + 1];
                    
                    // Extraer entidad y cardinalidad del segmento "from"
                    const fromMatch = fromPart.match(/(\w+)\s*(\[[^\]]*\])?$/);
                    // Extraer entidad y cardinalidad del segmento "to"
                    const toMatch = toPart.match(/^(\w+)\s*(\[[^\]]*\])?/);
                    
                    // Validar que ambos lados de la flecha sean entidades válidas
                    if (!fromMatch || !toMatch) {
                        throw new Error(`Invalid link syntax in relationship "${name}": "${linkLine}". Each arrow (->) must connect two entities.`);
                    }
                    
                    if (fromMatch && toMatch) {
                        // Extraer cardinalidad y rol del formato [cardinalidad | "rol"]
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
                // Si no es un link ni llaves, es un atributo de la relación
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


// --- 3. THE COMPARISON LOGIC ---
// This main function orchestrates all the checks.
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

        // AÑADIR: Verificar atributos de la relación
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

// --- 4. DOM EVENT LISTENERS ---
// This code runs when the page is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const studentTextArea = document.getElementById('studentSolution');
    const compareButton = document.getElementById('compareBtn');
    const resultsDiv = document.getElementById('results');

    // --- Initialize CodeMirror with ERD syntax highlighting ---
    // Define custom ERD mode
    CodeMirror.defineSimpleMode("erd", {
        start: [
            // Keywords
            {regex: /\b(erdiagram|entity|relationship|weak)\b/, token: "keyword"},
            // Attribute types (key, partial-key, derived)
            {regex: /\b(key|partial-key|derived)\b/, token: "attribute"},
            // Cardinality brackets
            {regex: /\[[\d\.\*N|:\w\s"]+\]/, token: "number"},
            // Arrows
            {regex: /->/, token: "operator"},
            // Comments (C++ style)
            {regex: /\/\/.*/, token: "comment"},
            {regex: /\/\*/, token: "comment", next: "comment"},
            // Braces
            {regex: /[{}]/, token: "bracket"},
            // Identifiers (entity names, attribute names, etc.)
            {regex: /[a-zA-Z_]\w*/, token: "variable"}
        ],
        comment: [
            {regex: /.*?\*\//, token: "comment", next: "start"},
            {regex: /.*/, token: "comment"}
        ]
    });

    // Initialize CodeMirror editor
    const editor = CodeMirror.fromTextArea(studentTextArea, {
        mode: "erd",
        theme: "monokai",
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false
    });

    // --- Handle the button click ---
    compareButton.addEventListener('click', () => {
        // 1. Get student's text from CodeMirror editor
        const studentText = editor.getValue();
        if (!studentText) {
            resultsDiv.textContent = 'Please enter your solution first.';
            resultsDiv.className = 'error';
            return;
        }

        try {
            // 2. Parse both solutions
            const studentERD = parseERD(studentText);
            const expectedERD = parseERD(expectedSolutionText);

            // 3. Compare them
            const errors = compareSolutions(studentERD, expectedERD);

            // 4. Display results
            if (errors.length === 0) {
                resultsDiv.textContent = 'Solution is correct! Great job!';
                resultsDiv.className = 'success';
            } else {
                resultsDiv.textContent = 'Found some issues:\n\n- ' + errors.join('\n- ');
                resultsDiv.className = 'error';
            }

        } catch (e) {
            // Handle any parsing errors
            console.error(e);
            resultsDiv.textContent = 'Error: ' + e.message;
            resultsDiv.className = 'error';
        }
    });
});