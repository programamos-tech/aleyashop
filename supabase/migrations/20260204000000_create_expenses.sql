-- Crear tabla de egresos (expenses)
CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "store_id" UUID,
    "category" VARCHAR(255) NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "payment_method" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expenses_store_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "public"."expenses" ("date");
CREATE INDEX IF NOT EXISTS "idx_expenses_category" ON "public"."expenses" ("category");
CREATE INDEX IF NOT EXISTS "idx_expenses_payment_method" ON "public"."expenses" ("payment_method");
CREATE INDEX IF NOT EXISTS "idx_expenses_store_id" ON "public"."expenses" ("store_id");

-- Comentarios
COMMENT ON TABLE "public"."expenses" IS 'Registro de egresos y gastos';
COMMENT ON COLUMN "public"."expenses"."category" IS 'Categoría del egreso';
COMMENT ON COLUMN "public"."expenses"."amount" IS 'Valor del egreso en COP (sin decimales)';
COMMENT ON COLUMN "public"."expenses"."payment_method" IS 'Método de pago del egreso';
COMMENT ON COLUMN "public"."expenses"."notes" IS 'Notas adicionales del egreso';

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_expenses_updated_at ON "public"."expenses";
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON "public"."expenses"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
