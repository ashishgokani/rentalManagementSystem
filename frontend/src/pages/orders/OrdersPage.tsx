import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Truck,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  DollarSign,
  Package,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { ordersApi, Order } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { OrderStatus } from '../../types';

const statusColors: Record<OrderStatus, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  picked_up: 'badge-success',
  returned: 'badge-success',
  completed: 'badge-neutral',
  cancelled: 'badge-danger',
};

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  pending: <Clock size={14} />,
  confirmed: <CheckCircle size={14} />,
  picked_up: <Package size={14} />,
  returned: <RotateCcw size={14} />,
  completed: <CheckCircle size={14} />,
  cancelled: <XCircle size={14} />,
};

export default function OrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const orderPlaced = location.state?.orderPlaced;

  const queryParams = new URLSearchParams(location.search);
  const filterParam = queryParams.get('filter');
  const statusParam = queryParams.get('status');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>((statusParam as OrderStatus) || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(orderPlaced);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params: any = {};

        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        if (filterParam === 'paid') {
          params.paymentStatus = 'paid';
        } else if (filterParam === 'approaching') {
          params.returnStatus = 'approaching';
        }

        const data = await ordersApi.getOrders(params);
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter, filterParam, statusParam]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Order Placed Successfully!</p>
                <p className="text-sm text-green-700">Your rental order has been confirmed. You'll receive updates via email.</p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-600 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div>
            <h1 className="text-2xl font-bold text-primary-900">
              {filterParam === 'paid' ? 'Invoiced & Paid Orders' :
                filterParam === 'approaching' ? 'Returns Management' : 'Rental Orders'}
            </h1>
            <p className="text-primary-500">
              {filterParam === 'paid' ? 'View your completed transactions' :
                filterParam === 'approaching' ? 'Track approaching and overdue returns' : 'Track and manage your rental orders'}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              <Filter size={18} />
              {statusFilter === 'all' ? 'All Status' : statusFilter.replace('_', ' ')}
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10">
                {['all', 'pending', 'confirmed', 'picked_up', 'returned', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status as OrderStatus | 'all');
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 capitalize ${statusFilter === status ? 'bg-primary-100 font-medium' : ''
                      }`}
                  >
                    {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="card overflow-hidden">
            {/* Order Header */}
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Truck size={20} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-900">{order.order_number}</h3>
                      <p className="text-sm text-primary-500">
                        {user?.role !== 'customer' && `Customer: ${order.customer_name || 'N/A'} • `}
                        Created {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1.5 text-primary-600">
                      <Calendar size={14} />
                      {order.rental_start_date && order.rental_end_date ? (
                        <>
                          {format(new Date(order.rental_start_date), 'MMM d')} - {format(new Date(order.rental_end_date), 'MMM d, yyyy')}
                        </>
                      ) : 'N/A'}
                    </div>
                    <div className="flex items-center gap-1.5 text-primary-600">
                      <Package size={14} />
                      {(order.lines || []).length} item(s)
                    </div>
                    <div className="flex items-center gap-1.5 text-primary-600">
                      <DollarSign size={14} />
                      Paid: {formatPrice(order.paid_amount || 0)} / {formatPrice(order.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Status and Amount */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-primary-500">Total Amount</p>
                    <p className="text-xl font-bold text-primary-900">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <span className={`badge ${statusColors[order.status as OrderStatus] || 'badge-neutral'} capitalize flex items-center gap-1`}>
                    {statusIcons[order.status as OrderStatus]}
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 lg:border-l lg:border-primary-200 lg:pl-6">
                  <Link
                    to={`/orders/${order.id}`}
                    className="btn btn-secondary"
                  >
                    <Eye size={18} />
                    View Details
                  </Link>
                </div>
              </div>
            </div>

            {/* Order Status Timeline */}
            <div className="px-6 py-4 bg-primary-50 border-t border-primary-200">
              <div className="flex items-center justify-between">
                {['Confirmed', 'Picked Up', 'In Use', 'Returned', 'Completed'].map((step, idx) => {
                  const statusOrder = ['confirmed', 'picked_up', 'picked_up', 'returned', 'completed'];
                  const currentIdx = statusOrder.indexOf(order.status);
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center ${idx > 0 ? 'flex-1' : ''}`}>
                        {idx > 0 && (
                          <div className={`h-0.5 w-full mb-2 ${isCompleted ? 'bg-green-500' : 'bg-primary-200'}`} />
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                            ? 'bg-primary-900 text-white'
                            : 'bg-primary-200 text-primary-500'
                          }`}>
                          {isCompleted ? <CheckCircle size={14} /> : idx + 1}
                        </div>
                        <p className={`text-xs mt-1 ${isCompleted ? 'text-green-600 font-medium' : 'text-primary-500'}`}>
                          {step}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Line Items */}
            <div className="px-6 py-4 border-t border-primary-100">
              <div className="flex flex-wrap gap-2">
                {(order.lines || []).map((line) => (
                  <span key={line.id} className="px-3 py-1 bg-primary-100 rounded-full text-sm text-primary-700">
                    {line.product_name} × {line.quantity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck size={24} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-900">No orders found</h3>
          <p className="text-primary-500 mt-1">
            {user?.role === 'customer'
              ? 'Complete a checkout to create your first order'
              : 'No orders match your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
}
