import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

async function findLibreOffice() {
  for (const cmd of ['soffice', 'libreoffice']) {
    try {
      await execFileAsync(cmd, ['--version'], { timeout: 10000 });
      return cmd;
    } catch {
      // try next command
    }
  }
  throw new Error('LibreOffice not found. Install LibreOffice to convert DOCX tender documents to PDF.');
}

export async function convertDocxToPdf(inputPath, outputDir) {
  const stats = await fs.stat(inputPath);
  if (!stats.isFile()) throw new Error('Input file does not exist');

  await fs.mkdir(outputDir, { recursive: true });
  const command = await findLibreOffice();

  await execFileAsync(command, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ], { timeout: 120000 });

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${baseName}.pdf`);
  const outputStats = await fs.stat(outputPath).catch(() => null);
  if (!outputStats || outputStats.size === 0) {
    throw new Error('PDF conversion produced no output');
  }
  return outputPath;
}

export function isDocx(filePath) {
  return path.extname(filePath || '').toLowerCase() === '.docx';
}

export function isPdf(filePath) {
  return path.extname(filePath || '').toLowerCase() === '.pdf';
}
