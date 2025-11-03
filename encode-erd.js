#!/usr/bin/env node

/**
 * ERD to Base64 Encoder
 * 
 * This tool encodes ERD files to base64 format for use with erd-checker-parametrizable.html
 * 
 * Usage:
 *   node encode-erd.js <file.erd>
 *   node encode-erd.js <file.erd> --url
 *   node encode-erd.js <file.erd> --copy
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

function showHelp() {
    console.log(`
${colors.bright}ERD to Base64 Encoder${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node encode-erd.js <file.erd> [options]

${colors.cyan}Options:${colors.reset}
  --url, -u      Show full URL with localhost:8080
  --copy, -c     Copy to clipboard (macOS only)
  --help, -h     Show this help message

${colors.cyan}Examples:${colors.reset}
  node encode-erd.js erd/Ternaria\\ correcto.erd
  node encode-erd.js "erd/Ternaria correcto.erd" --url
  node encode-erd.js erd/Ternaria\\ correcto.erd --copy

${colors.cyan}Output:${colors.reset}
  - Base64 encoded solution
  - Relative URL for erd-checker-parametrizable.html
  - Optional: Full URL with localhost:8080
  - Optional: Copy to clipboard
`);
}

function encodeERD(filePath) {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`${colors.red}Error:${colors.reset} File not found: ${filePath}`);
            process.exit(1);
        }

        // Read the file
        const erdContent = fs.readFileSync(filePath, 'utf8');
        
        // Encode to base64
        const encoded = Buffer.from(encodeURIComponent(erdContent)).toString('base64');
        
        return {
            content: erdContent,
            encoded: encoded,
            fileName: path.basename(filePath)
        };
    } catch (error) {
        console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
        process.exit(1);
    }
}

function copyToClipboard(text) {
    const { exec } = require('child_process');
    
    // Try macOS pbcopy
    exec(`echo "${text}" | pbcopy`, (error) => {
        if (error) {
            console.log(`${colors.yellow}Note:${colors.reset} Could not copy to clipboard (pbcopy not available)`);
        } else {
            console.log(`${colors.green}✓${colors.reset} Copied to clipboard!`);
        }
    });
}

function main() {
    const args = process.argv.slice(2);
    
    // Show help if requested or no args
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    // Get file path (first non-option argument)
    const filePath = args.find(arg => !arg.startsWith('-'));
    
    if (!filePath) {
        console.error(`${colors.red}Error:${colors.reset} No file specified`);
        showHelp();
        process.exit(1);
    }
    
    // Get options
    const showFullUrl = args.includes('--url') || args.includes('-u');
    const copyToClip = args.includes('--copy') || args.includes('-c');
    
    // Encode the file
    const result = encodeERD(filePath);
    
    // Build URLs
    const relativeUrl = `erd-checker-parametrizable.html?solution=${result.encoded}`;
    const fullUrl = `http://localhost:8080/${relativeUrl}`;
    
    // Display results
    console.log(`\n${colors.bright}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}║              ERD to Base64 Encoder - Results                      ║${colors.reset}`);
    console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    
    console.log(`${colors.cyan}File:${colors.reset} ${result.fileName}`);
    console.log(`${colors.cyan}Size:${colors.reset} ${result.content.length} characters\n`);
    
    console.log(`${colors.bright}Base64 Encoded Solution:${colors.reset}`);
    console.log(`${colors.green}${result.encoded}${colors.reset}\n`);
    
    console.log(`${colors.bright}Relative URL:${colors.reset}`);
    console.log(`${colors.blue}${relativeUrl}${colors.reset}\n`);
    
    if (showFullUrl) {
        console.log(`${colors.bright}Full URL (localhost:8080):${colors.reset}`);
        console.log(`${colors.blue}${fullUrl}${colors.reset}\n`);
    }
    
    console.log(`${colors.yellow}Tip:${colors.reset} Copy the URL and open it in your browser to test the solution`);
    console.log(`${colors.yellow}Tip:${colors.reset} Use --url flag to see full URL with localhost:8080`);
    console.log(`${colors.yellow}Tip:${colors.reset} Use --copy flag to copy URL to clipboard (macOS)\n`);
    
    // Copy to clipboard if requested
    if (copyToClip) {
        copyToClipboard(showFullUrl ? fullUrl : relativeUrl);
    }
}

// Run the program
main();
