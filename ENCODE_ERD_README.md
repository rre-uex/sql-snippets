# ERD to Base64 Encoder

Command-line tool to encode ERD files to base64 format for use with `erd-checker-parametrizable.html`.

## Quick Start

```bash
# Encode an ERD file
node encode-erd.js "erd/Ternaria correcto.erd"

# Show full URL with localhost:8080
node encode-erd.js "erd/Ternaria correcto.erd" --url

# Using npm script
npm run encode "erd/Ternaria correcto.erd"
```

## Usage

### Basic Encoding

```bash
node encode-erd.js <file.erd>
```

This will output:
- The base64-encoded solution
- A relative URL ready to use
- Tips for using the output

### Options

#### `--url` or `-u`
Shows the full URL with localhost:8080:

```bash
node encode-erd.js "erd/Ternaria correcto.erd" --url
```

#### `--copy` or `-c`
Copies the URL to clipboard (macOS only):

```bash
node encode-erd.js "erd/Ternaria correcto.erd" --copy
```

You can combine options:

```bash
node encode-erd.js "erd/Ternaria correcto.erd" --url --copy
```

#### `--help` or `-h`
Shows help information:

```bash
node encode-erd.js --help
```

## Examples

### Example 1: Basic Usage

```bash
$ node encode-erd.js "erd/Ternaria correcto.erd"

╔════════════════════════════════════════════════════════════════════╗
║              ERD to Base64 Encoder - Results                      ║
╚════════════════════════════════════════════════════════════════════╝

File: Ternaria correcto.erd
Size: 237 characters

Base64 Encoded Solution:
ZXJkaWFncmFtJTIwTW9kZWwlMEFub3RhdGlvbiUzRGNyb3dzZm9vdC...

Relative URL:
erd-checker-parametrizable.html?solution=ZXJkaWFncmFtJTIwTW9k...

Tip: Copy the URL and open it in your browser to test the solution
Tip: Use --url flag to see full URL with localhost:8080
Tip: Use --copy flag to copy URL to clipboard (macOS)
```

### Example 2: With Full URL

```bash
$ node encode-erd.js "erd/Ternaria correcto.erd" --url

...
Full URL (localhost:8080):
http://localhost:8080/erd-checker-parametrizable.html?solution=ZXJk...
```

### Example 3: Using npm Script

```bash
# Basic
npm run encode "erd/Ternaria correcto.erd"

# With options (note the -- before options)
npm run encode "erd/Ternaria correcto.erd" -- --url
npm run encode "erd/Ternaria correcto.erd" -- --copy
```

## Workflow

1. **Create/edit your ERD file** in the `erd/` directory
2. **Encode the file** using this tool:
   ```bash
   node encode-erd.js "erd/my-solution.erd" --url
   ```
3. **Copy the URL** from the output
4. **Open the URL** in your browser to test with `erd-checker-parametrizable.html`

## Integration with ERD Checker

The encoded URL can be used directly with the parametrizable ERD checker:

1. Start your local server:
   ```bash
   python3 -m http.server 8080
   ```

2. Encode your ERD:
   ```bash
   node encode-erd.js "erd/my-solution.erd" --url
   ```

3. Open the generated URL in your browser

4. Students can paste their solution and click "Check Solution"

## Technical Details

### Encoding Process

1. Reads the ERD file content
2. Applies `encodeURIComponent` to handle special characters
3. Converts to base64 using Node.js `Buffer`
4. Generates URL with the encoded solution as query parameter

### Decoding (in appParametrizable.js)

```javascript
function decodeBase64(str) {
    const base64Decoded = atob(str);
    return decodeURIComponent(base64Decoded);
}
```

## Troubleshooting

### File not found
Make sure the file path is correct. Use quotes if the filename contains spaces:
```bash
node encode-erd.js "erd/Ternaria correcto.erd"  # Correct
node encode-erd.js erd/Ternaria\ correcto.erd   # Also works (escaped space)
```

### Clipboard not working
The `--copy` option only works on macOS (uses `pbcopy`). On other systems, manually copy the URL from the output.

### URL too long
Very large ERD files may generate very long URLs. Most browsers support URLs up to ~2000 characters. If you encounter issues, consider simplifying the ERD or using the standard (non-parametrizable) version.

## See Also

- [Main README](README.md) - Project overview
- [Test Documentation](tests/README.md) - Running automated tests
- ERD Checker files:
  - `erd-checker.html` - Standard version
  - `erd-checker-parametrizable.html` - Parametrizable version
  - `appParametrizable.js` - Parametrizable checker logic
