import type { Ref } from 'vue'

import { WordFormatter } from '@/utils/wordFormatter'

export function insertResult(result: string, insertType: Ref<string>): void {
  const paragraph = result
    .replace(/(\r\n|\n|\r)/g, '\n')
    .replace(/\n+/g, '\n')
    .split('\n')

  const insertParagraphs = (context: Word.RequestContext, range: Word.Range, mode: string) => {
    range.insertText(paragraph[0], mode as Word.InsertLocation)
    for (let i = paragraph.length - 1; i > 0; i--) {
      range.insertParagraph(paragraph[i], 'After')
    }
    return context.sync()
  }

  switch (insertType.value) {
    case 'replace':
      Word.run(async context => {
        await insertParagraphs(context, context.document.getSelection(), 'Replace')
      })
      break
    case 'append':
      Word.run(async context => {
        await insertParagraphs(context, context.document.getSelection(), 'End')
      })
      break
    case 'newLine':
      Word.run(async context => {
        const range = context.document.getSelection()
        for (let i = paragraph.length - 1; i >= 0; i--) {
          range.insertParagraph(paragraph[i], 'After')
        }
        await context.sync()
      })
      break
    case 'NoAction':
      break
  }
}

export async function insertFormattedResult(result: string, insertType: Ref<string>): Promise<void> {
  try {
    await WordFormatter.insertFormattedResult(result, insertType)
  } catch (error) {
    console.warn('Formatted insertion failed, falling back to plain text:', error)
    insertResult(result, insertType)
  }
}
