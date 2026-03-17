export async function runWithSelection<T>(
  fn: (context: Word.RequestContext, range: Word.Range) => Promise<T>,
): Promise<T> {
  return Word.run(async context => {
    const range = context.document.getSelection()
    return fn(context, range)
  })
}

export async function runWithBody<T>(fn: (context: Word.RequestContext, body: Word.Body) => Promise<T>): Promise<T> {
  return Word.run(async context => {
    return fn(context, context.document.body)
  })
}

export interface SearchOptions {
  matchCase?: boolean
  matchWholeWord?: boolean
}

export async function searchInDocument(
  searchText: string,
  options: SearchOptions = {},
): Promise<{ items: Word.Range[]; count: number }> {
  return Word.run(async context => {
    const body = context.document.body
    const searchResults = body.search(searchText, {
      matchCase: options.matchCase ?? false,
      matchWholeWord: options.matchWholeWord ?? false,
    })
    searchResults.load('items')
    await context.sync()
    return { items: searchResults.items, count: searchResults.items.length }
  })
}

export function normalizeBookmarkName(name: string): string {
  return name.replace(/\s+/g, '_')
}
