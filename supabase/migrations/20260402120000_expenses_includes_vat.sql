-- Si el egreso fue registrado con IVA incluido en el monto, la ganancia neta usa base sin IVA (÷ 1,19).
-- Si no (ej. nómina, pago informal), se resta el monto completo.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS includes_vat boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.expenses.includes_vat IS 'true = el monto incluye IVA 19%; al calcular ganancia neta se usa base sin IVA. false = monto sin IVA, se resta íntegro.';
