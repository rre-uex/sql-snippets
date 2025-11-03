# SQL Snippets with ERD Checker

Interactive web application for SQL learning and Entity-Relationship Diagram (ERD) validation.

## Features

### 1. SQL Snippets
Interactive SQL query execution with real-time results visualization.

### 2. ERD Checker
Automated validation tool for Entity-Relationship Diagrams using bigER notation.

#### Two Versions Available:

- **`erd-checker.html`** - Standard version with hardcoded expected solution
- **`erd-checker-parametrizable.html`** - Parametrizable version that receives the expected solution via URL query parameter

## ERD Checker Usage

### Standard Version
Open `erd-checker.html` in a browser and enter your ERD solution.

### Parametrizable Version

The parametrizable version allows teachers to create custom URLs with the expected solution encoded in base64.

**Using the ERD Encoder Tool:**

The project includes a handy command-line tool to encode ERD files to base64:

```bash
# Basic usage
node encode-erd.js "erd/Ternaria correcto.erd"

# With full URL
node encode-erd.js "erd/Ternaria correcto.erd" --url

# Using npm script
npm run encode "erd/Ternaria correcto.erd"

# With options
npm run encode "erd/Ternaria correcto.erd" -- --url
npm run encode "erd/Ternaria correcto.erd" -- --copy  # macOS only
```

**Manual Generation:**

**URL Format:**
```
erd-checker-parametrizable.html?solution=BASE64_ENCODED_SOLUTION
```

**Generate URL (Node.js):**
```javascript
const fs = require('fs');
const solution = fs.readFileSync('./erd/your-solution.erd', 'utf8');
const encoded = Buffer.from(encodeURIComponent(solution)).toString('base64');
const url = `erd-checker-parametrizable.html?solution=${encoded}`;
console.log(url);
```

**Generate URL (Browser Console):**
```javascript
const solution = `your ERD solution here`;
const encoded = btoa(encodeURIComponent(solution));
const url = `erd-checker-parametrizable.html?solution=${encoded}`;
console.log(url);
```

## ERD Validation Features

The checker validates:
- ✅ Entity definitions (strong/weak)
- ✅ Entity attributes and keys
- ✅ Partial keys for weak entities
- ✅ Relationships (strong/weak)
- ✅ Relationship attributes
- ✅ Cardinalities and roles
- ✅ Entity specialization (parcial/total, solapada/disjunta)
- ✅ Unique constraints (//UNIQUE)
- ✅ Ternary relationships
- ✅ Recursive relationships with roles

## Testing

Comprehensive automated test suites ensure the ERD checker works correctly.

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
# Integration tests - encoding/decoding base64 (8 test cases) ⭐ NUEVO
npm run test:integration

# Ternaria relationship tests (3 test cases)
npm run test:ternaria

# Superhéroes exercise tests (2 test cases)
npm run test:superheroes

# The Expanse exercise tests (2 test cases)
npm run test:the-expanse
```

### Test Coverage

#### Integration Tests ⭐ NUEVO
Tests the complete encoding/decoding cycle using the **real parser from `app.js`**:
- ✅ Base64 encoding preserves content exactly
- ✅ URL decoding works correctly
- ✅ Special characters (accents, ñ) are preserved
- ✅ **Full ERD validation** with complete error detection (cardinalidades, atributos, roles, especialización, etc.)

**Total: 8 integration tests - ALL PASSING ✅** covering all three ERD exercises with complete validation.

#### Ternaria Tests
- ✅ Correct solution validation
- ✅ Incorrect cardinalities detection
- ✅ Missing relationship links detection

#### Superhéroes Tests
- ✅ Correct solution validation
- ✅ Multiple error types (9 different validation scenarios)
  - Weak/strong entity errors
  - Redundant attributes
  - Missing/extra relationship attributes
  - Missing roles in recursive relationships
  - Redundant relationships

#### The Expanse Tests
- ✅ Correct solution validation
- ✅ Complex error detection (23 different validation scenarios)
  - Wrong number of entities
  - Missing/redundant attributes
  - Incorrect keys and UNIQUE constraints
  - Specialization errors (total/parcial, disjunta/solapada)
  - Cardinality errors in weak entity relationships
  - Missing relationships
  - Wrong participating entities

### Test Documentation
- 📄 [tests/README.md](tests/README.md) - General test overview
- 📄 [tests/README_TESTS.md](tests/README_TESTS.md) - Detailed validation test cases
- 📄 [tests/README_INTEGRATION_TESTS.md](tests/README_INTEGRATION_TESTS.md) - Integration tests documentation
- 📄 [tests/INTEGRATION_TESTS_SUMMARY.md](tests/INTEGRATION_TESTS_SUMMARY.md) - Integration tests summary

**Total Test Suite: 15 tests - ALL PASSING ✅** (8 integration + 7 validation)

## Project Structure

```
sql-snippets/
├── app.js                              # ERD checker (standard version)
├── appParametrizable.js                # ERD checker (parametrizable version)
├── encode-erd.js                       # CLI tool to encode ERD files to base64
├── erd-checker.html                    # Standard ERD checker page
├── erd-checker-parametrizable.html     # Parametrizable ERD checker page
├── index.html                          # Main page
├── package.json                        # npm scripts and project metadata
├── db/                                 # SQLite databases
├── doc/                                # Documentation
├── erd/                                # ERD test files
│   ├── Ternaria correcto.erd
│   ├── Ternaria incorrecta cardinalidades incorrectas.erd
│   ├── Ternaria incorrecta falta relacion.erd
│   ├── Enunciado 1 ER Superhéroesv1 completo.erd
│   ├── Enunciado 1 ER Superhéroesv1 incorrecto.erd
│   ├── Enunciado 4 ER The Expanse v2 completo.erd
│   └── Enunciado 4 ER The Expanse v2 incorrecto.erd
└── tests/                              # Test files
    ├── test-integration-encoding.js    # Integration tests (encoding/decoding) ⭐ NUEVO
    ├── test-ternaria.js                # Ternaria relationship tests
    ├── test-superheroes.js             # Superhéroes exercise tests
    ├── test-the-expanse.js             # The Expanse exercise tests
    ├── README.md                       # Tests documentation
    ├── README_TESTS.md                 # Detailed test cases documentation
    └── README_INTEGRATION_TESTS.md     # Integration tests documentation ⭐ NUEVO
```

## Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for running tests)

### Local Development
1. Clone the repository
2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser

### Running Tests
```bash
npm test
```

## BigER Notation

The ERD checker uses bigER notation. Example:

```erdiagram
erdiagram Model
notation=crowsfoot

entity Student {
    student_id key
    name
    email //UNIQUE
}

weak entity Enrollment {
    grade partial-key
}

relationship enrolledIn {
    Student[1..N] -> Course[1..N]
    enrollment_date
}

weak relationship has {
    Enrollment[0..N] -> Student[1..1]
}

//parcial,solapada
entity GraduateStudent extends Student {
    student_id key
    thesis_topic
}
```

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting pull requests.
