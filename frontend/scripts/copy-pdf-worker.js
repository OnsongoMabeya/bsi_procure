import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

if (!fs.existsSync(source)) {
  console.error('pdfjs-dist worker not found:', source);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(source, dest);
console.log('Copied pdfjs-dist worker to', dest);
