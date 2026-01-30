/**
 * Configuración del Tenant (Cliente)
 * 
 * Este archivo centraliza toda la configuración específica del cliente.
 * Para crear un nuevo cliente, solo necesitas modificar estos valores.
 */

export const TENANT_CONFIG = {
  // Información básica
  name: 'Aleya Shop',
  shortName: 'Aleya',
  slug: 'aleya',
  
  // Branding
  logo: '/logo.jpeg',
  logoAlt: 'Aleya Shop Logo',
  favicon: '/favicon.png',
  
  // Colores (Tailwind classes) - Rosa pastel Aleya
  colors: {
    primary: '#f29fc8',     // Color principal exacto de Aleya
    primaryLight: '#fce4f0', // Versión clara para fondos
    primaryDark: '#e07ab0',  // Versión oscura para hover
    secondary: 'pink',
    accent: 'rose',
  },
  
  // Información de la empresa
  company: {
    name: 'Aleya Shop',
    nit: '',
    address: 'Sincelejo, Sucre',
    phone: '',
    email: 'info@aleyashop.com',
  },
  
  // Storage keys (para localStorage/cookies)
  storageKeys: {
    user: 'aleya_user',
    theme: 'aleya_theme',
    store: 'aleya_store',
  },
  
  // Módulos activos (feature flags)
  features: {
    dashboard: true,
    clients: true,
    products: true,
    sales: true,
    warranties: false,     // Aleya no necesita garantías
    inventory: true,
    logs: true,
    roles: true,
    stores: false,         // Solo tiene una tienda
    credits: true,
    payments: true,
  },
  
  // Configuración adicional
  settings: {
    currency: 'COP',
    locale: 'es-CO',
    timezone: 'America/Bogota',
    showDeliveryPrice: true,  // Feature específica de Aleya
  },
  
  // Soporte
  support: {
    whatsapp: '573001234567',
    message: 'Hola! Necesito soporte técnico en Aleya Shop.',
  },
}

// Exportar valores individuales para facilitar imports
export const TENANT_NAME = TENANT_CONFIG.name
export const TENANT_SLUG = TENANT_CONFIG.slug
export const STORAGE_KEY_USER = TENANT_CONFIG.storageKeys.user
export const FEATURES = TENANT_CONFIG.features
