import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  disallowedTagsMode: 'discard',
}

export function sanitizeRichContent(input: string): string {
  return sanitizeHtml(input, SANITIZE_OPTIONS)
}
