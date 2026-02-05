-- Notificaciones para solicitudes de anulación (y futuras notificaciones)
CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "user_id" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "read_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

COMMENT ON TABLE "public"."notifications" IS 'Notificaciones para usuarios (ej. anulación aprobada/rechazada)';
COMMENT ON COLUMN "public"."notifications"."type" IS 'expense_cancellation_approved | expense_cancellation_rejected';
COMMENT ON COLUMN "public"."notifications"."metadata" IS 'Datos extra: expense_id, expense_category, amount, etc.';

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_read_at" ON "public"."notifications" ("read_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" ("created_at" DESC);
