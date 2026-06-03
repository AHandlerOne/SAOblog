import api from './index'

export type AiMode = 'qa' | 'creative'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export const aiApi = {
  async chat(payload: { message: string; mode: AiMode }): Promise<{ data: { role: 'assistant'; content: string; persona: string; mode: AiMode } }> {
    const { data } = await api.post<{ data: { role: 'assistant'; content: string; persona: string; mode: AiMode } }>('/ai/chat', payload, {
      timeout: 5 * 60 * 1000,
    })
    return data
  },
}
