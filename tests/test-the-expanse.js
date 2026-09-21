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
const { parseERD, compareSolutions } = require('../app.js');

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
