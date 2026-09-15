import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const builtFile = path.join(__dirname, '..', 'public', 'app.js');
const outputFile = path.join(__dirname, '..', 'src', 'ui', 'client-built.js');

if (fs.existsSync(builtFile)) {
  const content = fs.readFileSync(builtFile, 'utf-8');
  // Escape for template literal: backticks and ${
  // Backslashes in regex patterns need to stay as-is because
  // template literals preserve backslash sequences
  const escaped = content
    .replace(/\\/g, '\\\\')  // Escape all backslashes first
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/\$\{/g, '\\${');  // Escape ${
  const wrapped = `export const CLIENT_SCRIPT = \`${escaped}\`;`;
  fs.writeFileSync(outputFile, wrapped);
  console.log('Created client-built.js');
} else {
  console.error('public/app.js not found at:', builtFile);
}
