import { buildModel, executeStream } from './streamCore'
import type { ProviderOptions } from './types'

export async function getChatResponse(options: ProviderOptions): Promise<void> {
  const model = buildModel(options.provider, options as unknown as Record<string, unknown>)

  return executeStream(
    model,
    {
      messages: options.messages,
      errorIssue: options.errorIssue,
      loading: options.loading,
      abortSignal: options.abortSignal,
      threadId: options.threadId,
      onStream: options.onStream,
    },
    {
      streamMode: 'messages',
      processChunk(chunk, fullContent) {
        const content =
          typeof (chunk as [{ content: unknown }])[0].content === 'string'
            ? (chunk as [{ content: string }])[0].content
            : ''
        return fullContent + content
      },
    },
  )
}
