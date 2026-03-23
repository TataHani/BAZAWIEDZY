-- Tabela dokumentów
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela fragmentów tekstu
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funkcja wyszukiwania pełnotekstowego
CREATE OR REPLACE FUNCTION search_chunks(query TEXT, match_count INT DEFAULT 6)
RETURNS TABLE(id UUID, content TEXT, document_name TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    d.name AS document_name,
    ts_rank(to_tsvector('simple', dc.content), websearch_to_tsquery('simple', query)) AS rank
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE to_tsvector('simple', dc.content) @@ websearch_to_tsquery('simple', query)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
