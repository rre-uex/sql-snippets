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
- ✅ Entity definitions (strong/weak/associative)
- ✅ Entity attributes and keys
- ✅ Partial keys for weak entities
- ✅ Unique constraints (`unique` keyword)
- ✅ Relationships (strong/weak/associative)
- ✅ Relationship attributes
- ✅ Cardinalities and roles
- ✅ Hierarchies: completeness (`total`/`partial`) and constraint (`disjoint`/`overlapping`)
- ✅ Multi-level hierarchies and several hierarchies over the same base entity
- ✅ Associative entities and the relationships that identify them
- ✅ Ternary relationships
- ✅ Recursive relationships with roles

### How hierarchies and associative relationships are compared

Two elements of the language have names that are **not** shown in the diagram,
so the checker never compares them by name:

- **Hierarchies** are matched by their base entity and their set of subclasses.
  A student who writes `hierarchy h_persona` and one who writes
  `hierarchy jerarquia_personas` describe the same model, so both are accepted.
- **Associative relationships** are matched by the entities they connect, for
  the same reason.

Ordinary relationships *are* matched by name, because the name is drawn in the
diagram and is therefore part of the model.

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

Tests import `parseERD` and `compareSolutions` directly from `app.js`, so they
always exercise the code that actually runs in the browser.

#### Integration Tests
Tests the complete encoding/decoding cycle:
- ✅ Base64 encoding preserves content exactly
- ✅ URL decoding works correctly
- ✅ Special characters (accents, ñ) are preserved
- ✅ Full ERD validation on top of the decoded content

The error cases do **not** assert an exact error count. Each case declares the
behaviours it must detect, with the pattern that identifies each one, so a
reworded message never breaks a test and the test itself documents what it
covers.

**Total: 8 integration tests**

#### Ternaria Tests
- ✅ Correct solution validation
- ✅ Incorrect cardinalities detection
- ✅ Ternary relationship modelled with two participants instead of three

#### Superhéroes Tests
- ✅ Correct solution validation
- ✅ Nine distinct validation behaviours
  - Missing and redundant attributes
  - Weak entity marked as strong, and the other way round
  - Missing and redundant relationships
  - Wrong cardinalities
  - Missing relationship attributes
  - Weak relationship not marked as such

#### The Expanse Tests
- ✅ Correct solution validation
- ✅ Eight distinct validation behaviours on the most complex model
  - Missing and redundant entities
  - Subclass hanging from the wrong superclass
  - Missing and redundant hierarchies
  - Misnamed attributes
  - Missing links inside a relationship
  - Missing relationships

### Test Documentation
- 📄 [tests/README.md](tests/README.md) - General test overview
- 📄 [tests/README_TESTS.md](tests/README_TESTS.md) - Detailed validation test cases
- 📄 [tests/README_INTEGRATION_TESTS.md](tests/README_INTEGRATION_TESTS.md) - Integration tests documentation
- 📄 [tests/INTEGRATION_TESTS_SUMMARY.md](tests/INTEGRATION_TESTS_SUMMARY.md) - Integration tests summary

**Total Test Suite: 15 tests** (8 integration + 7 validation)
## Project Structure

```
sql-snippets/
├── app.js                              # ERD checker: parser, comparison and UI
├── encode-erd.js                       # CLI tool to encode ERD files to base64
├── erd-checker.html                    # ERD checker page
├── erd-checker.js                      # Block embedded in the campus (builds the iframe)
├── index.html                          # Main page
├── package.json                        # npm scripts and project metadata
├── db/                                 # SQLite databases
├── doc/                                # Documentation
├── legacy/
│   └── app-old.js                      # Pre-September-2026 checker, kept for reference
├── tools/
│   ├── migrate-erd.js                  # Migrates .erd files to the current syntax
│   └── regen-campus.js                 # Generates the base64 + MD5 pair per exercise
│   └── regen-_campus_web.js            # Generates the base64 + MD5 pair per exercise on html
├── erd/                                # ERD exercise files, one folder per domain
│   ├── 01 Superheroes/
│   ├── 04 The Expanse Completo/
│   ├── Labs/
│   ├── Teoria/
│   └── ...
└── tests/                              # Test files
    ├── test-integration-encoding.js    # Encoding/decoding plus validation
    ├── test-ternaria.js                # Ternary relationship tests
    ├── test-superheroes.js             # Superhéroes exercise tests
    ├── test-the-expanse.js             # The Expanse exercise tests
    ├── README.md                       # Tests documentation
    ├── README_TESTS.md                 # Detailed test cases documentation
    └── README_INTEGRATION_TESTS.md     # Integration tests documentation
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
    email unique
}

entity Course {
    course_id key
    title
}

relationship enrolledIn {
    Student[1..N] -> Course[1..N]
    enrollment_date
}

weak entity Attendance {
    session_date partial-key
}

weak relationship attends {
    Student[1..1] -> Attendance[0..N]
}

// A hierarchy is a named element of the model. Several hierarchies may share
// the same base entity, and a subclass may itself be the base of another one.
hierarchy h_student Student partial overlapping

entity GraduateStudent extends h_student {
    student_id key
    thesis_topic
}

entity ExchangeStudent extends h_student {
    student_id key
    home_university
}

// An associative entity declares no key of its own: it is identified by the
// entities it associates, which are the ones linked to it by an
// "associative relationship".
associative entity Registration {
    registered_at
}

associative relationship student_registration {
    Student[1..1] -> Registration[1..N]
}

associative relationship course_registration {
    Course[1..1] -> Registration[1..N]
}
```

With a single subclass a hierarchy can only be `partial`, since there is
nothing that could overlap or be disjoint. With two or more subclasses the
constraint is mandatory.

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting pull requests.