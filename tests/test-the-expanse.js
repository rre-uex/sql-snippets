/**
 * Test Suite for ERD Checker - The Expanse Tests
 * 
 * This test file validates that the ERD checker correctly identifies
 * correct and incorrect ERD diagrams for The Expanse domain.
 * 
 * Uses the REAL parser from app.js to ensure consistency
 * with the actual application.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Import REAL parser from app.js
// ============================================================================
const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Extract parseERD function (complete implementation)
const parseERDStart = appCode.indexOf('function parseERD(text) {');
const parseERDEnd = appCode.indexOf('\n}', parseERDStart) + 2;
const parseERDCode = appCode.substring(parseERDStart, parseERDEnd);
eval(parseERDCode);

// Extract compareSolutions function (complete implementation with new error messages)
const compareSolutionsStart = appCode.indexOf('function compareSolutions(student, expected) {');
let braceCount = 0;
let inFunction = false;
let actualEnd = compareSolutionsStart;
for (let i = compareSolutionsStart; i < appCode.length; i++) {
    if (appCode[i] === '{') {
        braceCount++;
        inFunction = true;
    } else if (appCode[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
            actualEnd = i + 1;
            break;
        }
    }
}
const compareSolutionsCode = appCode.substring(compareSolutionsStart, actualEnd);
eval(compareSolutionsCode);

// Extract helper functions
const createErrorMessageStart = appCode.indexOf('function createErrorMessage(');
if (createErrorMessageStart !== -1) {
    const createErrorMessageEnd = appCode.indexOf('\n}', createErrorMessageStart) + 2;
    eval(appCode.substring(createErrorMessageStart, createErrorMessageEnd));
}

const formatCodeStart = appCode.indexOf('function formatCode(');
if (formatCodeStart !== -1) {
    const formatCodeEnd = appCode.indexOf('\n}', formatCodeStart) + 2;
    eval(appCode.substring(formatCodeStart, formatCodeEnd));
}

// ============================================================================
// Test Runner
// ============================================================================

function runTest(testName, expectedSolution, studentSolution, shouldPass = false) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${testName}`);
    console.log('='.repeat(70));
    
    try {
        const expectedERD = parseERD(expectedSolution);
        const studentERD = parseERD(studentSolution);
        const errors = compareSolutions(studentERD, expectedERD);
        
        if (shouldPass) {
            if (errors.length === 0) {
                console.log(`✅ PASSED\n`);
                console.log(`Expected output:\n✓ Solution is correct! Great job!\n`);
                return true;
            } else {
                console.log(`❌ FAILED\n`);
                console.log(`Expected: No errors`);
                console.log(`Got: ${errors.length} errors:`);
                errors.forEach(err => console.log(`  - ${err}`));
                return false;
            }
        } else {
            if (errors.length > 0) {
                console.log(`✅ PASSED\n`);
                console.log(`Expected output:\nFound some issues:\n`);
                errors.forEach(err => console.log(`- ${err}`));
                return true;
            } else {
                console.log(`❌ FAILED\n`);
                console.log(`Expected: Some errors`);
                console.log(`Got: No errors (solution marked as correct)`);
                return false;
            }
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}\n`);
        return false;
    }
}

// ============================================================================
// Test Data
// ============================================================================

const expanse_completo = fs.readFileSync(path.join(__dirname, '../erd/04 The Expanse Completo/ER 04 The Expanse Completo final.erd'), 'utf8');
const expanse_incorrecto = fs.readFileSync(path.join(__dirname, '../erd/04 The Expanse Completo/ER 04 The Expanse Completo incorrecto.erd'), 'utf8');

// ============================================================================
// Test Cases
// ============================================================================

console.log('\n' + '╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(10) + 'ERD CHECKER TEST SUITE - The Expanse Tests' + ' '.repeat(15) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

const tests = [];

// Test 1: The Expanse Completo vs The Expanse Completo
tests.push(runTest(
    'Test 1: The Expanse Completo vs The Expanse Completo',
    expanse_completo,
    expanse_completo,
    true // Should pass
));

// Test 2: The Expanse Completo vs The Expanse Incorrecto
tests.push(runTest(
    'Test 2: The Expanse Completo vs The Expanse Incorrecto',
    expanse_completo,
    expanse_incorrecto,
    false // Should have errors
));

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
const passed = tests.filter(t => t).length;
console.log(`Tests passed: ${passed}/${tests.length}\n`);

if (passed === tests.length) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
} else {
    console.log(`❌ ${tests.length - passed} test(s) failed.\n`);
    process.exit(1);
}
