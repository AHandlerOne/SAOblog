import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const markdown = new (MarkdownIt as any)({
  html: true,
  linkify: true,
  breaks: true,
})

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
} as const

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i

export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) {
    return ''
  }

  return DOMPurify.sanitize(input, SANITIZE_OPTIONS) as string
}

export function renderSafeRichText(input: string | null | undefined): string {
  if (!input) {
    return ''
  }

  const source = input.trim()
  if (!source) {
    return ''
  }

  if (HTML_TAG_PATTERN.test(source)) {
    return sanitizeRichHtml(source)
  }

  return sanitizeRichHtml(markdown.render(source))
}
