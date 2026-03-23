import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

async function extractKeywords(question: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Jesteś ekspertem od wyszukiwania w dokumentach branży motoryzacyjnej.
Podaj 8 słów które PRAWDOPODOBNIE POJAWIAJĄ SIĘ W TEKŚCIE DOKUMENTU jako odpowiedź na to pytanie.
Myśl o konkretnych słowach z treści odpowiedzi, nie z pytania.
Podaj TYLKO słowa oddzielone przecinkami, bez żadnego innego tekstu.

Przykład: pytanie "jakie są zalety EV?" → słowa odpowiedzi: "zasięg, ładowanie, emisja, koszty, bateria, ekologia, prąd, spalanie"

Pytanie: ${question}`
    }]
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return text.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 2)
}

async function searchChunks(keywords: string[], question: string) {
  const scores = new Map<string, { score: number; content: string; document_name: string }>()

  // Full-text search
  const { data: ftsChunks } = await supabase
    .rpc('search_chunks', { query: question, match_count: 5 })

  for (const chunk of (ftsChunks || [])) {
    scores.set(chunk.id, {
      score: (chunk.rank || 0) * 10,
      content: chunk.content,
      document_name: chunk.document_name
    })
  }

  // Score each chunk by keyword frequency — no limit, all matching chunks
  // Stem keywords by removing last 2 chars (handles Polish inflection: cena→cen, ładowanie→ładowan)
  for (const keyword of keywords) {
    const stem = keyword.length > 5 ? keyword.slice(0, -2) : keyword.slice(0, 3)
    const { data: kwChunks } = await supabase
      .from('document_chunks')
      .select('id, content, documents(name)')
      .ilike('content', `%${stem}%`)

    for (const chunk of (kwChunks || [])) {
      const docName = (chunk.documents as unknown as { name: string } | null)?.name || 'Dokument'
      const existing = scores.get(chunk.id)
      if (existing) {
        existing.score += 1
      } else {
        scores.set(chunk.id, { score: 1, content: chunk.content, document_name: docName })
      }
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 15)
    .map(([id, data]) => ({ id, content: data.content, document_name: data.document_name, rank: data.score }))
}

export async function POST(request: Request) {
  const { question } = await request.json()

  if (!question?.trim()) {
    return Response.json({ error: 'Brak pytania' }, { status: 400 })
  }

  const keywords = await extractKeywords(question)
  const chunks = await searchChunks(keywords, question.trim())

  const context = chunks.length > 0
    ? chunks.map((c: { document_name: string; content: string }) =>
        `[Źródło: ${c.document_name}]\n${c.content}`
      ).join('\n\n---\n\n')
    : 'Brak dokumentów w bazie wiedzy.'

  const sources: string[] = chunks.length > 0
    ? [...new Set(chunks.map((c: { document_name: string }) => c.document_name))] as string[]
    : []

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Jesteś asystentem bazy wiedzy produktowej dealera samochodowego Plichta.
Odpowiadaj WYŁĄCZNIE na podstawie poniższych fragmentów dokumentów.
Jeśli odpowiedzi nie ma w dokumentach, napisz: "Nie znalazłem tej informacji w bazie wiedzy."
Nie wymyślaj, nie korzystaj z wiedzy ogólnej.
Odpowiadaj po polsku, konkretnie i zwięźle.

DOKUMENTY Z BAZY WIEDZY:
${context}

PYTANIE: ${question}`
    }]
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''

  return Response.json({ answer, sources })
}
