import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthService } from '@/lib/auth-service'

const SUPERADMIN_ROLES = ['superadmin', 'Super Admin', 'Super Administrador']

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id')?.trim()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar al usuario' },
        { status: 401 }
      )
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (userError || !user || !SUPERADMIN_ROLES.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Solo Super Admin puede eliminar productos' },
        { status: 403 }
      )
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, reference, brand, category_id, price, cost, stock_warehouse, stock_store')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const totalStock = (product.stock_warehouse ?? 0) + (product.stock_store ?? 0)
    if (totalStock > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar el producto "${product.name}" porque tiene ${totalStock} unidad(es) en stock. Debe tener stock en 0 para poder eliminarlo.`
        },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Error al eliminar el producto' },
        { status: 500 }
      )
    }

    await AuthService.logActivity(userId, 'product_delete', 'products', {
      description: `Producto eliminado: ${product.name}`,
      productId: id,
      productName: product.name,
      productReference: product.reference,
      brand: product.brand,
      category: product.category_id,
      price: product.price,
      cost: product.cost,
      stockStore: product.stock_store ?? 0,
      stockWarehouse: product.stock_warehouse ?? 0
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE product error:', error)
    return NextResponse.json(
      { success: false, error: 'Error inesperado al eliminar el producto' },
      { status: 500 }
    )
  }
}
