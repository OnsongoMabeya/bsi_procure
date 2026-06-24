import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

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
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export async function scanTenderDocument(filePath) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  if (provider !== 'gemini') {
    throw new Error(`LLM provider "${provider}" is not yet implemented. Only "gemini" is supported.`);
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY is not set in environment');

  const docText = await extractTextFromFile(filePath);
  if (!docText || docText.trim().length < 100) {
    throw new Error('Could not extract sufficient text from the document. It may be a scanned/image PDF — OCR support is coming in Phase 14.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `${EXTRACTION_PROMPT}\n\n--- TENDER DOCUMENT TEXT ---\n${docText.slice(0, 60000)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.checklist)) throw new Error('LLM response missing checklist array');

  return parsed;
}
