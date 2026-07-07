import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule.parse);

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
    try {
      if (typeof pdfParse !== 'function') {
        throw new Error('PDF parser module is not available (not a function).');
      }
      const data = await pdfParse(buffer);
      if (!data || !data.text) {
        throw new Error('PDF parser returned empty text; the PDF may be scanned images or corrupted.');
      }
      return data.text;
    } catch (err) {
      throw new Error(`Could not read PDF ${filename}: ${err.message}. If it is a scanned/image PDF, OCR support is coming in Phase 14.`);
    }
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
  // Keywords that strongly indicate sections containing required bidder documents
  const sectionHeaderKeywords = [
    'evaluation and qualification', 'qualification criteria', 'mandatory requirement',
    'eligibility requirement', 'qualification of the tenderer', 'documents to be submitted',
    'documents required', 'documents required to be submitted', 'mandatory documents',
    'technical evaluation', 'technical proposal', 'technical requirement', 'technical documents',
    'financial evaluation', 'financial proposal', 'financial requirement', 'financial documents',
    'tender submission form', 'bid security', 'tender security', 'declaration form',
    'certificate of incorporation', 'tax compliance', 'tax certificate', 'audited financial',
    'bank reference', 'performance certificate', 'reference letter', 'power of attorney',
    'business permit', 'cr12', 'cr13', 'single business', 'confidential business questionnaire',
    'independent tender determination', 'code of ethics', 'self-declaration', 'site visit',
    'dealership authorization', 'nca', 'energy regulatory commission', 'erc', 'lines of credit',
    'workplan', 'resumes', 'brochures', 'lpo', 'lso', 'recommendation letter', 'delivery commitment',
    'financial capacity', 'turnover', 'method statement', 'schedule of requirements', 'bill of quantities',
    'stage 1', 'stage 2', 'stage 3'
  ];

  // Negative keywords that indicate procedural/evaluation-method sections to skip
  const procedureKeywords = [
    'only the tenders that meet', 'shall proceed to', 'to qualify for',
    'the following procedure will guide', 'comparison of quoted amounts',
    'ascertain that', 'market survey report', 'ranking of bids', 'lowest evaluated bid',
    'evaluation process', 'scoring rules', 'the procuring entity shall',
    'tender opening', 'tender award', 'clarification', 'negotiation', 'post-qualification'
  ];

  // Header patterns used to split the document into candidate sections
  const headerRegex = /\n\s*(?:Section\s+[IVX]+|PART\s+\d+|STAGE\s+\d+[:\.]?|PHASE\s+\d+[:\.]?|\d+\s*[.):]\s*(?:[A-Z][A-Za-z\s]{2,}|\b[A-Z\s]{5,}[A-Z]\b)|\b[A-Z][A-Z\s]{5,}[A-Z]\b)\s*\n/g;

  // Split into sections preserving headers
  const sections = [];
  let lastIndex = 0;
  let match;
  while ((match = headerRegex.exec(docText)) !== null) {
    if (match.index > lastIndex) {
      sections.push(docText.slice(lastIndex, match.index));
    }
    sections.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < docText.length) {
    sections.push(docText.slice(lastIndex));
  }

  // Group sections into chunks (header + body) and score them
  const chunks = [];
  for (let i = 0; i < sections.length; i++) {
    if (headerRegex.test(sections[i]) || (i === 0)) {
      const header = sections[i];
      const body = sections[i + 1] || '';
      const combined = (header + ' ' + body).toLowerCase();
      const relevanceScore = sectionHeaderKeywords.reduce((score, k) => score + (combined.includes(k) ? 1 : 0), 0);
      const procedureScore = procedureKeywords.reduce((score, k) => score + (combined.includes(k) ? 1 : 0), 0);
      chunks.push({ header, body, combined, relevanceScore, procedureScore });
    }
  }

  // Always include the first chunk for context
  const selected = [chunks[0]?.combined || sections.slice(0, 3000).join('')];

  // Select all chunks with positive relevance score and not purely procedural
  for (const chunk of chunks) {
    if (chunk.relevanceScore > 0 && chunk.procedureScore === 0) {
      selected.push(chunk.header + chunk.body);
    } else if (chunk.relevanceScore > 0 && chunk.procedureScore > 0) {
      // Mixed section: include only if it contains actual document keywords beyond the header
      const bodyLower = chunk.body.toLowerCase();
      const hasDocKeywords = [
        'submit', 'attach', 'provide', 'certificate', 'form', 'license', 'permit',
        'letter', 'document', 'guarantee', 'statement', 'brochure', 'resume', 'lpo', 'lso'
      ].some(k => bodyLower.includes(k));
      if (hasDocKeywords) {
        selected.push(chunk.header + chunk.body);
      }
    }
  }

  const result = selected.join('\n\n---\n\n').slice(0, 80000);
  if (result.length < 2000) {
    // Fallback: if we filtered too aggressively, return first 50k chars
    return docText.slice(0, 50000);
  }
  return result;
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

  const systemPrompt = `You are a procurement document analyzer for a Kenyan broadcast/AV company. Your job is to read a tender document and extract every required document, form, certificate, permit, license, or attachment that the bidder must submit. Return ONLY a JSON checklist.

Scope — extract from these bidder-requirement sections (wording may vary):
1. Mandatory / Qualification / Eligibility / Evaluation and Qualification / Stage 1 / Documents to be submitted
2. Technical Evaluation / Technical Proposal / Technical Requirements / Stage 2 / Schedule of Requirements
3. Financial Evaluation / Financial Proposal / Financial Requirements / Stage 3 / Price Schedules

Do NOT extract:
- Evaluation procedures, scoring rules, pass/fail criteria, responsiveness rules, or ranking methods.
- Instructions about what the Procuring Entity will do (e.g., "The procuring entity shall evaluate...", "The tender opening shall be conducted...").
- General tender rules, clarifications, negotiations, or award notifications.

Extraction rules:
1. Extract one item per listed requirement. If the document has a numbered list or table (e.g., "No. | Documents to be submitted | Yes/No"), create one checklist item for every row. Do not skip rows.
2. Preserve exact wording and numbers from the document. Do NOT generalize. If it says "Kshs 1,000,000.00 valid 180 days", use that exact amount and period. If it says "CR12 or CR13 or National ID/Passport", capture all alternatives.
3. If a row lists multiple distinct documents (e.g., "Self-Declaration Form SD1 and SD2"), create one item per distinct document. Do not merge them into a generic item.
4. If a row says the bidder must submit a document with specific attributes (e.g., "certified", "duly filled, signed and stamped", "original", "within 60 days"), put those attributes in the notes field.
5. Capture sector-specific requirements: NCA, ERC, KRA, business permits, dealership/manufacturer authorization letters, site visit certificates, technical staff resumes and licenses, LPOs/LSOs/contracts, recommendation letters, etc.
6. If a requirement is clearly a formatting/assembly rule and not a document to gather (e.g., "tender document must be tape-bound and paginated"), you may still include it under category "other".
7. If the document does not clearly list specific required documents, return an empty checklist array. Do NOT invent items.

Field rules:
- name: exact document/form name as written in the tender. Do not rename or shorten.
- category: one of company_standing, financial, experience, tender_form, technical, it_related, other.
- is_form: true only if the tender provides a specific pre-printed form to fill. false for supporting documents to be sourced.
- form_reference: the form code/name if is_form is true (e.g., "SD1", "BOQ", "BSF"), otherwise null.
- notes: exact requirements from the text (amount, validity, copies, sign/stamp, source). Preserve numbers. Empty string if none.
- suggested_assignee_role: comma-separated roles from FL, INFO, FIN, TECH, IT, HOT, ADMIN, GM. Use multiple roles where appropriate.

Categorization rules:
- company_standing: Certificate of Incorporation, CR12, CR13, KRA PIN, Tax Compliance Certificate, business permits, Power of Attorney, stamps, signatures.
- financial: audited accounts, bank reference letters, bid/tender security, guarantees, priced BOQ, price schedules, financial capacity proofs, lines of credit, insurance.
- experience: past performance certificates, reference letters, LPOs/LSOs/contracts, similar completed projects, recommendation letters.
- tender_form: pre-printed forms supplied by the procuring entity (Tender Submission Form, Bid Security Form, Self-Declaration Forms, Confidential Business Questionnaire, Independent Tender Determination, Code of Ethics Declaration).
- technical: technical proposal, method statement, work plan/schedule, equipment brochures/specs, site visit certificate, NCA/ERC licenses, technical staff resumes/certificates, delivery commitment letter, dealership/manufacturer authorization letter, drawings, test reports.
- it_related: IT certifications, software licenses, network diagrams, cybersecurity certificates.
- other: anything that does not fit above (e.g., tender document binding/pagination rules).

Role assignment rules:
- Mandatory / Qualification documents → INFO, GM, ADMIN
- Technical documents → TECH, IT, GM, ADMIN
- Financial documents → FIN, FL, GM, ADMIN
- Experience proofs → INFO, GM, ADMIN

Example output (must be valid JSON only):
{
  "checklist": [
    {"name": "Tender Submission Form", "category": "tender_form", "is_form": true, "form_reference": "TSF", "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Certificate of Incorporation / Registration", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Certified copy", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Valid Tax Compliance Certificate", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "KRA", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Valid Single Business Permit", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Issued by county where firm operates", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "CR12 or CR13 or National ID / Passport", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "CR12/CR13 for limited companies; National ID/Passport for sole proprietors/partnerships. Current within 60 days", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Confidential Business Questionnaire", "category": "tender_form", "is_form": true, "form_reference": null, "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Certificate of Independent Tender Determination", "category": "tender_form", "is_form": true, "form_reference": null, "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Declaration and Commitment to the Code of Ethics", "category": "tender_form", "is_form": true, "form_reference": null, "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Self-Declaration Form SD1", "category": "tender_form", "is_form": true, "form_reference": "SD1", "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Self-Declaration Form SD2", "category": "tender_form", "is_form": true, "form_reference": "SD2", "notes": "Duly filled, signed and stamped", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Tender Security", "category": "financial", "is_form": false, "form_reference": null, "notes": "Kshs 1,000,000.00 bank guarantee from Kenyan-licensed bank or insurance guarantee from IRA-approved company. Valid 180 days", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Certified Audited Accounts", "category": "financial", "is_form": false, "form_reference": null, "notes": "Last 3 years: 2025, 2024, 2023", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Power of Attorney", "category": "company_standing", "is_form": false, "form_reference": null, "notes": "Duly filled, certified", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Signed and Stamped Site Visit Certificate", "category": "technical", "is_form": false, "form_reference": null, "notes": "Original", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Dealership Authorization Letter from Manufacturer", "category": "technical", "is_form": false, "form_reference": null, "notes": "Duly certified", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "NCA 7+ Registration Certificate and Practicing License", "category": "technical", "is_form": false, "form_reference": null, "notes": "National Construction Authority Class 7 and above, Electrical Engineering Services", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "ERC Class A2 License", "category": "technical", "is_form": false, "form_reference": null, "notes": "Energy Regulatory Commission current Class A2", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Brochures Supporting Mandatory Technical Specifications", "category": "technical", "is_form": false, "form_reference": null, "notes": "For compliance", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "3 LPOs / LSOs / Contract Documents", "category": "experience", "is_form": false, "form_reference": null, "notes": "Supply and delivery/commissioning experience in public or private institutions. Each LPO/LSO/Contract value Kshs 5 Million and above", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "4 Recommendation Letters from Institutions", "category": "experience", "is_form": false, "form_reference": null, "notes": "On client letterhead with contact person, email and telephone", "suggested_assignee_role": "INFO,GM,ADMIN"},
    {"name": "Letter of Commitment Confirming 60-Day Delivery", "category": "technical", "is_form": false, "form_reference": null, "notes": "From date of signing contract", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Financial Capacity Proof", "category": "financial", "is_form": false, "form_reference": null, "notes": "Lines of credit (bank letters on overdraft/loan/fixed deposits) + audited financial statements showing average annual turnover KES 50,000,000+", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Workplan", "category": "technical", "is_form": false, "form_reference": null, "notes": "", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "5 Detailed Resumes of Technical Staff + Certified Certificates/Licenses", "category": "technical", "is_form": false, "form_reference": null, "notes": "From relevant bodies", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Technical Proposal", "category": "technical", "is_form": false, "form_reference": null, "notes": "", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Method Statement", "category": "technical", "is_form": false, "form_reference": null, "notes": "", "suggested_assignee_role": "TECH,IT,GM,ADMIN"},
    {"name": "Form of Tender", "category": "tender_form", "is_form": true, "form_reference": null, "notes": "Prepared in accordance with ITT 14", "suggested_assignee_role": "FIN,FL,GM,ADMIN"},
    {"name": "Priced Bill of Quantities / Activity Schedule", "category": "financial", "is_form": true, "form_reference": "BOQ", "notes": "Signed and priced as per tender schedule", "suggested_assignee_role": "FIN,FL,GM,ADMIN"}
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

  const controller = new AbortController();
  const timeoutMs = 240000; // 4 minutes
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }

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
