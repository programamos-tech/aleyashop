'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { SalesProvider } from '@/contexts/sales-context'
import { CategoriesProvider } from '@/contexts/categories-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ClientsProvider } from '@/contexts/clients-context'
import { WarrantyProvider } from '@/contexts/warranty-context'
import { ConditionalLayout } from '@/components/layout/conditional-layout'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CategoriesProvider>
        <ProductsProvider>
          <ClientsProvider>
            <SalesProvider>
              <WarrantyProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </WarrantyProvider>
            </SalesProvider>
          </ClientsProvider>
        </ProductsProvider>
      </CategoriesProvider>
    </AuthProvider>
  )
}
