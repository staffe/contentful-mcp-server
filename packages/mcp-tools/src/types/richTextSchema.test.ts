import { BLOCKS, INLINES } from '@contentful/rich-text-types';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { describe, expect, it } from 'vitest';

import { richTextDocumentSchema } from './richTextSchema.js';

const documentWithHyperlink = (uri: string) => ({
  nodeType: BLOCKS.DOCUMENT,
  data: {},
  content: [
    {
      nodeType: BLOCKS.PARAGRAPH,
      data: {},
      content: [
        {
          nodeType: INLINES.HYPERLINK,
          data: { uri },
          content: [{ nodeType: 'text', value: 'Link', marks: [], data: {} }],
        },
      ],
    },
  ],
});

describe('richTextDocumentSchema hyperlinks', () => {
  it.each([
    'https://example.com/articles?view=full#questions',
    'http://example.com',
    'mailto:hello@example.com',
    '/',
    '/articles',
    '/articles?view=full#frågor-och-svar',
    '/articles%20and%20answers',
  ])('accepts %s without changing the document', (uri) => {
    const document = documentWithHyperlink(uri);
    expect(richTextDocumentSchema.parse(document)).toEqual(document);
  });

  it.each([
    '',
    'articles',
    './articles',
    '../articles',
    '?view=full',
    '#questions',
    '//example.com',
    '///example.com',
    '/\\example.com',
    '/articles\\answers',
    '/articles and answers',
    '/articles\tanswers',
    '/articles\nanswers',
    '/articles\n',
    '/articles\u0000answers',
    '/articles\u001fanswers',
    '/articles\u007fanswers',
    '/articles\u00a0answers',
  ])('rejects invalid relative link %j', (uri) => {
    expect(
      richTextDocumentSchema.safeParse(documentWithHyperlink(uri)).success,
    ).toBe(false);
  });

  it('advertises both absolute and root-relative URL branches to MCP clients', () => {
    const schema = toJsonSchemaCompat(richTextDocumentSchema);

    expect(JSON.stringify(schema)).toContain(
      JSON.stringify({
        anyOf: [
          { type: 'string', format: 'uri' },
          {
            type: 'string',
            pattern: '^\\/(?!\\/)[^\\s\\\\\\u0000-\\u001f\\u007f]*$',
          },
        ],
      }),
    );
  });
});
