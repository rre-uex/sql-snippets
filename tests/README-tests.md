# Tests Directory

This directory contains test files and debugging utilities for the SQL Snippets
application and for the ERD checker.

## Test Files

### HTML Test Files
- **`test-row-limits.html`** - Basic test for SQL.js row limits with artificial data
- **`debug-rows.html`** - Test for row display issues with multiple databases
- **`debug-detailed.html`** - Comprehensive debugging tool with detailed logging for diagnosing row display problems
- **`test-decode.html`** - Manual check of base64 decoding in the browser
- **`test-improved-errors.html`** - Manual check of the wording of validation errors
- **`test-url-validation.html`** - Manual check of the URL parameter validation

### SQL Test Files
- **`test-queries.sql`** - Collection of test queries for diagnosing row limit issues with the penguins database
- **`test-query.sql`** - Advanced SQL test for relationship analysis and schema improvements
- **`test-mermaid-debug.sql`**, **`test-pk-fix.sql`**, **`test-pk-fk-fix.sql`** - Schema diagram fixes

### JavaScript Test Files
- **`test-schema.js`** - Node.js test script for the createSchemaMermaid function (requires sqlite3 npm package)
- **`test-integration-encoding.js`** - Integration tests: base64 cycle plus full validation
- **`test-ternaria.js`** - ERD checker tests on ternary relationships
- **`test-superheroes.js`** - ERD checker tests on the Superhéroes exercise
- **`test-the-expanse.js`** - ERD checker tests on The Expanse exercise

## Usage

### Running HTML Tests
1. Start the HTTP server from the project root: `python3 -m http.server 8080`
2. Open any HTML test file in your browser: `http://localhost:8080/tests/[filename].html`

### Running SQL Tests
```bash
sqlite3 db/[database].db < tests/[test-file].sql
```

### Running JavaScript Tests
```bash
cd tests
node test-schema.js
```

### Running ERD Checker Tests

```bash
# Everything
npm test

# One suite at a time
npm run test:integration
npm run test:ternaria
npm run test:superheroes
npm run test:the-expanse
```

## How the ERD tests are written

All four suites import the real code:

```javascript
const { parseERD, compareSolutions } = require('../app.js');
```

`app.js` registers its UI only when `document` exists, and exports `parseERD`
and `compareSolutions` when loaded from Node. That way the tests exercise
exactly the code that runs in the browser, instead of a copy of it.

The `.erd` fixtures live in `erd/`, not inside the test files, so the same
files are used by the tests, by the VS Code extension and by the campus.

### Why the error cases do not count errors

Each error case declares the **behaviours it must detect**, not how many
errors the checker should produce:

```javascript
mustDetect: [
    ['missing entity',     /Missing entity: "Mineral"/],
    ['wrong superclass',   /Entity "Directivo": should be a subclass of "Personal"/],
    ['missing hierarchy',  /Missing hierarchy: .*over "Personal"/]
]
```

Counting errors makes a test break every time a message is reworded, without
anything being actually wrong, and a number such as "43 errors" documents
nothing about what is covered. With this style, a failure names the
comprobation that was lost.

Cases that compare a correct solution against itself do assert zero errors,
which is a meaningful assertion and not a fragile one.

## Test Suites

### Integration (8 cases)
Encoding to base64, decoding, byte-for-byte preservation including accents and
ñ, and full validation on top of the decoded content.

### Ternaria (3 cases)
Correct solution, wrong cardinalities, and a ternary relationship modelled with
two participants instead of three.

### Superhéroes (2 cases)
Correct solution, and nine distinct behaviours: missing and redundant
attributes, weak entities mismarked in both directions, missing and redundant
relationships, wrong cardinalities, relationship attributes and weak
relationships.

### The Expanse (2 cases)
Correct solution, and eight distinct behaviours on the most complex model,
including hierarchies: a subclass hanging from the wrong superclass, and
hierarchies that are missing or that should not exist.

## See Also

- [README_INTEGRATION_TESTS.md](README_INTEGRATION_TESTS.md) - The base64 cycle in detail
- [TEST_ARCHITECTURE.md](TEST_ARCHITECTURE.md) - Overall testing architecture
- [Main README](../README.md) - Project overview and bigER notation

## Purpose

These test files were created to:
- Diagnose the row display limit issue (solved: it was a CSS max-height limitation)
- Test schema relationship analysis improvements
- Debug SQL.js integration problems
- Verify database loading and query execution
- Validate ERD checker correctness and prevent regressions during refactoring
