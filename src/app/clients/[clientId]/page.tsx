'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  MapPin, 
  FileText, 
  Calendar,
  ShoppingBag,
  TrendingUp,
  Star,
  Package,
  Receipt,
  Clock,
  MessageCircle,
  Award,
  DollarSign,
  Hash,
  Edit,
  Navigation,
  Bike,
  Store,
  TrendingDown
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts'
import { Client, Sale, SaleItem } from '@/types'
import { ClientsService } from '@/lib/clients-service'
import { SalesService } from '@/lib/sales-service'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { ClientModal } from '@/components/clients/client-modal'

interface ClientStats {
  totalPurchases: number
  totalSpent: number
  averageTicket: number
  lastPurchaseDate: string | null
  points: number
  favoriteProducts: { name: string; quantity: number; totalSpent: number }[]
  purchaseHistory: Sale[]
  deliveryCount: number
  storeCount: number
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleEditClient = async (clientData: Omit<Client, 'id'>) => {
    if (!client) return
    
    try {
      await ClientsService.updateClient(client.id, clientData)
      const updatedClient = await ClientsService.getClientById(client.id)
      setClient(updatedClient)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) return
      
      setIsLoading(true)
      try {
        const clientData = await ClientsService.getClientById(clientId)
        setClient(clientData)
        
        const { sales: allSales } = await SalesService.getAllSales(1, 1000)
        const clientSales = allSales.filter(
          sale => sale.clientId === clientId && sale.status === 'completed'
        )
        
        const totalSpent = clientSales.reduce((sum, sale) => sum + sale.total, 0)
        const averageTicket = clientSales.length > 0 ? totalSpent / clientSales.length : 0
        
        const sortedSales = [...clientSales].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const lastPurchaseDate = sortedSales.length > 0 ? sortedSales[0].createdAt : null
        
        const productMap = new Map<string, { name: string; quantity: number; totalSpent: number }>()
        clientSales.forEach(sale => {
          sale.items.forEach(item => {
            const existing = productMap.get(item.productId) || { 
              name: item.productName, 
              quantity: 0, 
              totalSpent: 0 
            }
            existing.quantity += item.quantity
            existing.totalSpent += item.total
            productMap.set(item.productId, existing)
          })
        })
        
        const favoriteProducts = Array.from(productMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
        
        const points = Math.floor(totalSpent / 10000)
        const deliveryCount = clientSales.filter(sale => sale.isDelivery).length
        const storeCount = clientSales.filter(sale => !sale.isDelivery).length
        
        setStats({
          totalPurchases: clientSales.length,
          totalSpent,
          averageTicket,
          lastPurchaseDate,
          points,
          favoriteProducts,
          purchaseHistory: sortedSales.slice(0, 10),
          deliveryCount,
          storeCount
        })
        
      } catch (error) {
        console.error('Error loading client:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadClientData()
  }, [clientId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeSinceLastPurchase = (dateString: string | null) => {
    if (!dateString) return 'Sin compras'
    
    const lastDate = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`
    return `Hace ${Math.floor(diffDays / 365)} años`
  }

  if (isLoading) {
    return (
      <RoleProtectedRoute module="clients" requiredAction="view">
        <div className="p-6 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f29fc8] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (!client) {
    return (
      <RoleProtectedRoute module="clients" requiredAction="view">
        <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Cliente no encontrado
            </h2>
            <Button onClick={() => router.push('/clients')} className="bg-[#f29fc8] hover:bg-[#e07ab0]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="clients" requiredAction="view">
      <div className="p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen">
        {/* Info del cliente + Stats en una sola sección */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-14 h-14 bg-[#f29fc8] rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[#e07ab0] transition-colors"
              onClick={() => router.push('/clients')}
              title="Volver a Clientes"
            >
              <User className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {client.name}
                </h1>
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-gray-500 hover:text-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] text-xs">
                  Cliente
                </Badge>
                <Badge className={`text-xs ${client.status === 'active' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end text-[#f29fc8]">
                <Award className="h-5 w-5" />
                <span className="text-2xl font-bold">{stats?.points || 0}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">puntos</p>
            </div>
          </div>

          {/* Stats en línea */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{stats?.totalPurchases || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <ShoppingBag className="h-3 w-3" /> Compras
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{stats?.deliveryCount || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Bike className="h-3 w-3" /> Domi
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{stats?.storeCount || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Store className="h-3 w-3" /> Tienda
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-[#f29fc8] leading-tight">{formatCurrency(stats?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" /> Gastado
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{formatCurrency(stats?.averageTicket || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" /> Promedio
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 flex flex-col justify-center min-h-[60px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{getTimeSinceLastPurchase(stats?.lastPurchaseDate || null)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Última
              </p>
            </div>
          </div>

          {/* Gráfica de evolución del ticket */}
          {stats?.purchaseHistory && stats.purchaseHistory.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#f29fc8]" />
                  Evolución del Ticket
                </h3>
                {(() => {
                  const sortedByDate = [...stats.purchaseHistory].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  )
                  if (sortedByDate.length >= 2) {
                    const firstTicket = sortedByDate[0].total
                    const lastTicket = sortedByDate[sortedByDate.length - 1].total
                    const diff = ((lastTicket - firstTicket) / firstTicket) * 100
                    return (
                      <span className={`text-xs font-medium flex items-center gap-1 ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                      </span>
                    )
                  }
                  return null
                })()}
              </div>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...stats.purchaseHistory]
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map((sale, index) => ({
                        name: sale.invoiceNumber,
                        total: sale.total,
                        date: new Date(sale.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                      }))
                    }
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#f29fc8"
                      strokeWidth={2}
                      dot={{ fill: '#f29fc8', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#d06a98' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Contenido principal en 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Columna izquierda: Contacto + Productos */}
          <div className="space-y-4">
            {/* Contacto compacto */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-[#f29fc8]" />
                Contacto
              </h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {/* Fila 1 */}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{client.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  {(client.whatsapp || client.phone) ? (
                    <a 
                      href={`https://wa.me/${(client.whatsapp || client.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${client.name}, te escribimos de Milagros Guacarí...`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      {client.whatsapp || client.phone}
                    </a>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">-</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{client.document || '-'}</span>
                </div>
                {/* Fila 2 */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{formatDate(client.createdAt)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {client.address || 'Sin dirección'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {client.referencePoint || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Productos favoritos compacto */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-[#f29fc8]" />
                Top Productos
              </h3>
              {stats?.favoriteProducts && stats.favoriteProducts.length > 0 ? (
                <div className="space-y-2">
                  {stats.favoriteProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-full flex items-center justify-center text-xs font-bold text-[#d06a98] dark:text-[#f29fc8] flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{product.quantity}u</span>
                        <span className="text-sm font-semibold text-[#f29fc8]">{formatCurrency(product.totalSpent)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Sin compras</p>
              )}
            </div>
          </div>

          {/* Columna derecha: Historial de compras */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#f29fc8]" />
              Últimas Compras
            </h3>
            {stats?.purchaseHistory && stats.purchaseHistory.length > 0 ? (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {stats.purchaseHistory.map((sale) => (
                  <div 
                    key={sale.id}
                    className="flex items-center justify-between py-2 px-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => router.push('/sales')}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{sale.invoiceNumber}</span>
                        {sale.isDelivery ? (
                          <Bike className="h-3.5 w-3.5 text-[#f29fc8]" />
                        ) : (
                          <Store className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(sale.createdAt)} • {sale.items.length} prod.
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#f29fc8]">{formatCurrency(sale.total)}</p>
                      <Badge className={`text-xs px-1.5 py-0 ${
                        sale.paymentMethod === 'cash' 
                          ? 'bg-[#fce4f0] text-[#d06a98]'
                          : sale.paymentMethod === 'credit'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sale.paymentMethod === 'cash' ? 'Efectivo' : 
                         sale.paymentMethod === 'credit' ? 'Crédito' : 
                         sale.paymentMethod === 'transfer' ? 'Transfer.' : 'Mixto'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Sin historial</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditClient}
        client={client}
      />
    </RoleProtectedRoute>
  )
}
