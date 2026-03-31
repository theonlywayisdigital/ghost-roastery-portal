-- Generic atomic increment RPC for any table/field.
-- Used by automation processor and trigger engine to avoid read-then-write races.
CREATE OR REPLACE FUNCTION public.increment_field(
  table_name TEXT,
  field_name TEXT,
  row_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    table_name, field_name, field_name
  ) USING row_id;
END;
$$;
