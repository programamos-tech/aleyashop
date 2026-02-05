-- Solicitud de anulación: cualquier usuario puede pedir anular; super admin ve quién y por qué
ALTER TABLE "public"."expenses"
  ADD COLUMN IF NOT EXISTS "cancellation_requested_at" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "cancellation_requested_by" UUID,
  ADD COLUMN IF NOT EXISTS "cancellation_requested_by_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "cancellation_request_reason" TEXT;

COMMENT ON COLUMN "public"."expenses"."cancellation_requested_at" IS 'Cuándo se solicitó la anulación';
COMMENT ON COLUMN "public"."expenses"."cancellation_requested_by" IS 'Usuario que solicitó la anulación';
COMMENT ON COLUMN "public"."expenses"."cancellation_requested_by_name" IS 'Nombre del usuario que solicitó (para mostrar al super admin)';
COMMENT ON COLUMN "public"."expenses"."cancellation_request_reason" IS 'Motivo indicado por quien solicitó la anulación';
