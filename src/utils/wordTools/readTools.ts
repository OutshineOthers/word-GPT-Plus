import { runWithBody, runWithSelection, searchInDocument } from './helpers'

const readToolDefinitions: Record<string, WordToolDefinition> = {
  getSelectedText: {
    name: 'getSelectedText',
    description:
      'Get the currently selected text in the Word document. Returns the selected text or empty string if nothing is selected.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () =>
      runWithSelection(async (_ctx, range) => {
        range.load('text')
        await _ctx.sync()
        return range.text || ''
      }),
  },

  getDocumentContent: {
    name: 'getDocumentContent',
    description: 'Get the full content of the Word document body as plain text.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () =>
      runWithBody(async (ctx, body) => {
        body.load('text')
        await ctx.sync()
        return body.text || ''
      }),
  },

  getDocumentProperties: {
    name: 'getDocumentProperties',
    description: 'Get document properties including paragraph count, word count, and character count.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () =>
      runWithBody(async (ctx, body) => {
        body.load(['text'])
        const paragraphs = body.paragraphs
        paragraphs.load('items')
        await ctx.sync()

        const text = body.text || ''
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length

        return JSON.stringify(
          { paragraphCount: paragraphs.items.length, wordCount, characterCount: text.length },
          null,
          2,
        )
      }),
  },

  getRangeInfo: {
    name: 'getRangeInfo',
    description: 'Get detailed information about the current selection including text, formatting, and position.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () =>
      runWithSelection(async (ctx, range) => {
        range.load([
          'text',
          'style',
          'font/name',
          'font/size',
          'font/bold',
          'font/italic',
          'font/underline',
          'font/color',
        ])
        await ctx.sync()

        return JSON.stringify(
          {
            text: range.text || '',
            style: range.style,
            font: {
              name: range.font.name,
              size: range.font.size,
              bold: range.font.bold,
              italic: range.font.italic,
              underline: range.font.underline,
              color: range.font.color,
            },
          },
          null,
          2,
        )
      }),
  },

  getTableInfo: {
    name: 'getTableInfo',
    description: 'Get information about tables in the document, including row and column counts.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    execute: async () =>
      runWithBody(async (ctx, body) => {
        const tables = body.tables
        tables.load(['items'])
        await ctx.sync()

        for (const table of tables.items) {
          table.load(['rowCount', 'values'])
        }
        await ctx.sync()

        const tableInfos = tables.items.map((table, i) => {
          const columnCount = table.values && table.values[0] ? table.values[0].length : 0
          return { index: i, rowCount: table.rowCount, columnCount }
        })

        return JSON.stringify({ tableCount: tables.items.length, tables: tableInfos }, null, 2)
      }),
  },

  findText: {
    name: 'findText',
    description: 'Find text in the document and return information about matches. Does not modify the document.',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: { type: 'string', description: 'The text to search for' },
        matchCase: { type: 'boolean', description: 'Whether to match case (default: false)' },
        matchWholeWord: { type: 'boolean', description: 'Whether to match whole word only (default: false)' },
      },
      required: ['searchText'],
    },
    execute: async args => {
      const { searchText, matchCase, matchWholeWord } = args as {
        searchText: string
        matchCase?: boolean
        matchWholeWord?: boolean
      }
      const { count } = await searchInDocument(searchText, { matchCase, matchWholeWord })
      return JSON.stringify({ searchText, matchCount: count, found: count > 0 }, null, 2)
    },
  },
}

export default readToolDefinitions
