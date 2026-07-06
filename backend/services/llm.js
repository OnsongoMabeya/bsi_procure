import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const EXTRACTION_PROMPT = `You are a procurement document analyst for Broadcast Solutions International (BSI), a Kenyan broadcast and AV technology company.

You have been given a tender document. Your job is to extract a complete, accurate checklist of ALL documents, forms, certificates, and attachments that the tenderer (BSI) must actually compile and submit with the tender response.

ONLY extract items from these three tender sections (wording may vary):
1. "Evaluation and Qualification Criteria" / "Mandatory Requirements" / "Eligibility Requirements" / "Qualification of the Tenderer" — lists the actual documents the bidder must attach (e.g. certificates, licenses, forms, letters).
2. "Technical Evaluation" / "Technical Proposal" / "Technical Requirements" — technical documents and forms to be attached (e.g. technical proposal, equipment schedules, brochures, method statements, site visit forms).
3. "Financial Evaluation" / "Financial Proposal" / "Financial Requirements" — financial forms and documents to be attached (e.g. priced bill of quantities, bid security form, financial statements, tax compliance certificate).

IMPORTANT: Do NOT extract evaluation procedures, scoring rules, tender instructions, or general tender rules. Only extract real documents/forms that the bidder must prepare, fill, or source.

Items to ALWAYS skip (examples of what NOT to extract):
- "Tender Opening", "Tender Submission", "Evaluation of Tenders", "Comparison of Tenders", "Tender Price Comparison", "Abnormally Low Tenders", "Abnormally High Tenders", "Unbalanced and/or Front-Loaded Tenders", "Tender Envelope Seal", "Responsiveness Check", "Tender Award Notification", "Clarification", "Correction of Arithmetic Errors", "Negotiations", "Post-qualification".

Key rule: If the text describes what the Procuring Entity will do (e.g. "The procuring entity shall evaluate...", "The tender opening shall be conducted...", "The procuring entity may require..."), do NOT extract it. Only extract text that says what the bidder/tenderer must submit, provide, attach, or include.

If the tender document does not clearly list specific required documents or forms in the sections above, return an empty checklist array. Do NOT invent items to fill the checklist.

For each document/form, return:
- name: The exact name of the required document or form as written in the tender. Do not rename or summarize.
- category: One of: company_standing, financial, experience, tender_form, technical, it_related, other
- is_form: true only if this is a pre-printed form provided in the tender document that must be filled in (e.g. "Form ELI-1", "Bid Security Form", "Tender Submission Form"). false if it is a supporting document to be sourced by the bidder (e.g. "Certificate of Incorporation", "Tax Compliance Certificate", "Bank Reference Letter").
- form_reference: If is_form is true, the form code/name (e.g. "ELI-1.1", "CBQ", "FIN-3.1"). Otherwise null.
- notes: Any specific instructions (validity, number of copies, certified, signed/stamped, attachments). Empty string if none.
- suggested_assignee_role: A comma-separated list of roles from: FL, INFO, FIN, TECH, IT, HOT, ADMIN, GM.

Categorization rules (be strict):
- company_standing: company registration, CR12, tax certificates, KRA PIN, business licenses, VAT registration, compliance certificates, stamps, signatures, director's authorization, power of attorney.
- financial: bank reference letters, audited financial statements, bid security/bank guarantee, priced BOQ, financial forms, tax compliance certificate, insurance certificate, tender fees receipt.
- experience: past performance certificates, reference letters, similar work experience, CVs of key personnel, project references.
- tender_form: pre-printed tender forms supplied by the procuring entity (e.g. Tender Submission Form, Bid Security Form, Declaration Form, Form ELI-1, Form FIN-3).
- technical: technical proposal, equipment specifications, method statement, work schedule, site visit confirmation, commissioning plan, maintenance plan, technical drawings, factory acceptance test report.
- it_related: IT certifications, software licenses, network diagrams, cybersecurity certificates, system architecture.
- other: anything that does not fit above.

Section assignment rules:
- Mandatory / Qualification / Eligibility documents → INFO, GM, ADMIN
- Technical proposal / technical requirement documents → TECH, IT, GM, ADMIN
- Financial proposal / financial requirement documents → FIN, FL, GM, ADMIN

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

function extractRelevantSections(docText) {
  // Split document into sections by common headers
  const sectionRegex = /\n\s*(?:Section\s+[IVX]+|PART\s+\d+|\d+\.\s+[A-Z][A-Z\s]+|\b[A-Z][A-Z\s]{3,}[A-Z]\b)\s*\n/;
  const parts = docText.split(sectionRegex).filter(Boolean);
  const headers = docText.match(sectionRegex) || [];

  // Keywords that indicate sections containing required documents
  const relevantKeywords = [
    'evaluation and qualification', 'qualification criteria', 'mandatory requirement',
    'eligibility requirement', 'qualification of the tenderer', 'technical evaluation',
    'technical proposal', 'technical requirement', 'financial evaluation',
    'financial proposal', 'financial requirement', 'documents to be submitted',
    'documents required', 'tender submission form', 'bid security', 'declaration',
    'certificate of incorporation', 'tax compliance', 'audited financial',
    'bank reference', 'performance certificate', 'technical proposal'
  ];

  const selected = [];
  // Always include the first chunk (usually has title/scope)
  selected.push(parts[0] || '');

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    const body = parts[i + 1] || '';
    const combined = (header + ' ' + body.slice(0, 500)).toLowerCase();
    if (relevantKeywords.some(k => combined.includes(k))) {
      selected.push(headers[i] + body);
    }
  }

  // Fallback: if no relevant sections found, use first 40k chars
  if (selected.length === 1 && selected[0].length < 1000) {
    return docText.slice(0, 40000);
  }

  return selected.join('\n\n---\n\n').slice(0, 50000);
}

export async function scanTenderDocument(filePath) {
  const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

  const docText = await extractTextFromFile(filePath);
  if (!docText || docText.trim().length < 100) {
    throw new Error('Could not extract sufficient text from the document. It may be a scanned/image PDF — OCR support is coming in Phase 14.');
  }

  const relevantText = extractRelevantSections(docText);

  console.log(`[scanTenderDocument] File path: ${filePath}`);
  console.log(`[scanTenderDocument] Extracted text length: ${docText.length} chars`);
  console.log(`[scanTenderDocument] Relevant sections length: ${relevantText.length} chars`);

  const prompt = `${EXTRACTION_PROMPT}\n\n--- TENDER DOCUMENT TEXT ---\n${relevantText}`;

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

  const systemPrompt = `You are a procurement assistant for a Kenyan broadcast/AV company. Extract all required documents, forms, certificates, and attachments from the tender text and return them as a JSON checklist.

