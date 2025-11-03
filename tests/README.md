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
- **`test-integration-encoding.js`** - Integration tests for base64 encoding/decoding cycle ⭐ NUEVO
- **`test-ternaria.js`** - Automated test suite for ERD checker validation (Ternaria relationship exercises)
- **`test-superheroes.js`** - Automated test suite for ERD checker validation (Superhéroes exercise)
- **`test-the-expanse.js`** - Automated test suite for ERD checker validation (The Expanse exercise)

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
```bash
# Run all ERD checker tests (validation + integration)
npm test

# Run only integration tests (encoding/decoding) ⭐ NUEVO
npm run test:integration

# Run only Ternaria tests
npm run test:ternaria

# Run only Superhéroes tests
npm run test:superheroes

# Run only The Expanse tests
npm run test:the-expanse
```

#### Manual Execution

##### Integration Tests (8 test cases) ⭐ NUEVO
```bash
node tests/test-integration-encoding.js
```

Validates the complete encoding/decoding cycle:
- Base64 encoding of ERD files
- URL parameter decoding
- Content preservation (no data loss)
- Special character handling (accents, ñ, etc.)
- End-to-end validation workflow

##### Ternaria Tests (3 test cases)
```bash
node tests/test-ternaria.js
```

Validates ternary relationships with tests for:
- Correct solution validation
- Incorrect cardinalities detection
- Missing relationship links detection

##### Superhéroes Tests (2 test cases)
```bash
node tests/test-superheroes.js
```

Comprehensive validation testing:
- Correct solution validation
- Multiple error types detection (9 different errors including weak entities, redundant attributes, missing roles, etc.)

##### The Expanse Tests (2 test cases)
```bash
node tests/test-the-expanse.js
```

Most comprehensive validation testing:
- Correct solution validation
- Multiple error types detection (23 different errors including entity count, missing attributes, incorrect keys, specialization errors, cardinality errors, missing relationships, etc.)

For detailed test case descriptions, see:
- [README_TESTS.md](README_TESTS.md) - Validation test cases
- [README_INTEGRATION_TESTS.md](README_INTEGRATION_TESTS.md) - Integration test cases
- [INTEGRATION_TESTS_SUMMARY.md](INTEGRATION_TESTS_SUMMARY.md) - Integration tests summary  
- [TEST_ARCHITECTURE.md](TEST_ARCHITECTURE.md) - Complete testing architecture ⭐ NUEVO

## Purpose

These test files were created to:
- Diagnose the row display limit issue (solved: was a CSS max-height limitation)
- Test schema relationship analysis improvements
- Debug SQL.js integration problems
- Verify database loading and query execution
- Validate ERD checker correctness and prevent regressions during refactoring