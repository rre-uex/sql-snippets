// --- 1. THE EXPECTED SOLUTION ---
// This is the "correct answer" the student's work will be checked against.
// You can change this string to whatever your assignment's correct solution is.
const expectedSolutionText = `
    erdiagram Univesidad
    
    entity Estudiante {  
        numExpediente Key
        nombre  
        apellido1  
        apellido2  
    }

    entity Titulacion {
        codTitulacion key
        nombre
    }

    relationship matriculadoEn {
        Estudiante[1..N] -> Titulacion[1..1]
        fechaMatriculacion
    }
    
   weak entity Asignatura {
codAsignatura partial-key //atributo aportado a la clave primaria por la entidad débil Asignatura
nombreAsignatura
}

weak relationship compuestaDe {
Titulacion[1..1] -> Asignatura[1..N]
}

relationship** esMentorDe {
Estudiante[0..1| "Mentor"] -> Estudiante[0..N|"Mentorizado"]
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

    // Clean up text: remove comments and extra whitespace
    const cleanText = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();

    // Regex to find entities (including weak ones)
    const entityRegex = /(weak\s+)?entity\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match;

    // --- Parse Entities ---
    while ((match = entityRegex.exec(cleanText)) !== null) {
        const isWeak = !!match[1];
        const name = match[2];
        const body = match[3];

        const entity = {
            name: name,
            isWeak: isWeak,
            attributes: []
        };

        // Parse attributes within the entity body
        const lines = body.trim().split('\n');
        for (const line of lines) {
            const attrLine = line.trim();
            if (attrLine) {
                // Regex for: name, :type (optional), and classifier (key, partial-key)
                const attrMatch = attrLine.match(/^(\w+)\s*(:\s*\w+)?\s*(key|partial-key|derived)?/);
                if (attrMatch) {
                    entity.attributes.push({
                        name: attrMatch[1],
                        isKey: attrMatch[3] === 'key',
                        isPartialKey: attrMatch[3] === 'partial-key'
                    });
                }
            }
        }
        erd.entities.push(entity);
    }
    
    // --- Parse Relationships ---
    // Regex to find relationships (including weak ones)
    const relRegex = /(weak\s+)?relationship\s+(\w+)\s*\{([\s\S]*?)\}/g;

    while ((match = relRegex.exec(cleanText)) !== null) {
        const isWeak = !!match[1];
        const name = match[2];
        const body = match[3];

        const relationship = {
            name: name,
            isWeak: isWeak,
            links: []
        };

        // Parse links within the relationship body
        const lines = body.trim().split('\n');
        for (const line of lines) {
            const linkLine = line.trim();
            // Regex for: Entity1[cardinality] -> Entity2[cardinality]
            const linkMatch = linkLine.match(/(\w+)\s*(\[.*?\])?\s*->\s*(\w+)\s*(\[.*?\])?/);
            if (linkMatch) {
                relationship.links.push({
                    from: linkMatch[1],
                    fromCardinality: linkMatch[2] ? linkMatch[2].replace(/[\[\]]/g, '') : '1', // Default to 1 if not specified
                    to: linkMatch[3],
                    toCardinality: linkMatch[4] ? linkMatch[4].replace(/[\[\]]/g, '') : '1' // Default to 1 if not specified
                });
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
    
    // Helper to find an item by name
    const findByName = (arr, name) => arr.find(item => item.name === name);

    // --- Check Entities ---
    if (student.entities.length !== expected.entities.length) {
        errors.push(`Problem: Expected ${expected.entities.length} entities, but found ${student.entities.length}.`);
    }

    for (const expEntity of expected.entities) {
        const stuEntity = findByName(student.entities, expEntity.name);
        if (!stuEntity) {
            errors.push(`Missing Entity: The entity "${expEntity.name}" is missing.`);
            continue; // Skip attribute checks if entity is missing
        }

        // Check if weak entity status is correct
        if (expEntity.isWeak && !stuEntity.isWeak) {
            errors.push(`Incorrect Entity Type: The entity "${expEntity.name}" should be marked as weak.`);
        }
        if (!expEntity.isWeak && stuEntity.isWeak) {
            errors.push(`Incorrect Entity Type: The entity "${expEntity.name}" should NOT be marked as weak.`);
        }

        // Check attributes for this entity
        if (expEntity.attributes.length !== stuEntity.attributes.length) {
            errors.push(`Problem in Entity "${expEntity.name}": Expected ${expEntity.attributes.length} attributes, but found ${stuEntity.attributes.length}.`);
        }

        // Check for specific attributes and keys
        for (const expAttr of expEntity.attributes) {
            const stuAttr = findByName(stuEntity.attributes, expAttr.name);
            if (!stuAttr) {
                errors.push(`Missing Attribute in "${expEntity.name}": The attribute "${expAttr.name}" is missing.`);
            } else {
                // Check if key status is correct
                if (expAttr.isKey && !stuAttr.isKey) {
                    errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should be a key.`);
                }
                if (expAttr.isPartialKey && !stuAttr.isPartialKey) {
                     errors.push(`Incorrect Key in "${expEntity.name}": The attribute "${expAttr.name}" should be a partial-key.`);
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

        // Check if weak relationship status is correct
        if (expRel.isWeak && !stuRel.isWeak) {
            errors.push(`Incorrect Relationship Type: The relationship "${expRel.name}" should be marked as weak.`);
        }
        if (!expRel.isWeak && stuRel.isWeak) {
            errors.push(`Incorrect Relationship Type: The relationship "${expRel.name}" should NOT be marked as weak.`);
        }

        // Check cardinality in links (simplified check)
        // A more robust check would compare each link, but this is a good start.
        if (expRel.links.length !== stuRel.links.length) {
            errors.push(`Problem in Relationship "${expRel.name}": Expected ${expRel.links.length} links, but found ${stuRel.links.length}.`);
        } else {
            // Check cardinalities
            for (let i = 0; i < expRel.links.length; i++) {
                const expLink = expRel.links[i];
                const stuLink = stuRel.links[i];
                
                // Check "from" cardinality
                if (expLink.fromCardinality !== stuLink.fromCardinality) {
                    errors.push(`Incorrect Cardinality in "${expRel.name}": Expected ${expLink.from}[${expLink.fromCardinality}] but found ${stuLink.from}[${stuLink.fromCardinality}].`);
                }
                // Check "to" cardinality
                 if (expLink.toCardinality !== stuLink.toCardinality) {
                    errors.push(`Incorrect Cardinality in "${expRel.name}": Expected ${expLink.to}[${expLink.toCardinality}] but found ${stuLink.to}[${stuLink.toCardinality}].`);
                }
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
            resultsDiv.textContent = 'Error: Could not understand your ERD syntax. Please check for typos.';
            resultsDiv.className = 'error';
        }
    });
});