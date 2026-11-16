import 'dotenv/config';
import http from 'http';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  chunkDocumentText,
  extractGoogleDocId,
  extractTextFromGoogleDoc,
  IndexedChunk,
  Language,
  retrieveTopChunks,
  validateContactForm,
} from './src/utils/logic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function generateReferenceId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `TYME-${ts}${rand}`;
}

async function createGoogleSpreadsheet(
  authHeader: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitle: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Inquiries',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw Object.assign(new Error(`Google Sheets create failed (${createRes.status}): ${errBody}`), {
      status: createRes.status,
    });
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const sheetTitle = created.sheets?.[0]?.properties?.title || 'Inquiries';

  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/${encodeURIComponent(
      `${sheetTitle}!A1:I1`
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            'Timestamp',
            'Reference ID',
            'Language',
            'Full Name',
            'Email',
            'Phone',
            'Interest',
            'Preferred Date',
            'Notes',
          ],
        ],
      }),
    }
  );

  if (!headerRes.ok) {
    const errBody = await headerRes.text();
    throw Object.assign(new Error(`Google Sheets header write failed (${headerRes.status}): ${errBody}`), {
      status: headerRes.status,
    });
  }

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    sheetTitle,
  };
}

async function main() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Guest contact submission (when Google Workspace isn't connected yet)
  app.post('/api/contact/guest', (req: Request, res: Response) => {
    const body = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      interest?: string;
      preferredDate?: string;
      notes?: string;
      consent?: boolean;
      language?: Language;
    };

    const lang: Language = body.language === 'th' ? 'th' : 'en';
    const validation = validateContactForm(
      {
        fullName: body.fullName ?? '',
        email: body.email ?? '',
        phone: body.phone ?? '',
        interest: body.interest ?? '',
        preferredDate: body.preferredDate ?? '',
        notes: body.notes ?? '',
        consent: Boolean(body.consent),
      },
      lang
    );

    if (!validation.valid) {
      res.status(400).json({ error: 'Validation failed', errors: validation.errors });
      return;
    }

    res.json({
      success: true,
      referenceId: generateReferenceId(),
      timestamp: new Date().toISOString(),
      mode: 'guest',
    });
  });

  // Conversion Flow endpoint: creates a new Google Sheet (or appends to user's sheet) via Google Sheets API
  app.post('/api/contact/sheets', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
      return;
    }

    const body = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      interest?: string;
      preferredDate?: string;
      notes?: string;
      consent?: boolean;
      language?: Language;
      spreadsheetId?: string;
      createNewSheet?: boolean;
    };

    const lang: Language = body.language === 'th' ? 'th' : 'en';
    const validation = validateContactForm(
      {
        fullName: body.fullName ?? '',
        email: body.email ?? '',
        phone: body.phone ?? '',
        interest: body.interest ?? '',
        preferredDate: body.preferredDate ?? '',
        notes: body.notes ?? '',
        consent: Boolean(body.consent),
      },
      lang
    );

    if (!validation.valid) {
      res.status(400).json({ error: 'Validation failed', errors: validation.errors });
      return;
    }

    try {
      let targetSpreadsheetId = (body.spreadsheetId || '').trim();
      let spreadsheetUrl = '';
      let sheetTitle = '';
      let createdNew = false;

      if (!targetSpreadsheetId || body.createNewSheet) {
        const dateLabel = new Date().toISOString().slice(0, 10);
        const created = await createGoogleSpreadsheet(
          authHeader,
          `Tyme of Beauty - Inquiries (${dateLabel})`
        );
        targetSpreadsheetId = created.spreadsheetId;
        spreadsheetUrl = created.spreadsheetUrl;
        sheetTitle = created.sheetTitle;
        createdNew = true;
      } else {
        // Fetch existing spreadsheet metadata to dynamically discover tab name (avoid hardcoding "Sheet1")
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            targetSpreadsheetId
          )}?fields=spreadsheetUrl,sheets.properties.title`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (metaRes.status === 404) {
          const dateLabel = new Date().toISOString().slice(0, 10);
          const created = await createGoogleSpreadsheet(
            authHeader,
            `Tyme of Beauty - Inquiries (${dateLabel})`
          );
          targetSpreadsheetId = created.spreadsheetId;
          spreadsheetUrl = created.spreadsheetUrl;
          sheetTitle = created.sheetTitle;
          createdNew = true;
        } else if (!metaRes.ok) {
          const errText = await metaRes.text();
          res.status(metaRes.status).json({
            error: `Unable to access Google Sheet (${metaRes.status}): ${errText}`,
          });
          return;
        } else {
          const meta = (await metaRes.json()) as {
            spreadsheetUrl?: string;
            sheets?: Array<{ properties?: { title?: string } }>;
          };
          spreadsheetUrl =
            meta.spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;
          sheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';
        }
      }

      const referenceId = generateReferenceId();
      const timestamp = new Date().toISOString();

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          targetSpreadsheetId
        )}/values/${encodeURIComponent(`${sheetTitle}!A:I`)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              [
                timestamp,
                referenceId,
                lang.toUpperCase(),
                (body.fullName ?? '').trim(),
                (body.email ?? '').trim(),
                (body.phone ?? '').trim(),
                (body.interest ?? '').trim(),
                (body.preferredDate ?? '').trim() || 'Flexible',
                (body.notes ?? '').trim() || '-',
              ],
            ],
          }),
        }
      );

      if (!appendRes.ok) {
        const errText = await appendRes.text();
        res.status(appendRes.status).json({
          error: `Failed to append row to Google Sheets (${appendRes.status}): ${errText}`,
        });
        return;
      }

      res.json({
        success: true,
        referenceId,
        timestamp,
        spreadsheetId: targetSpreadsheetId,
        spreadsheetUrl,
        sheetTitle,
        createdNew,
      });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status: number }).status)
          : 500;
      const message = err instanceof Error ? err.message : 'Google Sheets error';
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  });

  // List user's Google Docs via Drive Metadata API
  app.get('/api/docs/list', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
      return;
    }

    try {
      const q = encodeURIComponent(
        "mimeType='application/vnd.google-apps.document' and trashed=false"
      );
      const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=25&orderBy=modifiedTime%20desc`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!driveRes.ok) {
        const errText = await driveRes.text();
        res.status(driveRes.status).json({
          error: `Google Drive API error (${driveRes.status}): ${errText}`,
        });
        return;
      }

      const data = (await driveRes.json()) as {
        files?: Array<{ id: string; name: string; modifiedTime?: string; webViewLink?: string }>;
      };
      res.json({ files: data.files ?? [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list Google Docs';
      res.status(500).json({ error: message });
    }
  });

  // Read a Google Doc, chunk it, and compute vector embeddings via gemini-embedding-2
  app.post('/api/docs/index', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Google Workspace Bearer token.' });
      return;
    }

    const body = req.body as { documentId?: string };
    const cleanDocId = extractGoogleDocId(body.documentId ?? '');
    if (!cleanDocId) {
      res.status(400).json({ error: 'Invalid Google Doc ID or URL.' });
      return;
    }

    try {
      const docRes = await fetch(
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(cleanDocId)}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!docRes.ok) {
        const errText = await docRes.text();
        res.status(docRes.status).json({
          error: `Google Docs API error (${docRes.status}): ${errText}`,
        });
        return;
      }

      const docJson = (await docRes.json()) as { title?: string };
      const documentTitle = (docJson.title || 'Untitled Document').slice(0, 200);
      const rawText = extractTextFromGoogleDoc(docJson);

      if (!rawText.trim()) {
        res.status(422).json({
          error: 'This Google Doc contains no readable text content to index.',
        });
        return;
      }

      const textChunks = chunkDocumentText(rawText, 550, 80).slice(0, 40);
      const ai = getGenAIClient();

      const embeddedChunks: Array<{
        chunkIndex: number;
        content: string;
        embedding: number[];
      }> = [];

      // Embed chunks via gemini-embedding-2 (batched in groups of 15)
      for (let start = 0; start < textChunks.length; start += 15) {
        const slice = textChunks.slice(start, start + 15);
        const embedRes = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: slice,
          config: {
            outputDimensionality: 768,
          },
        });

        const vectors = embedRes.embeddings ?? [];
        for (let idx = 0; idx < slice.length; idx++) {
          const values = vectors[idx]?.values;
          if (Array.isArray(values) && values.length > 0) {
            embeddedChunks.push({
              chunkIndex: start + idx,
              content: slice[idx],
              embedding: values,
            });
          }
        }
      }

      if (embeddedChunks.length === 0) {
        res.status(500).json({ error: 'Failed to generate embeddings for Google Doc.' });
        return;
      }

      res.json({
        documentId: cleanDocId,
        documentTitle,
        chunks: embeddedChunks,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to index Google Doc';
      res.status(500).json({ error: message });
    }
  });

  // Streaming Gemini Chatbot endpoint with RAG (vector embeddings) + Persistent User Memory
  app.post('/api/chat/stream', async (req: Request, res: Response) => {
    const body = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'model'; content: string }>;
      language?: Language;
      memories?: Array<{ fact: string; category: string }>;
      docChunks?: IndexedChunk[];
      userName?: string;
    };

    const userMessage = (body.message ?? '').trim();
    if (!userMessage) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const ai = getGenAIClient();
      const lang: Language = body.language === 'th' ? 'th' : 'en';
      const chunks = Array.isArray(body.docChunks) ? body.docChunks : [];

      let topDocs: ReturnType<typeof retrieveTopChunks> = [];
      if (chunks.length > 0) {
        try {
          const qEmbedRes = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: [userMessage],
            config: {
              outputDimensionality: 768,
            },
          });
          const queryVector = qEmbedRes.embeddings?.[0]?.values ?? [];
          if (queryVector.length > 0) {
            topDocs = retrieveTopChunks(queryVector, chunks, 4, 0.22);
          }
        } catch (embedErr) {
          console.warn('Query embedding retrieval skipped:', embedErr);
        }
      }

      const citedTitles = Array.from(new Set(topDocs.map((d) => d.documentTitle)));
      if (citedTitles.length > 0) {
        sendEvent({ type: 'sources', sources: citedTitles });
      }

      const memoryBlock =
        body.memories && body.memories.length > 0
          ? body.memories
              .slice(0, 20)
              .map((m) => `- [${m.category}] ${m.fact}`)
              .join('\n')
          : 'No saved personal memories yet.';

      const ragBlock =
        topDocs.length > 0
          ? topDocs
              .map(
                (d, idx) =>
                  `[Source ${idx + 1}: "${d.documentTitle}" (relevance ${d.score.toFixed(
                    2
                  )})]\n${d.content}`
              )
              .join('\n\n')
          : 'No private Google Docs excerpts matched this query.';

      const systemInstruction = `You are the official **Tyme of Beauty — Beauty & Healthy Everywhere** AI Concierge.
Your role is to guide visitors, clients, beauty professionals, influencers, and business partners across Thailand with warm, trustworthy, practical expertise.

Brand & Services Overview:
- **01. Beauty Services**: Professional aesthetic & skincare treatments powered by modern technologies across Thailand, with Free Consultation.
- **02. Beauty Products**: Curated science-backed skincare and wellness formulations.
- **03. Healthy Services**: Holistic health, longevity, and preventive wellness programs.
- **04. Professional Career (TYME Career / Career Makeover)**: Earning from certified professional beauty & wellness work, training, and career transformation.
- **Business Partners & Influencers**: "Driving Business Together" — zero upfront cost partner & influencer programs with earning opportunities for everyone.

Active User Context:
- User Name: ${body.userName || 'Guest'}
- Preferred Language: ${lang === 'th' ? 'Thai (ภาษาไทย) — respond naturally in Thai unless the user asks in English' : 'English — respond naturally in English unless the user writes in Thai'}

Persistent User Memory (remembered across sessions):
${memoryBlock}

Private Google Docs Knowledge Base Excerpts (retrieved via semantic vector similarity):
${ragBlock}

Formatting & Behavioral Rules:
1. Respond using clean **Markdown** (headings, bullet lists, bold key terms).
2. When answering from the Private Google Docs excerpts above, explicitly reference the document title naturally and remain faithful to the excerpt facts.
3. If the user asks to book a service, request a free consultation, apply for TYME Career, or become a Business Partner / Influencer, provide helpful guidance and invite them to click "Book Online Now" or "Contact Us" in the landing page form.
4. Keep answers concise, clear, structured, and helpful.`;

      const chatHistory = (body.history ?? []).slice(-16).map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      }));

      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: chatHistory,
        config: {
          systemInstruction,
        },
      });

      const streamResponse = await chat.sendMessageStream({
        message: userMessage,
      });

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          sendEvent({ type: 'chunk', text: chunk.text });
        }
      }

      sendEvent({ type: 'done' });
      res.end();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate Gemini response.';
      sendEvent({ type: 'error', error: message });
      res.end();
    }
  });

  // Fast memory extraction using gemini-3.1-flash-lite
  app.post('/api/chat/extract-memory', async (req: Request, res: Response) => {
    const body = req.body as {
      userMessage?: string;
      assistantMessage?: string;
      existingFacts?: string[];
    };

    const userMsg = (body.userMessage ?? '').trim();
    const assistantMsg = (body.assistantMessage ?? '').trim();
    if (!userMsg || !assistantMsg) {
      res.json({ memories: [] });
      return;
    }

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Analyze this conversation turn and extract at most 2 concise, durable personal facts, goals, skin/beauty preferences, career interests, or partnership interests about the user that would personalize future sessions.
Do NOT duplicate existing facts:
Existing facts: ${(body.existingFacts ?? []).join(' | ') || 'None'}

User said: "${userMsg}"
Assistant replied: "${assistantMsg.slice(0, 600)}"

Return JSON array of extracted items (empty array if nothing durable was shared).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fact: {
                  type: Type.STRING,
                  description: 'Concise durable fact about the user (max 140 chars).',
                },
                category: {
                  type: Type.STRING,
                  description: 'One of: preference, goal, beauty, career, partner',
                },
              },
              required: ['fact', 'category'],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        fact?: string;
        category?: string;
      }>;
      const validCategories = new Set(['preference', 'goal', 'beauty', 'career', 'partner']);
      const cleaned = (Array.isArray(parsed) ? parsed : [])
        .filter((item) => item.fact && item.fact.trim().length >= 4)
        .slice(0, 2)
        .map((item) => ({
          fact: item.fact!.trim().slice(0, 480),
          category: validCategories.has(item.category ?? '')
            ? (item.category as 'preference' | 'goal' | 'beauty' | 'career' | 'partner')
            : 'preference',
        }));

      res.json({ memories: cleaned });
    } catch {
      res.json({ memories: [] });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Tyme of Beauty server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
