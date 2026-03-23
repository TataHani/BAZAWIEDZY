import { createClient } from '@supabase/supabase-js'
import { PDFParse } from 'pdf-parse'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function splitIntoChunks(text: string, chunkSize = 500, overlap = 100): string[] {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 50)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if ((current + paragraph).length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      const sentences = current.split('. ')
      current = sentences.slice(-2).join('. ') + '. ' + paragraph
    } else {
      current += (current ? '\n\n' : '') + paragraph
    }
  }

  if (current.trim().length > 50) {
    chunks.push(current.trim())
  }

  if (chunks.length === 0) {
    let start = 0
    while (start < text.length) {
      chunks.push(text.slice(start, start + chunkSize).trim())
      start += chunkSize - overlap
    }
  }

  return chunks.filter(c => c.length > 50)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const password = formData.get('password') as string

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Brak uprawnień' }, { status: 401 })
  }

  if (!file || !file.name.endsWith('.pdf')) {
    return Response.json({ error: 'Wymagany plik PDF' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const text = result.text

    if (!text || text.trim().length < 100) {
      return Response.json({ error: 'PDF jest pusty lub nie zawiera tekstu' }, { status: 400 })
    }

    const docName = file.name.replace(/\.pdf$/i, '')
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({ name: docName, filename: file.name })
      .select()
      .single()

    if (docError) {
      return Response.json({ error: docError.message }, { status: 500 })
    }

    const chunks = splitIntoChunks(text)

    const chunksToInsert = chunks.map((content, index) => ({
      document_id: doc.id,
      content,
      chunk_index: index
    }))

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert)

    if (chunksError) {
      await supabase.from('documents').delete().eq('id', doc.id)
      return Response.json({ error: chunksError.message }, { status: 500 })
    }

    await supabase
      .from('documents')
      .update({ chunk_count: chunks.length })
      .eq('id', doc.id)

    return Response.json({ success: true, name: docName, chunks: chunks.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Błąd parsowania PDF'
    return Response.json({ error: message }, { status: 500 })
  }
}
