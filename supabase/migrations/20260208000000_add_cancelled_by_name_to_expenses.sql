-- Nombre de quien aprobó la anulación (para mostrar "Aprobado por Martha")
ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "cancelled_by_name" VARCHAR(255);

COMMENT ON COLUMN "public"."expenses"."cancelled_by_name" IS 'Nombre del usuario que aprobó/anuló el egreso';
