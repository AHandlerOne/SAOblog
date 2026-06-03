import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { config } from '../../config/index.js'
import { requireAuth } from '../../common/middleware/auth.js'

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
  mode: z.enum(['qa', 'creative']).default('qa'),
})

type AiMode = z.infer<typeof chatSchema>['mode']

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type OpenAIResponsesResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
}

function stripHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function clampText(value: string | null | undefined, maxLength: number): string {
  const normalized = stripHtml(value)
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function buildSystemPrompt(mode: AiMode, nickname?: string): string {
  const creativeRule = mode === 'creative'
    ? 'When the user requests titles, summaries, tags, outlines, snippets, publishing copy, or short creative writing for this website, provide the result directly.'
    : 'Prioritize clear factual answers about the project and its content.'

  const userLine = nickname
    ? `The current user nickname is "${nickname}". If natural, you may address them once by name.`
    : 'The current user is anonymous.'

  return [
    'You are Asuna, the in-site AI guide for SAO Blog.',
    'Your tone should feel like Asuna: warm, composed, capable, considerate, and lightly confident.',
    'Do not become theatrical or overly roleplay-heavy.',
    'You must only help with this project and its direct scope: site features, SAO story arcs, characters, galleries, news, community works, creator workflows, and creation assistance for this website.',
    'If the user asks something outside this project, politely refuse and guide them back to SAO Blog related help.',
    'Do not invent unsupported facts about features, moderation rules, content, or project data. If context is missing, say so clearly.',
    creativeRule,
    'Keep answers concise and useful by default.',
    userLine,
  ].join(' ')
}

async function buildProjectContext(): Promise<string> {
  const [characters, arcs, works, news] = await Promise.all([
    prisma.character.findMany({
      take: 6,
      orderBy: { id: 'asc' },
      select: {
        name: true,
        affiliation: true,
        weapon: true,
        description: true,
      },
    }),
    prisma.arc.findMany({
      take: 6,
      orderBy: { sortOrder: 'asc' },
      select: {
        name: true,
        season: true,
        synopsis: true,
        _count: { select: { chapters: true } },
      },
    }),
    prisma.work.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        visibility: 'VISIBLE',
      },
      take: 6,
      orderBy: [
        { likeCount: 'desc' },
        { favoriteCount: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        title: true,
        description: true,
        type: true,
        tags: true,
        author: { select: { nickname: true } },
      },
    }),
    prisma.news.findMany({
      take: 4,
      orderBy: { publishedAt: 'desc' },
      select: {
        title: true,
        category: true,
        content: true,
      },
    }),
  ])

  return [
    'Project scope:',
    '- Main sections: Home, Story, Characters, Gallery, News, Community Works, Search, Creator Center, Notifications, Admin.',
    '- Community features: publish works, browse public works, likes, favorites, comments, profiles, creator dashboard.',
    '- Creative assistance should focus on titles, summaries, tags, outlines, short copy, and project-fit content ideas.',
    '',
    'Characters:',
    ...(characters.length > 0
      ? characters.map((character) => (
          `- ${character.name}: ${clampText([
            character.affiliation ? `Affiliation ${character.affiliation}.` : '',
            character.weapon ? `Weapon ${character.weapon}.` : '',
            character.description,
          ].filter(Boolean).join(' '), 150)}`
        ))
      : ['- No character data available.']),
    '',
    'Story arcs:',
    ...(arcs.length > 0
      ? arcs.map((arc) => (
          `- ${arc.name}${arc.season ? ` (${arc.season})` : ''}: ${arc._count.chapters} chapters. ${clampText(arc.synopsis, 140)}`
        ))
      : ['- No arc data available.']),
    '',
    'Representative public works:',
    ...(works.length > 0
      ? works.map((work) => (
          `- ${work.title} [${work.type}] by ${work.author.nickname}: ${clampText(work.description, 120)}${work.tags.length ? ` Tags: ${work.tags.slice(0, 5).join(', ')}` : ''}`
        ))
      : ['- No public works available.']),
    '',
    'Recent news:',
    ...(news.length > 0
      ? news.map((item) => `- ${item.title} [${item.category}]: ${clampText(item.content, 100)}`)
      : ['- No news available.']),
  ].join('\n')
}

function extractResponsesText(data: OpenAIResponsesResponse): string {
  if (data.output_text?.trim()) {
    return data.output_text.trim()
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? '')
    .join('')
    .trim()

  return text || ''
}

async function requestResponses(systemPrompt: string, context: string, message: string, mode: AiMode): Promise<string> {
  const response = await fetch(`${config.OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      instructions: `${systemPrompt}\n\nContext:\n${context}`,
      input: message,
      temperature: mode === 'creative' ? 0.9 : 0.5,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI Responses request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json() as OpenAIResponsesResponse
  const content = extractResponsesText(data)

  if (!content) {
    throw new Error('OpenAI Responses returned an empty response')
  }

  return content
}

async function requestChatCompletions(systemPrompt: string, context: string, message: string, mode: AiMode): Promise<string> {
  const response = await fetch(`${config.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      temperature: mode === 'creative' ? 0.9 : 0.5,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\nContext:\n${context}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json() as OpenAIChatResponse
  const content = data.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('OpenAI returned an empty response')
  }

  return content
}

async function requestOpenAI(systemPrompt: string, context: string, message: string, mode: AiMode): Promise<string> {
  if (config.OPENAI_WIRE_API === 'responses') {
    return requestResponses(systemPrompt, context, message, mode)
  }

  return requestChatCompletions(systemPrompt, context, message, mode)
}

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/ai/chat', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const canUseAi = request.user?.aiAccess
      || request.user?.role === 'ADMIN'
      || request.user?.role === 'MODERATOR'

    if (!canUseAi) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'AI assistant access has not been enabled for this account yet.',
      })
    }

    if (!config.OPENAI_API_KEY) {
      return reply.code(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'AI assistant is not configured. Please set OPENAI_API_KEY first.',
      })
    }

    const parsed = chatSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue) => issue.message).join('; '),
      })
    }

    const { message, mode } = parsed.data

    try {
      const [systemPrompt, projectContext] = await Promise.all([
        Promise.resolve(buildSystemPrompt(mode, request.user?.nickname)),
        buildProjectContext(),
      ])

      const content = await requestOpenAI(systemPrompt, projectContext, message, mode)

      return reply.send({
        data: {
          role: 'assistant',
          content,
          persona: 'Asuna',
          mode,
        },
      })
    } catch (error) {
      request.log.error(error)
      return reply.code(502).send({
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'AI assistant request failed. Please try again later.',
      })
    }
  })
}
