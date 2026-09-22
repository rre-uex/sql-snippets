# ERD to Base64 Encoder

Command-line tool to encode ERD files to base64, so a solution can be embedded
in an exercise of the campus virtual.

## Quick Start

```bash
# Encode an ERD file
node encode-erd.js "erd/Teoria/Ternarias/Ternaria correcto.erd"

# Using npm script
npm run encode "erd/Teoria/Ternarias/Ternaria correcto.erd"
```

## Where the encoded solution goes

The checker is embedded in Moodle as a small HTML block. The base64 string is
the value of `checker_parameter`:

```html
<p>Statement of the exercise...</p>
<iframe id="checker" src="" width="100%" height="800" hidden></iframe>
<script>const checker_parameter = "ZXJkaWFncmFtJTIwTW9kZWwl...";</script>
<script src="https://i3lab.unex.es/sql-snippets/erd-checker.js"></script>
```

`erd-checker.js` then builds the iframe URL as
`erd-checker.html?s=` + `checker_parameter`, and `app.js` reads the `s`
parameter.

Each exercise also needs the **MD5 of the expected solution** in the answer
field, because that is what `app.js` posts back to Moodle when the student
presses Submit. This tool does not compute it; use `tools/regen-campus.js`,
which produces both values for every `.erd` at once (see below).

## Usage

### Basic Encoding

```bash
node encode-erd.js <file.erd>
```

Outputs the base64-encoded solution and the relative URL to test it locally.

### Options

#### `--url` or `-u`
Shows the full URL with localhost:8080:

```bash
node encode-erd.js "erd/Teoria/Ternarias/Ternaria correcto.erd" --url
```

#### `--copy` or `-c`
Copies the URL to clipboard (macOS only):

```bash
node encode-erd.js "erd/Teoria/Ternarias/Ternaria correcto.erd" --copy
```

Options can be combined:

```bash
node encode-erd.js "erd/Teoria/Ternarias/Ternaria correcto.erd" --url --copy
```

#### `--help` or `-h`

```bash
node encode-erd.js --help
```

### Using npm

```bash
npm run encode "erd/Teoria/Ternarias/Ternaria correcto.erd"

# With options, note the -- before them
npm run encode "erd/Teoria/Ternarias/Ternaria correcto.erd" -- --url
```

## Updating many exercises at once

For a single file this tool is enough. To regenerate every exercise after a
change in the language, use the batch tool instead, which also computes the
MD5 each exercise needs:

```bash
node tools/regen-campus.js erd --html campus.html
open campus.html
```

That produces a local page listing every `.erd` with a copy button for its
base64 and for its MD5, plus a checkbox to keep track of which exercises have
already been updated. It also flags any `.erd` that still contains outdated
syntax.

In the campus, replace **only** the string inside the quotes of
`checker_parameter`. Never paste the whole block: the page content also holds
the statement of the exercise and you would lose it.

## Workflow for a single exercise

1. **Create or edit the ERD file** under `erd/`
2. **Check it with the bigER extension** in VS Code: no errors, diagram renders
3. **Encode it**:
   ```bash
   node encode-erd.js "erd/my-solution.erd" --url
   ```
4. **Open the URL** in the browser to try it as a student would
5. **Paste the base64** into `checker_parameter` in Moodle and the MD5 into the
   answer field

## Technical Details

### Encoding

1. Reads the ERD file content
2. Applies `encodeURIComponent` to handle accents and special characters
3. Converts to base64 with Node.js `Buffer`

```javascript
const base64 = Buffer.from(encodeURIComponent(text)).toString('base64');
```

### Decoding, in app.js

```javascript
function decodeBase64(str) {
    const base64Decoded = atob(str);
    return decodeURIComponent(base64Decoded);
}
```

### The MD5 sent back to Moodle

```javascript
CryptoJS.MD5(expectedSolutionText.trim())
```

It is computed on the **decoded and trimmed** text, so it changes whenever the
`.erd` changes, even by a single space. That is why every change to a solution
means updating two values in the exercise, not one.

## Troubleshooting

### File not found
Use quotes if the path contains spaces:
```bash
node encode-erd.js "erd/Teoria/Ternarias/Ternaria correcto.erd"   # correct
node encode-erd.js erd/Teoria/Ternarias/Ternaria\ correcto.erd    # also works
```

### Clipboard not working
`--copy` uses `pbcopy`, so it only works on macOS. Copy the output manually
elsewhere.

### The student sees "correct" but Moodle gives no mark
The base64 was updated but the MD5 was not. Both values must change together.

### A correct solution is reported as wrong
The exercise is probably still serving a solution written in the previous
syntax. Regenerate it with `tools/regen-campus.js`.

## See Also

- [Main README](README.md) - Project overview and the bigER notation in use
- [Test Documentation](tests/README.md) - Running automated tests
- `erd-checker.html` - the page loaded inside the iframe
- `erd-checker.js` - the block embedded in Moodle
- `app.js` - parser, comparison and UI
- `tools/regen-campus.js` - batch generation of base64 + MD5
