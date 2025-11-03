# Tests Directory

This directory contains test files and debugging utilities for the SQL Snippets application.

## Test Files

### HTML Test Files
- **`test-row-limits.html`** - Basic test for SQL.js row limits with artificial data
- **`debug-rows.html`** - Test for row display issues with multiple databases
- **`debug-detailed.html`** - Comprehensive debugging tool with detailed logging for diagnosing row display problems

### SQL Test Files
- **`test-queries.sql`** - Collection of test queries for diagnosing row limit issues with the penguins database
- **`test-query.sql`** - Advanced SQL test for relationship analysis and schema improvements

### JavaScript Test Files
- **`test-schema.js`** - Node.js test script for the createSchemaMermaid function (requires sqlite3 npm package)
- **`test-ternaria.js`** - Automated test suite for ERD checker validation (Ternaria relationship exercises)
- **`test-superheroes.js`** - Automated test suite for ERD checker validation (Superhéroes exercise)

## Usage

### Running HTML Tests
1. Start the HTTP server from the project root: `python3 -m http.server 8080`
2. Open any HTML test file in your browser: `http://localhost:8080/tests/[filename].html`

### Running SQL Tests
Execute SQL test files against databases:
```bash
sqlite3 db/[database].db < tests/[test-file].sql
```

### Running JavaScript Tests
```bash
cd tests
node test-schema.js
```

### Running ERD Checker Tests

#### Quick Start (using npm)
From the project root directory:

```bash
# Run all ERD checker tests
npm test

# Run only Ternaria tests
npm run test:ternaria

# Run only Superhéroes tests
npm run test:superheroes

# Run only The Expanse tests
npm run test:the-expanse
```

#### Manual Execution

##### Ternaria Tests
```bash
node tests/test-ternaria.js
```

**Test Cases:**

1. **Test 1: Correct Solution**
   - Compares `Ternaria correcto.erd` with itself
   - Expected output: `✓ Solution is correct! Great job!`

2. **Test 2: Incorrect Cardinalities**
   - Compares `Ternaria correcto.erd` with `Ternaria incorrecta cardinalidades incorrectas.erd`
   - Detects wrong cardinalities in relationship links

3. **Test 3: Missing Relationship Link**
   - Compares `Ternaria correcto.erd` with `Ternaria incorrecta falta relacion.erd`
   - Detects missing link in ternary relationship (expected 2 links, found 1)

##### Superhéroes Tests
```bash
node tests/test-superheroes.js
```

**Test Cases:**

1. **Test 1: Correct Solution**
   - Compares `Enunciado 1 ER Superhéroesv1 completo.erd` with itself
   - Expected output: `✓ Solution is correct! Great job!`

2. **Test 2: Multiple Errors**
   - Compares correct solution with `Enunciado 1 ER Superhéroesv1 incorrecto.erd`
   - Detects 9 different types of errors:
     - Weak entity incorrectly marked (Planeta should NOT be weak)
     - Strong entity incorrectly marked (MisionRealizada should be weak)
     - Redundant attributes in entities
     - Missing/extra attributes in relationships
     - Missing roles in recursive relationships
     - Weak relationship incorrectly marked
     - Redundant relationships

##### The Expanse Tests
```bash
node tests/test-the-expanse.js
```

**Test Cases:**

1. **Test 1: Correct Solution**
   - Compares `Enunciado 4 ER The Expanse v2 completo.erd` with itself
   - Expected output: `✓ Solution is correct! Great job!`

2. **Test 2: Multiple Complex Errors**
   - Compares correct solution with `Enunciado 4 ER The Expanse v2 incorrecto.erd`
   - Detects 23 different types of errors:
     - Wrong number of entities (expected 12, found 16)
     - Redundant attributes in entities
     - Missing entities without attributes
     - Wrong number of attributes in entities
     - Missing attributes in entities
     - Incorrect keys (wrong attribute marked as key)
     - Missing UNIQUE constraints
     - Incorrect specialization (total vs parcial)
     - Incorrect overlap (disjunta vs solapada)
     - Wrong number of relationships
     - Incorrect cardinalities in weak entity relationships
     - Missing relationships
     - Wrong entity participating in relationships

#### Adding New ERD Tests

To add new test cases, edit the corresponding test file and add a new test using the `runTest` function:

```javascript
tests.push(runTest(
    'Test Name',
    expectedSolutionText,
    studentSolutionText,
    'Expected output message'
));
```

## Purpose

These test files were created to:
- Diagnose the row display limit issue (solved: was a CSS max-height limitation)
- Test schema relationship analysis improvements
- Debug SQL.js integration problems
- Verify database loading and query execution
- Validate ERD checker correctness and prevent regressions during refactoring
