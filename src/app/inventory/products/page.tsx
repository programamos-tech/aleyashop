'use client'

import { useState, useEffect } from 'react'
import { ProductTable } from '@/components/products/product-table'
import { ProductModal } from '@/components/products/product-modal'
import { CategoryModal } from '@/components/categories/category-modal'
import { StockAdjustmentModal } from '@/components/products/stock-adjustment-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useProducts } from '@/contexts/products-context'
import { useCategories } from '@/contexts/categories-context'
import { ProductsService } from '@/lib/products-service'
import { Product, Category } from '@/types'
import { toast } from 'sonner'

export default function ProductsPage() {
  const { products, loading, currentPage, totalProducts, hasMore, isSearching, stockFilter, setStockFilter, createProduct, updateProduct, deleteProduct, adjustStock, refreshProducts, goToPage, searchProducts, productsLastUpdated } = useProducts()
  const { categories, createCategory, toggleCategoryStatus, deleteCategory } = useCategories()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null)
  const [totalStock, setTotalStock] = useState<number>(0)

  // Obtener stock total de TODOS los productos (no solo los de la página actual)
  useEffect(() => {
    const fetchTotalStock = async () => {
      const total = await ProductsService.getTotalStock()
      setTotalStock(total)
    }
    fetchTotalStock()
  }, [products, productsLastUpdated])

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteProduct(productToDelete.id)
      if (result.success) {
        toast.success('Producto eliminado exitosamente')
        setIsDeleteModalOpen(false)
        setProductToDelete(null)
      } else {
        setDeleteError(result.error || 'Error eliminando producto')
      }
    } catch (e) {
      console.error('[Products] confirmDelete error:', e)
      setDeleteError('Error al eliminar el producto. Intenta de nuevo.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStockAdjustment = (product: Product) => {
    setProductToAdjust(product)
    setIsAdjustmentModalOpen(true)
  }

  const handleAdjustStock = async (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => {
    const success = await adjustStock(productId, location, newQuantity, reason)
    
    if (success) {
      toast.success('Stock ajustado exitosamente')
      setIsAdjustmentModalOpen(false)
      setProductToAdjust(null)
    } else {
      toast.error('Error ajustando stock')
    }
  }

  const handleManageCategories = () => {
    setSelectedCategory(null)
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const success = await createCategory(categoryData)
    if (success) {
      toast.success('Categoría creada exitosamente')
      // No cerrar el modal para que el usuario pueda ver la categoría creada
      // setIsCategoryModalOpen(false)
      // setSelectedCategory(null)
    } else {
      toast.error('Error creando categoría')
    }
  }

  const handleToggleCategoryStatus = async (categoryId: string, newStatus: 'active' | 'inactive') => {
    const success = await toggleCategoryStatus(categoryId, newStatus)
    if (success) {
      const statusText = newStatus === 'active' ? 'habilitada' : 'deshabilitada'
      toast.success(`Categoría ${statusText} exitosamente`)
    } else {
      toast.error('Error cambiando estado de categoría')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const success = await deleteCategory(categoryId)
    if (success) {
      toast.success('Categoría eliminada exitosamente')
    } else {
      toast.error('Error eliminando categoría')
    }
  }

  const handleCreate = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleRefresh = async () => {
    await refreshProducts()
    toast.success('Productos actualizados')
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    if (selectedProduct) {
      // Edit existing product
      const success = await updateProduct(selectedProduct.id, productData)
      if (success) {
        toast.success('Producto actualizado exitosamente')
        setIsModalOpen(false)
        setSelectedProduct(null)
      } else {
        toast.error('Error actualizando producto')
      }
    } else {
      // Create new product
      const success = await createProduct(productData)
      if (success) {
        toast.success('Producto creado exitosamente')
        setIsModalOpen(false)
      } else {
        toast.error('Error creando producto')
      }
    }
  }


  // Siempre renderizamos la página para no perder el estado del buscador

  return (
    <RoleProtectedRoute module="products" requiredAction="view">
      <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900">
      <ProductTable
        totalStock={totalStock}
        products={products}
        categories={categories}
        loading={loading}
        currentPage={currentPage}
        totalProducts={totalProducts}
        hasMore={hasMore}
        isSearching={isSearching}
        stockFilter={stockFilter}
        onFilterChange={setStockFilter}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onManageCategories={handleManageCategories}
        onStockAdjustment={handleStockAdjustment}
        onRefresh={handleRefresh}
        onPageChange={goToPage}
        onSearch={searchProducts}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProduct(null)
        }}
        onSave={handleSaveProduct}
        product={selectedProduct}
        categories={categories}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setSelectedCategory(null)
        }}
        onSave={handleSaveCategory}
        onToggleStatus={handleToggleCategoryStatus}
        onDelete={handleDeleteCategory}
        categories={categories}
      />

      <StockAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => {
                  setIsAdjustmentModalOpen(false)
                  setProductToAdjust(null)
                }}
                onAdjust={handleAdjustStock}
                product={productToAdjust}
              />

              <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                  if (!isDeleting) {
                    setIsDeleteModalOpen(false)
                    setProductToDelete(null)
                    setDeleteError(null)
                  }
                }}
                onConfirm={confirmDelete}
                title="Eliminar Producto"
                message={`¿Estás seguro de que quieres eliminar el producto "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                cancelText="Cancelar"
                type="danger"
                confirmDisabled={isDeleting}
                errorMessage={deleteError ?? undefined}
              />

      </div>
    </RoleProtectedRoute>
  )
}