ONLY extract real documents/forms from these three sections (wording may vary):
1. Evaluation / Qualification / Mandatory / Eligibility Requirements
2. Technical Evaluation / Technical Proposal / Technical Requirements
3. Financial Evaluation / Financial Proposal / Financial Requirements

Do NOT extract evaluation procedures, scoring rules, tender instructions, or general tender rules. Only extract real documents/forms that the bidder must prepare, fill, or source.

Items to ALWAYS skip:
- "Tender Opening", "Tender Submission", "Evaluation of Tenders", "Comparison of Tenders", "Tender Price Comparison", "Abnormally Low Tenders", "Abnormally High Tenders", "Unbalanced and/or Front-Loaded Tenders", "Tender Envelope Seal", "Responsiveness Check", "Tender Award Notification", "Clarification", "Correction of Arithmetic Errors", "Negotiations", "Post-qualification".

Key rule: If the text describes what the Procuring Entity will do (e.g. "The procuring entity shall evaluate...", "The tender opening shall be conducted...", "The procuring entity may require..."), do NOT extract it. Only extract text that says what the bidder/tenderer must submit, provide, attach, or include.

If the tender document does not clearly list specific required documents or forms in these sections, return an empty checklist array. Do NOT invent items.

Rules:
- name: exact document/form name as written in the tender. Do not rename. Create one item per listed document.
- category: one of company_standing, financial, experience, tender_form, technical, it_related, other.
- is_form: true only if the tender provides a specific pre-printed form to fill. false for supporting documents to be sourced.
- form_reference: the form code/name if is_form is true, otherwise null.
- notes: specific requirements (copies, validity, sign/stamp). Empty string if none.
- suggested_assignee_role: comma-separated roles from FL, INFO, FIN, TECH, IT, HOT, ADMIN, GM. Use multiple roles where appropriate.

