type DiscoverableWork = {
  title: string
  description?: string | null
  content?: string | null
  coverImage?: string | null
  tags: string[]
  likeCount: number
  favoriteCount: number
  viewCount?: number
  createdAt: Date
  _count?: { comments: number }
}

type RankedTag = {
  name: string
  count: number
}

const LOW_SIGNAL_TITLE_PATTERNS = [
  /^(test|demo|hello|aaa+|asd+|qwe+|123+|111+|666+|abc+)$/i,
  /^(测试|试试|哈哈+|呵呵+|啊啊+|哇哈哈哈|随便写写|占位|16\.5)$/i,
  /^[_\-.0-9a-z]{1,3}$/i,
]

const RISKY_FRAGMENTS = [
  '去死',
  '傻逼',
  '操你',
  '台独',
  '港独',
  '法轮功',
]

function normalizeText(input: string | null | undefined): string {
  return (input || '').trim().replace(/\s+/g, ' ')
}

function countUniqueChars(input: string): number {
  return new Set(Array.from(input)).size
}

function hasRiskyFragment(text: string): boolean {
  const normalized = text.toLowerCase()
  return RISKY_FRAGMENTS.some((fragment) => normalized.includes(fragment.toLowerCase()))
}

function getLowSignalPenalty(title: string): number {
  if (!title) return 24
  if (LOW_SIGNAL_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return 24
  if (title.length <= 2) return 12
  if (title.length >= 4 && countUniqueChars(title) <= 2) return 14
  return 0
}

export function calculatePublicHotScore(work: DiscoverableWork): number {
  const hoursSincePublished = Math.max(
    1,
    (Date.now() - work.createdAt.getTime()) / (1000 * 60 * 60),
  )
  const comments = work._count?.comments || 0
  const engagement = work.likeCount + work.favoriteCount * 2 + comments * 3

  return engagement / Math.pow(hoursSincePublished + 2, 1.5)
}

export function getPublicWorkQualityScore(work: DiscoverableWork): number {
  const title = normalizeText(work.title)
  const description = normalizeText(work.description)
  const content = normalizeText(work.content)
  const comments = work._count?.comments || 0

  let score = 0
  score += work.coverImage ? 10 : 0
  score += Math.min(work.tags.length, 4) * 2
  score += description.length >= 24 ? 8 : description.length >= 8 ? 4 : 0
  score += content.length >= 120 ? 6 : content.length >= 40 ? 3 : 0
  score += title.length >= 4 && title.length <= 36 ? 8 : title.length >= 2 ? 3 : -8
  score += Math.min(work.likeCount, 30) * 1.2
  score += Math.min(work.favoriteCount, 20) * 1.8
  score += Math.min(comments, 20) * 2.4
  score += Math.min((work.viewCount || 0) / 20, 18)
  score -= getLowSignalPenalty(title)

  if (hasRiskyFragment(`${title} ${description}`)) {
    score -= 40
  }

  return Math.round(score)
}

export function getPublicRecommendationScore(work: DiscoverableWork): number {
  const quality = getPublicWorkQualityScore(work)
  const hotness = calculatePublicHotScore(work)

  return quality * 1.3 + hotness * 20
}

export function isEligibleForPublicDiscovery(work: DiscoverableWork, minScore = 18): boolean {
  const title = normalizeText(work.title)
  const description = normalizeText(work.description)

  if (!title) return false
  if (hasRiskyFragment(`${title} ${description}`)) return false

  return getPublicWorkQualityScore(work) >= minScore
}

export function extractHotTagsFromWorks<T extends DiscoverableWork>(
  works: T[],
  limit = 10,
): RankedTag[] {
  const tagMap = new Map<string, number>()

  for (const work of works) {
    const weight = Math.max(1, Math.round(getPublicRecommendationScore(work) / 20))
    for (const rawTag of work.tags) {
      const tag = normalizeText(rawTag)
      if (!tag || tag.length < 2 || tag.length > 20) continue
      tagMap.set(tag, (tagMap.get(tag) || 0) + weight)
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit)
}
