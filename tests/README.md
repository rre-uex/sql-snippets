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

## Purpose

These test files were created to:
- Diagnose the row display limit issue (solved: was a CSS max-height limitation)
- Test schema relationship analysis improvements
- Debug SQL.js integration problems
- Verify database loading and query execution