Categorization rules (be strict):
- company_standing: company registration, CR12, tax certificates, KRA PIN, business licenses, compliance, stamps, signatures.
- financial: bank references, audited financial statements, bid security, priced BOQ, financial forms, tax compliance, insurance, tender fees.
- experience: past performance certificates, reference letters, similar work, CVs, project references.
- tender_form: pre-printed tender forms supplied by the procuring entity (Tender Submission Form, Bid Security Form, Declaration Form, ELI forms, FIN forms).
- technical: technical proposal, equipment specs, method statement, work schedule, site visit confirmation, maintenance plan, drawings, test reports.
- it_related: IT certifications, software licenses, network diagrams, cybersecurity.
- other: anything that does not fit above.

Section assignment rules:
- Mandatory / Qualification documents → INFO, GM, ADMIN
- Technical documents → TECH, IT, GM, ADMIN
- Financial documents → FIN, FL, GM, ADMIN

Example output for a standard tender:
{
  "checklist": [
    {"name": "Tender Submission Form", "category": "tender_form", "is_form": true, "form_reference": "TSF", "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Certificate of Incorporation", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Certified copy, valid", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "CR12 Form", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Current (within 6 months)", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "KRA Tax Compliance Certificate", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Valid and certified", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Audited Financial Statements", "category": "financial", "is_form": false, "form_reference": null, "notes": "Last 3 years", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Bank Reference Letter", "category": "financial", "is_form": false, "form_reference": null, "notes": "From reputable bank, current", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Bid Security Form", "category": "tender_form", "is_form": true, "form_reference": "BSF", "notes": "2% of tender sum, valid 120 days", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Past Performance Certificate / Reference Letters", "category": "experience", "is_form": false, "form_reference": null, "notes": "At least 3 similar completed projects", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Technical Proposal", "category": "technical", "is_form": false, "form_reference": null, "notes": "Equipment schedule, method statement, work plan", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Brochure Supporting Technical Proposal", "category": "technical", "is_form": false, "form_reference": null, "notes": "Manufacturer brochures for proposed equipment", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Priced Bill of Quantities", "category": "financial", "is_form": true, "form_reference": "BOQ", "notes": "Signed and priced as per tender schedule", "suggested_assignee_role": "FIN,FL,GM,ADMIN"}
  ]
}`;

  const checklistSchema = {
    type: 'object',
    properties: {
      checklist: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string', enum: ['company_standing', 'financial', 'experience', 'tender_form', 'technical', 'it_related', 'other'] },
            is_form: { type: 'boolean' },
            form_reference: { type: ['string', 'null'] },
            notes: { type: 'string' },
            suggested_assignee_role: { type: 'string' },
          },
          required: ['name', 'category', 'is_form', 'form_reference', 'notes', 'suggested_assignee_role'],
        },
      },
    },
    required: ['checklist'],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: false,
      format: checklistSchema,
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama returned ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.message?.content;
  if (!text) throw new Error('Ollama returned empty response');

  console.log(`[Ollama] Model: ${model}`);
  console.log('[Ollama] Raw response:', text.slice(0, 3000));

  try {
    return parseLlmJson(text);
  } catch (err) {
    console.error('[Ollama] Raw response that failed parsing:', text.slice(0, 2000));
    throw err;
  }
}

function parseLlmJson(text) {
  // Try to extract JSON from markdown code blocks or raw JSON
  let jsonText = text;

  // Strip markdown code fences
  const codeBlockMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  // Try to find the first JSON object or array
  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  const arrMatch = jsonText.match(/\[[\s\S]*\]/);

  let parsed;
  if (objMatch) {
    try {
      parsed = JSON.parse(objMatch[0]);
    } catch (err) {
      // Object parse failed, try array
      if (arrMatch) parsed = JSON.parse(arrMatch[0]);
    }
  } else if (arrMatch) {
    parsed = JSON.parse(arrMatch[0]);
  }

  if (!parsed) {
    throw new Error('LLM did not return valid JSON');
  }

  // Support both { checklist: [...] } and bare [...]
  if (Array.isArray(parsed)) {
    return { checklist: parsed };
  }

  if (Array.isArray(parsed.checklist)) {
    return parsed;
  }

  throw new Error('LLM response missing checklist array');
}
