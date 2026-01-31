-- Agregar campos de cancelación a la tabla sales
-- Estos campos permiten almacenar información cuando una venta es cancelada

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancelled_by_name VARCHAR(255);

-- Crear índice para búsquedas por estado de cancelación
CREATE INDEX IF NOT EXISTS idx_sales_cancelled_at ON public.sales(cancelled_at);

COMMENT ON COLUMN public.sales.cancellation_reason IS 'Motivo de la cancelación de la venta';
COMMENT ON COLUMN public.sales.cancelled_at IS 'Fecha y hora de la cancelación';
COMMENT ON COLUMN public.sales.cancelled_by IS 'ID del usuario que canceló la venta';
COMMENT ON COLUMN public.sales.cancelled_by_name IS 'Nombre del usuario que canceló la venta';
