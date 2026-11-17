import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkDocumentText,
  computeMaskedCardBackground,
  cosineSimilarity,
  extractGoogleDocId,
  extractTextFromGoogleDoc,
  getRouteMetadata,
  normalizeAppRoute,
  parseMarkdownBlocks,
  resolveBeautyServicesContactUrl,
  retrieveTopChunks,
  sanitizeLinkUrl,
  validateContactForm,
} from './logic';

test('validateContactForm rejects empty or invalid inputs with field errors', () => {
  const res = validateContactForm(
    {
      fullName: 'A',
      email: 'invalid-email',
      phone: '123',
      interest: '',
      preferredDate: '',
      notes: '',
      consent: false,
    },
    'en'
  );
  assert.equal(res.valid, false);
  assert.ok(res.errors.fullName);
  assert.ok(res.errors.email);
  assert.ok(res.errors.phone);
  assert.ok(res.errors.interest);
  assert.ok(res.errors.consent);
});

test('validateContactForm accepts valid Thai/English booking submission', () => {
  const res = validateContactForm(
    {
      fullName: 'Nattapong S.',
      email: 'nattapong@example.com',
      phone: '+66 81-234-5678',
      interest: 'Business Partner',
      preferredDate: '2026-11-20',
      notes: 'Interested in Bangkok partner program',
      consent: true,
    },
    'th'
  );
  assert.equal(res.valid, true);
  assert.deepEqual(res.errors, {});
});

test('extractGoogleDocId handles full URLs and raw document IDs', () => {
  assert.equal(
    extractGoogleDocId('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    extractGoogleDocId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractGoogleDocId('bad'), '');
});

test('extractTextFromGoogleDoc extracts paragraphs and tables cleanly', () => {
  const sampleDoc = {
    body: {
      content: [
        {
          paragraph: {
            elements: [{ textRun: { content: 'Tyme of Beauty Playbook\n' } }],
          },
        },
        {
          table: {
            tableRows: [
              {
                tableCells: [
                  {
                    content: [{ paragraph: { elements: [{ textRun: { content: 'Tier' } }] } }],
                  },
                  {
                    content: [{ paragraph: { elements: [{ textRun: { content: 'Partner' } }] } }],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  };
  const extracted = extractTextFromGoogleDoc(sampleDoc);
  assert.match(extracted, /Tyme of Beauty Playbook/);
  assert.match(extracted, /Tier \| Partner/);
});

test('chunkDocumentText splits long text with bounded chunks', () => {
  const longText = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}: ` + 'x'.repeat(120)).join('\n\n');
  const chunks = chunkDocumentText(longText, 300, 50);
  assert.ok(chunks.length >= 4);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 300);
  }
});

test('cosineSimilarity and retrieveTopChunks rank matching vectors highest', () => {
  assert.equal(Math.round(cosineSimilarity([1, 0], [1, 0]) * 1000), 1000);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);

  const chunks = [
    { id: 'c1', documentId: 'd1', documentTitle: 'Doc A', chunkIndex: 0, content: 'Skincare routine', embedding: [0.9, 0.1] },
    { id: 'c2', documentId: 'd2', documentTitle: 'Doc B', chunkIndex: 0, content: 'Partner commission', embedding: [0.1, 0.9] },
  ];
  const top = retrieveTopChunks([0.05, 0.95], chunks, 1, 0.2);
  assert.equal(top.length, 1);
  assert.equal(top[0].id, 'c2');
});

test('computeMaskedCardBackground calculates focal offset correctly', () => {
  const style = computeMaskedCardBackground({ x: 100, y: 50, sw: 1000, sh: 800 }, 1200, 0.8);
  assert.equal(style.backgroundSize, 'auto 800px');
  assert.equal(style.backgroundPosition, '-260px -50px');
});

test('parseMarkdownBlocks parses headings, lists, and code blocks safely', () => {
  const md = '# Welcome\n\n- Beauty Services\n- Healthy Services\n\n```ts\nconst x = 1;\n```';
  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'ul');
  assert.equal(blocks[2].type, 'code');
  assert.equal(sanitizeLinkUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeLinkUrl('https://tymeofbeauty.com'), 'https://tymeofbeauty.com');
});

test('normalizeAppRoute normalizes Home and Beauty Services routes cleanly', () => {
  assert.equal(normalizeAppRoute('/'), '/');
  assert.equal(normalizeAppRoute('/beauty-services'), '/beauty-services');
  assert.equal(normalizeAppRoute('/beauty-services/'), '/beauty-services');
  assert.equal(normalizeAppRoute('/BEAUTY-SERVICES?ref=nav#faq'), '/beauty-services');
  assert.equal(normalizeAppRoute('/unknown-path'), '/');
});

test('getRouteMetadata returns route-specific SEO metadata without altering Home SEO', () => {
  const homeMeta = getRouteMetadata('/');
  assert.equal(homeMeta.title, 'Tyme of Beauty - Beauty & Healthy Everywhere');
  assert.match(homeMeta.description, /Trusted beauty & wellness services/);

  const beautyMeta = getRouteMetadata('/beauty-services');
  assert.equal(beautyMeta.title, 'Beauty Services | TYME of Beauty');
  assert.match(beautyMeta.description, /AI X FACE/);
  assert.match(beautyMeta.description, /LINE OA/);
});

test('resolveBeautyServicesContactUrl allows valid https URLs and returns null when unconfirmed', () => {
  assert.equal(resolveBeautyServicesContactUrl(null), null);
  assert.equal(resolveBeautyServicesContactUrl(''), null);
  assert.equal(resolveBeautyServicesContactUrl('javascript:void(0)'), null);
  assert.equal(
    resolveBeautyServicesContactUrl('https://line.me/R/ti/p/@tymeclient'),
    'https://line.me/R/ti/p/@tymeclient'
  );
});

