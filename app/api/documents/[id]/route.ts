import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', params.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
