-- Añadir campos para anulación de egresos
ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "cancelled_by" UUID,
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

COMMENT ON COLUMN "public"."expenses"."status" IS 'active | cancelled';
COMMENT ON COLUMN "public"."expenses"."cancelled_at" IS 'Fecha y hora de anulación';
COMMENT ON COLUMN "public"."expenses"."cancelled_by" IS 'Usuario que anuló el egreso';
COMMENT ON COLUMN "public"."expenses"."cancellation_reason" IS 'Motivo de anulación (trazabilidad, mín. 10 caracteres)';

CREATE INDEX IF NOT EXISTS "idx_expenses_status" ON "public"."expenses" ("status");
