import { AIMessage, HumanMessage, type Message } from '@langchain/core/messages'

import { type CheckpointTuple, IndexedDBSaver } from './checkpoints'

let saver: IndexedDBSaver | null = null

export function getSessionSaver(): IndexedDBSaver {
  if (!saver) {
    saver = new IndexedDBSaver()
  }
  return saver
}

export function parseCheckpointMessages(messages: { type: string; content: string }[]): Message[] {
  return messages
    .filter(msg => ['human', 'ai'].includes(msg.type))
    .map(msg => (msg.type === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)))
}

export async function fetchCheckpointHistory(
  threadId: string,
  checkpointId?: string,
): Promise<{ messages: Message[]; checkpointId: string }> {
  const db = getSessionSaver()

  if (checkpointId) {
    const tuple = await db.getTuple({
      configurable: { thread_id: threadId, checkpoint_id: checkpointId },
    })
    if (tuple) {
      const raw = tuple.checkpoint.channel_values.messages
      if (raw && Array.isArray(raw)) {
        return { messages: parseCheckpointMessages(raw), checkpointId }
      }
    }
    return { messages: [], checkpointId }
  }

  const checkpoints: CheckpointTuple[] = []
  const iter = db.list({ configurable: { thread_id: threadId } })
  for await (const cp of iter) {
    checkpoints.push(cp)
  }

  if (checkpoints.length === 0) {
    return { messages: [], checkpointId: '' }
  }

  checkpoints.sort((a, b) => (a.metadata?.step ?? 0) - (b.metadata?.step ?? 0))
  const latest = checkpoints[checkpoints.length - 1]
  const raw = latest.checkpoint.channel_values.messages

  if (raw && Array.isArray(raw)) {
    return {
      messages: parseCheckpointMessages(raw),
      checkpointId: latest.config.configurable?.checkpoint_id ?? '',
    }
  }

  return { messages: [], checkpointId: '' }
}
