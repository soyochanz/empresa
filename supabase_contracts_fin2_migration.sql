-- Añade la modalidad de financiación a 2 meses a contratos ya existentes.
ALTER TABLE contracts_althera
  ADD COLUMN IF NOT EXISTS "fin2Total" NUMERIC,
  ADD COLUMN IF NOT EXISTS "fin2Cuota" NUMERIC,
  ADD COLUMN IF NOT EXISTS "fin2Coste" NUMERIC;
