import { supabase } from './supabase'
import { CompanyConfig } from '@/types'

export class CompanyService {
  // Obtener configuración de la empresa
  static async getCompanyConfig(): Promise<CompanyConfig | null> {
    try {
      const { data, error } = await supabase
        .from('company_config')
        .select('*')
        .limit(1)
        .single()

      if (error) {
      // Error silencioso en producción
        return null
      }

      return {
        id: data.id,
        name: data.name,
        nit: data.nit,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        dianResolution: data.dian_resolution,
        numberingRange: data.numbering_range,
        isIvaResponsible: data.is_iva_responsible ?? true,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Crear o actualizar configuración de la empresa
  static async upsertCompanyConfig(config: Partial<CompanyConfig>): Promise<CompanyConfig | null> {
    try {
      const configData = {
        name: config.name,
        nit: config.nit,
        address: config.address,
        phone: config.phone,
        email: config.email,
        logo: config.logo,
        dian_resolution: config.dianResolution,
        numbering_range: config.numberingRange,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('company_config')
        .upsert(configData, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        return null
      }

      return {
        id: data.id,
        name: data.name,
        nit: data.nit,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        dianResolution: data.dian_resolution,
        numberingRange: data.numbering_range,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  // Inicializar configuración por defecto de Aleya Shop
  static async initializeDefaultConfig(): Promise<CompanyConfig | null> {
    const defaultConfig = {
      name: 'Aleya Shop SAS',
      nit: '901522077',
      address: 'Calle 28 N25B - 365 interior 01203 barrio Boston',
      phone: '320 5848594',
      email: 'info@aleyashop.com',
      logo: '/logo.jpeg',
      dianResolution: undefined,
      numberingRange: undefined,
      isIvaResponsible: true
    }

    try {
      // Intentar crear la configuración directamente
      const { data, error } = await supabase
        .from('company_config')
        .insert([{
          name: defaultConfig.name,
          nit: defaultConfig.nit,
          address: defaultConfig.address,
          phone: defaultConfig.phone,
          email: defaultConfig.email,
          logo: defaultConfig.logo,
          dian_resolution: defaultConfig.dianResolution,
          numbering_range: defaultConfig.numberingRange
        }])
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        return null
      }

      return {
        id: data.id,
        name: data.name,
        nit: data.nit,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        dianResolution: data.dian_resolution,
        numberingRange: data.numbering_range,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }
}
