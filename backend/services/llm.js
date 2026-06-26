import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const EXTRACTION_PROMPT = `You are a procurement document analyst for Broadcast Solutions International (BSI), a Kenyan broadcast and AV technology company.

You have been given a tender document. Your job is to extract a complete, accurate checklist of ALL documents that the tenderer (BSI) must compile and submit in response to this tender.

Extract every required document, form, certificate, declaration, and attachment mentioned anywhere in the tender document.

For each item, return:
- name: The exact name of the required document or form
- category: One of: company_standing, financial, experience, tender_form, technical, it_related, other
- is_form: true if this is a pre-printed form from the tender document that must be filled in, false if it is a supporting document to be sourced
- form_reference: If is_form is true, the form code (e.g., "ELI-1.1", "CBQ", "FIN-3.1"). Otherwise null.
- notes: Any specific instructions about this document (validity requirements, number of copies, attachments required, etc.)
- suggested_assignee_role: One of: FL, INFO, FIN, TECH, IT, HOT

Use these assignment rules:
- Company registration, certification, stamp, signatures, form filling → INFO
- Financial statements, financial forms, tax certificates → FL
- Technical specifications, equipment lists → TECH or HOT
- IT-related certifications → IT
- Past contracts/experience forms → FL

Return ONLY valid JSON. No preamble, no markdown, no explanation. Format:
{
  "tender_reference": "string",
  "procuring_entity": "string",
  "submission_deadline": "string or null",
  "submission_type": "physical or digital or both",
  "checklist": [
    {
      "name": "",
      "category": "",
      "is_form": false,
      "form_reference": null,
      "notes": "",
      "suggested_assignee_role": ""
    }
  ]
}`;

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Uploaded file not found on server: ${filename}. Please re-upload the document.`);
  }

  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) {
    throw new Error(`Uploaded file is empty: ${filename}. Please re-upload the document.`);
  }

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      throw new Error(`Could not read ${filename}. The .docx file may be corrupted or password-protected. Try saving it as PDF and re-uploading.`);
    }
  }

  if (ext === '.doc') {
    try {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      return doc.getBody();
    } catch (err) {
      throw new Error(`Could not read ${filename}. The .doc file may be corrupted or password-protected. Try saving it as .docx or PDF and re-uploading.`);
    }
  }

  throw new Error(`Unsupported file type: ${ext}. Please upload PDF, .docx, or .doc.`);
}

export async function scanTenderDocument(filePath) {
  const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

  const docText = await extractTextFromFile(filePath);
  if (!docText || docText.trim().length < 100) {
    throw new Error('Could not extract sufficient text from the document. It may be a scanned/image PDF — OCR support is coming in Phase 14.');
  }

  const prompt = `${EXTRACTION_PROMPT}\n\n--- TENDER DOCUMENT TEXT ---\n${docText.slice(0, 60000)}`;

  if (provider === 'gemini') {
    return await scanWithGemini(prompt);
  }

  if (provider === 'ollama') {
    return await scanWithOllama(prompt);
  }

  throw new Error(`LLM provider "${provider}" is not supported. Use "ollama" or "gemini".`);
}

async function scanWithGemini(prompt) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY is not set in environment for Gemini');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseLlmJson(text);
}

async function scanWithOllama(prompt) {
  const url = `${process.env.LLM_OLLAMA_URL || 'http://localhost:11434'}/api/chat`;
  const model = process.env.LLM_OLLAMA_MODEL || 'llama3.1';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a procurement document analyst. Extract all required documents from the tender text. Return ONLY a raw JSON object with a "checklist" array. Each item must have: name, category, is_form, form_reference, notes, suggested_assignee_role. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      format: 'json',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama returned ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.message?.content;
  if (!text) throw new Error('Ollama returned empty response');

  return parseLlmJson(text);
}

function parseLlmJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.checklist)) throw new Error('LLM response missing checklist array');

  return parsed;
}
