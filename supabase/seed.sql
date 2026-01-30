-- ============================================
-- DATOS INICIALES PARA ALEYA SHOP
-- ============================================
-- Este archivo se ejecuta automáticamente cuando haces: supabase db reset
-- Crea el usuario admin y datos de prueba
-- ============================================

-- ============================================
-- 1. CREAR ROL DE SUPERADMIN
-- ============================================
INSERT INTO roles (name, description, permissions, is_system) VALUES
('superadmin', 'Super Administrador con todos los permisos',
  '["all"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREAR USUARIO SUPER ADMIN DE ALEYA
-- ============================================
-- Email: martha@aleyashop.com
-- Password: admin123
INSERT INTO users (name, email, password, role, permissions, is_active) VALUES
(
  'Martha',
  'martha@aleyashop.com',
  'admin123',
  'superadmin',
  '["all"]'::jsonb,
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. CREAR CATEGORÍAS (Productos de Belleza/Accesorios)
-- ============================================
INSERT INTO categories (name, description) VALUES
('Accesorios', 'Aretes, collares, pulseras y más'),
('Maquillaje', 'Productos de maquillaje'),
('Cuidado de Piel', 'Cremas, sueros y tratamientos'),
('Cuidado del Cabello', 'Shampoos, acondicionadores y tratamientos'),
('Perfumes', 'Fragancias y colonias'),
('Bolsos', 'Bolsos, carteras y accesorios'),
('Joyería', 'Joyas finas y bisutería')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CREAR PRODUCTOS DE PRUEBA
-- ============================================
INSERT INTO products (name, description, category_id, brand, reference, price, cost, stock_warehouse, stock_store, status) VALUES
-- Accesorios
(
  'Aretes Dorados Luna',
  'Aretes en forma de luna, baño de oro',
  (SELECT id FROM categories WHERE name = 'Accesorios' LIMIT 1),
  'Aleya Collection',
  'ARE-001',
  25000,
  12000,
  20,
  10,
  'active'
),
(
  'Collar Perlas Naturales',
  'Collar de perlas naturales de agua dulce',
  (SELECT id FROM categories WHERE name = 'Accesorios' LIMIT 1),
  'Aleya Collection',
  'COL-001',
  85000,
  45000,
  8,
  4,
  'active'
),
(
  'Pulsera Plata 925',
  'Pulsera de plata 925 con dijes',
  (SELECT id FROM categories WHERE name = 'Joyería' LIMIT 1),
  'Aleya Premium',
  'PUL-001',
  120000,
  65000,
  5,
  3,
  'active'
),
-- Maquillaje
(
  'Labial Mate Rojo Intenso',
  'Labial mate de larga duración color rojo',
  (SELECT id FROM categories WHERE name = 'Maquillaje' LIMIT 1),
  'Beauty Plus',
  'LAB-001',
  35000,
  18000,
  15,
  8,
  'active'
),
(
  'Paleta de Sombras Nude',
  'Paleta 12 tonos nude y tierra',
  (SELECT id FROM categories WHERE name = 'Maquillaje' LIMIT 1),
  'Glamour',
  'PAL-001',
  75000,
  40000,
  10,
  5,
  'active'
),
(
  'Base Liquida Cobertura Media',
  'Base líquida para todo tipo de piel',
  (SELECT id FROM categories WHERE name = 'Maquillaje' LIMIT 1),
  'Beauty Plus',
  'BAS-001',
  55000,
  28000,
  12,
  6,
  'active'
),
-- Cuidado de Piel
(
  'Serum Vitamina C',
  'Serum facial vitamina C 30ml',
  (SELECT id FROM categories WHERE name = 'Cuidado de Piel' LIMIT 1),
  'Skin Care Pro',
  'SER-001',
  95000,
  50000,
  8,
  4,
  'active'
),
(
  'Crema Hidratante Día',
  'Crema hidratante con protección solar SPF30',
  (SELECT id FROM categories WHERE name = 'Cuidado de Piel' LIMIT 1),
  'Skin Care Pro',
  'CRE-001',
  68000,
  35000,
  10,
  5,
  'active'
),
-- Perfumes
(
  'Perfume Floral Dreams 100ml',
  'Perfume floral con notas de jazmín y rosa',
  (SELECT id FROM categories WHERE name = 'Perfumes' LIMIT 1),
  'Essence',
  'PER-001',
  150000,
  80000,
  6,
  3,
  'active'
),
(
  'Body Mist Vainilla',
  'Splash corporal aroma vainilla 250ml',
  (SELECT id FROM categories WHERE name = 'Perfumes' LIMIT 1),
  'Sweet Scents',
  'BOD-001',
  45000,
  22000,
  15,
  8,
  'active'
),
-- Bolsos
(
  'Bolso Tote Beige',
  'Bolso tote grande color beige',
  (SELECT id FROM categories WHERE name = 'Bolsos' LIMIT 1),
  'Urban Style',
  'BOL-001',
  89000,
  45000,
  5,
  3,
  'active'
),
(
  'Cartera Mini Rosa',
  'Cartera pequeña con cadena color rosa',
  (SELECT id FROM categories WHERE name = 'Bolsos' LIMIT 1),
  'Aleya Collection',
  'CAR-001',
  65000,
  32000,
  8,
  4,
  'active'
)
ON CONFLICT (reference) DO NOTHING;

-- ============================================
-- 5. CREAR CLIENTES DE PRUEBA
-- ============================================
INSERT INTO clients (name, email, phone, document, address, city, type) VALUES
('María Fernanda López', 'maria.lopez@email.com', '3001234567', 'CC-12345678', 'Calle 20 #15-30', 'Sincelejo', 'minorista'),
('Laura Martínez', 'laura.martinez@email.com', '3009876543', 'CC-87654321', 'Carrera 25 #10-15', 'Sincelejo', 'minorista'),
('Carolina Herrera', 'carolina.h@email.com', '3005551234', 'CC-11223344', 'Av. Principal #5-20', 'Sincelejo', 'mayorista')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. CREAR TIENDA PRINCIPAL
-- ============================================
INSERT INTO stores (id, name, address, city, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Aleya Shop', 'Sincelejo, Sucre', 'Sincelejo', true)
ON CONFLICT (id) DO UPDATE SET name = 'Aleya Shop', address = 'Sincelejo, Sucre';

-- ============================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================
SELECT '🌸 Seed de Aleya Shop completado!' as message,
       (SELECT COUNT(*) FROM products) as productos_creados,
       (SELECT COUNT(*) FROM categories) as categorias_creadas,
       (SELECT COUNT(*) FROM users) as usuarios_creados,
       (SELECT COUNT(*) FROM clients) as clientes_creados;
