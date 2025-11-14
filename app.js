// --- 1. THE EXPECTED SOLUTION ---
// This comes from the URL query string parameter 'solution' (base64 encoded)
let expectedSolutionText = '';

// --- Configuration ---
const CONFIG = {
    MAX_SOLUTION_SIZE: 100000, // 100KB max (encoded)
    MAX_DECODED_SIZE: 200000,  // 200KB max (decoded)
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
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
        // Primero decodificamos de base64 a string
        const base64Decoded = atob(str);
        // Luego decodificamos el URI encoding
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
    // Check if it looks like an ERD diagram
    const hasERDiagram = content.toLowerCase().includes('erdiagram');
    const hasEntity = content.toLowerCase().includes('entity');
    const hasRelationship = content.toLowerCase().includes('relationship');
    
    return hasERDiagram || hasEntity || hasRelationship;
}

// --- Load expected solution from URL ---
function loadExpectedSolution() {
    const encodedSolution = getUrlParameter('s');
    
    // Validation 1: Check if parameter exists
    if (!encodedSolution) {
        return {
            success: false,
            errorType: 'missing',
            message: 'No expected parameter found in URL.',
            details: 'This page requires a URL parameter.',
      //      details: 'This page requires a base64-encoded ERD solution in the URL parameter "solution".',
            suggestion: 'Provide a valid URL.'
        };
    }
    
    // Validation 2: Check parameter size (prevent DoS)
    if (encodedSolution.length > CONFIG.MAX_SOLUTION_SIZE) {
        return {
            success: false,
            errorType: 'too_large',
            message: 'Parameter is too large.',
            details: `Maximum allowed size is ${CONFIG.MAX_SOLUTION_SIZE} characters (current: ${encodedSolution.length}).`,
            suggestion: 'The encoded parameter exceeds the maximum allowed size.'
        };
    }
    
    // Validation 3: Check if it's valid base64
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
    
    // Validation 4: Try to decode
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
    
    // Validation 5: Check decoded size
    if (decodedSolution.length > CONFIG.MAX_DECODED_SIZE) {
        return {
            success: false,
            errorType: 'decoded_too_large',
            message: 'Decoded solution is too large.',
            details: `Maximum allowed size is ${CONFIG.MAX_DECODED_SIZE} characters.`,
            suggestion: 'The solution content is too large to process.'
        };
    }
    
    // Validation 6: Check if it looks like an ERD
    if (!validateERDContent(decodedSolution)) {
        return {
            success: false,
            errorType: 'invalid_content',
            message: 'Warning: Content does not appear to be valid.',
            details: 'The decoded content does not contain expected keywords.',
            suggestion: 'The content may be encoded incorrectly.',
            isWarning: true // This is a warning, not a hard error
        };
    }
    
    // All validations passed!
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
    const checkButton = document.getElementById('checkBtn');
    const submitButton = document.getElementById('submitBtn');
    const resultsDiv = document.getElementById('results');
    const loadStatusDiv = document.getElementById('loadStatus');

    // --- Helper function to display load status ---
    function displayLoadStatus(result) {
        loadStatusDiv.innerHTML = ''; // Clear previous content
        
        if (!result.success) {
            // Hide controls
            studentTextArea.style.display = 'none';
            checkButton.disabled = true;
            submitButton.disabled = true;
            // Error display
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
            
            // Disable button if it's a hard error (not just a warning)
            if (!result.isWarning) {
                //checkButton.disabled = true;
                submitButton.disabled = true;
            }
        } 
        /*
        else {
            // Success display
            const icon = '✓';
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.textContent = `${icon} ${result.message}`;
            
            if (result.details) {
                const details = document.createElement('div');
                details.style.fontSize = '13px';
                details.style.marginTop = '4px';
                details.style.opacity = '0.8';
                details.textContent = result.details;
                loadStatusDiv.appendChild(title);
                loadStatusDiv.appendChild(details);
            } else {
                loadStatusDiv.appendChild(title);
            }
            
            loadStatusDiv.className = 'success';
        } */
    }

    // --- Load expected solution from URL ---
    const loadResult = loadExpectedSolution();
    displayLoadStatus(loadResult);
    
    // Stop here if loading failed (and it's not just a warning)
    if (!loadResult.success && !loadResult.isWarning) {
        return;
    }

//Get the message from iframe document
    window.addEventListener('message', function (event) {
        console.log('Message received: ', event.data);
        // Very important: check the origin of the message in production!
        if (event.origin !== 'https://campusvirtual.unex.es') return;

        if (event.source === this.window.parent) {
            console.log('Parent received message:', event.data);

            const submitBt = document.getElementById("submitBtn");
            submitBt.hidden = false;//event.data;
        }
    });

    //ping the window.parent in case loaded in a iframe    
    const message = { type: 'ping' };
    window.parent.postMessage(message, '*');

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

    // --- Load saved solution from cookie if exists ---
    const savedSolution = getCookie(CONFIG.COOKIE_NAME);
    if (savedSolution) {
        editor.setValue(savedSolution);
        if (CONFIG.isDevelopment) {
            console.log('Loaded saved solution from cookie');
        }
    }

    // --- Handle the Check button click ---
    checkButton.addEventListener('click', () => {
        // 1. Get student's text from CodeMirror editor
        const studentText = editor.getValue();
        if (!studentText) {
            resultsDiv.textContent = 'Please enter your solution first.';
            resultsDiv.className = 'error';
            submitButton.disabled = true;
            return;
        }

        try {
            // 2. Parse both solutions
            const studentERD = parseERD(studentText);
            const expectedERD = parseERD(expectedSolutionText);

            if (CONFIG.isDevelopment) {
                console.log('Student ERD:', studentERD);
                console.log('Expected ERD:', expectedERD);
            }

            // 3. Compare them
            const errors = compareSolutions(studentERD, expectedERD);

            // 4. Display results and enable/disable Submit button
            if (errors.length === 0) {
                resultsDiv.textContent = '✓ Solution is correct! Great job!';
                resultsDiv.className = 'success';
                submitButton.disabled = false; // Enable submit button on success
            } else {
                resultsDiv.textContent = 'Found some issues:\n\n- ' + errors.join('\n- ');
                resultsDiv.className = 'error';
                submitButton.disabled = true; // Keep submit button disabled on error
            }

        } catch (e) {
            // Handle any parsing errors
            if (CONFIG.isDevelopment) {
                console.error('Parsing error:', e);
            }
            resultsDiv.textContent = '❌ Error parsing your solution:\n\n' + e.message + '\n\nPlease check your ERD syntax.';
            resultsDiv.className = 'error';
            submitButton.disabled = true; // Keep submit button disabled on error
        }
    });

    // --- Handle the Submit button click ---
    submitButton.addEventListener('click', () => {
        // Save the student solution to cookie
        const studentText = editor.getValue();
        setCookie(CONFIG.COOKIE_NAME, studentText, CONFIG.COOKIE_EXPIRY_DAYS);
        
        if (CONFIG.isDevelopment) {
            console.log('Student solution saved to cookie');
        }
        
        const hash = CryptoJS.MD5(expectedSolutionText.trim()).toString(); // Calculate MD5 hash
        console.log("MD5 Hash of Solution:", hash); // Log the hash
        //console.log(tableString.trim()); // Log the hash
        const message = { type: 'md5', hash: hash };
        window.parent.postMessage(message, 'https://campusvirtual.unex.es'); //Send MD5 hash to parent window
    });
});
