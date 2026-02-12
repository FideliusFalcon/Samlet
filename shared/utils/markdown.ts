import { marked } from 'marked'

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

export function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string
}
