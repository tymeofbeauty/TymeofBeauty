export type Language = 'en' | 'th';

export interface ContactFormInput {
  fullName: string;
  email: string;
  phone: string;
  interest: string;
  preferredDate: string;
  notes: string;
  consent: boolean;
}

export type ContactField = keyof ContactFormInput;

export interface ContactValidationResult {
  valid: boolean;
  errors: Partial<Record<ContactField, string>>;
}

export interface IndexedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface ScoredChunk extends IndexedChunk {
  score: number;
}

export interface MaskPosition {
  x: number;
  y: number;
  sw: number;
  sh: number;
}

export function validateContactForm(
  input: ContactFormInput,
  lang: Language = 'en'
): ContactValidationResult {
  const errors: Partial<Record<ContactField, string>> = {};
  const isTh = lang === 'th';

  const name = (input.fullName || '').trim();
  if (name.length < 2) {
    errors.fullName = isTh
      ? 'กรุณากรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร'
      : 'Please enter your full name (at least 2 characters).';
  } else if (name.length > 120) {
    errors.fullName = isTh
      ? 'ชื่อ-นามสกุลต้องไม่เกิน 120 ตัวอักษร'
      : 'Full name must be 120 characters or fewer.';
  }

  const email = (input.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email) {
    errors.email = isTh ? 'กรุณากรอกอีเมล' : 'Email address is required.';
  } else if (!emailRegex.test(email) || email.length > 200) {
    errors.email = isTh
      ? 'รูปแบบอีเมลไม่ถูกต้อง'
      : 'Please enter a valid email address.';
  }

  const phoneDigits = (input.phone || '').replace(/[\s\-()+]/g, '');
  if (!input.phone.trim()) {
    errors.phone = isTh ? 'กรุณากรอกเบอร์โทรศัพท์' : 'Phone number is required.';
  } else if (!/^\d{9,15}$/.test(phoneDigits)) {
    errors.phone = isTh
      ? 'กรุณากรอกเบอร์โทรศัพท์ 9-15 หลัก'
      : 'Please enter a valid phone number (9–15 digits).';
  }

  const interest = (input.interest || '').trim();
  if (!interest) {
    errors.interest = isTh
      ? 'กรุณาเลือกบริการหรือโปรแกรมที่สนใจ'
      : 'Please select a service or program.';
  }

  if ((input.notes || '').length > 1000) {
    errors.notes = isTh
      ? 'รายละเอียดเพิ่มเติมต้องไม่เกิน 1,000 ตัวอักษร'
      : 'Notes must be 1,000 characters or fewer.';
  }

  if (!input.consent) {
    errors.consent = isTh
      ? 'กรุณายินยอมให้ทีมงานติดต่อกลับ'
      : 'Please confirm consent so our team can contact you.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function extractGoogleDocId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  if (/^[a-zA-Z0-9_-]{10,150}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

export function extractTextFromGoogleDoc(docJson: unknown): string {
  if (!docJson || typeof docJson !== 'object') return '';
  const docObj = docJson as {
    body?: {
      content?: Array<{
        paragraph?: {
          elements?: Array<{ textRun?: { content?: string } }>;
        };
        table?: {
          tableRows?: Array<{
            tableCells?: Array<{
              content?: Array<{
                paragraph?: {
                  elements?: Array<{ textRun?: { content?: string } }>;
                };
              }>;
            }>;
          }>;
        };
      }>;
    };
  };

  const blocks: string[] = [];
  const contentList = docObj.body?.content;
  if (!Array.isArray(contentList)) return '';

  for (const element of contentList) {
    if (element.paragraph?.elements) {
      const line = element.paragraph.elements
        .map((el) => el.textRun?.content ?? '')
        .join('')
        .trim();
      if (line) blocks.push(line);
    }
    if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        const cellTexts: string[] = [];
        for (const cell of row.tableCells ?? []) {
          const cellText = (cell.content ?? [])
            .map((c) =>
              (c.paragraph?.elements ?? [])
                .map((el) => el.textRun?.content ?? '')
                .join('')
                .trim()
            )
            .filter(Boolean)
            .join(' ');
          if (cellText) cellTexts.push(cellText);
        }
        if (cellTexts.length > 0) blocks.push(cellTexts.join(' | '));
      }
    }
  }

  return blocks.join('\n\n');
}

export function chunkDocumentText(
  text: string,
  chunkSize = 550,
  overlap = 80
): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushWithOverlap = (block: string) => {
    chunks.push(block.trim());
  };

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      if (current.trim()) {
        pushWithOverlap(current);
        current = '';
      }
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + chunkSize, para.length);
        pushWithOverlap(para.slice(start, end));
        if (end >= para.length) break;
        start = Math.max(start + 1, end - overlap);
      }
      continue;
    }

    if ((current + '\n\n' + para).trim().length <= chunkSize) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current.trim()) {
        pushWithOverlap(current);
        const tail = current.slice(-overlap).trim();
        current = tail ? `${tail}\n\n${para}` : para;
        if (current.length > chunkSize) {
          current = para;
        }
      } else {
        current = para;
      }
    }
  }

  if (current.trim()) {
    pushWithOverlap(current);
  }

  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function retrieveTopChunks(
  queryEmbedding: number[],
  chunks: IndexedChunk[],
  topK = 4,
  minScore = 0.2
): ScoredChunk[] {
  if (!queryEmbedding.length || !chunks.length) return [];
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function computeMaskedCardBackground(
  pos: MaskPosition,
  imageWidth: number,
  focalX: number
): { backgroundSize: string; backgroundPosition: string } {
  const overflow = imageWidth > pos.sw ? imageWidth - pos.sw : 0;
  const focalOffset = overflow * focalX;
  return {
    backgroundSize: `auto ${pos.sh}px`,
    backgroundPosition: `-${pos.x + focalOffset}px -${pos.y}px`,
  };
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; language: string; code: string };

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', language: lang, code: codeLines.join('\n') });
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    if (line.trim().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('> ') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
  }

  return blocks;
}

export function sanitizeLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
