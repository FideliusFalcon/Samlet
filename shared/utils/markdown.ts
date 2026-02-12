import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

function escapeHtmlChars(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }: { text: string }) {
      return escapeHtmlChars(text)
    },
  },
})

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html)
}

export function renderMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string
  return sanitizeHtml(html)
}
