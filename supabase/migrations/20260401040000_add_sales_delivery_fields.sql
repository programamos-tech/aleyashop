-- Domicilio: columnas usadas por la app (createSale, dashboard, cierre de caja)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS is_delivery boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12, 2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.sales.is_delivery IS 'true = venta con entrega a domicilio';
COMMENT ON COLUMN public.sales.delivery_fee IS 'Valor cobrado por domicilio (sin IVA adicional en la app)';
