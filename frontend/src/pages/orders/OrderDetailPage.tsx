import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Package,
  Truck,
  RotateCcw,
  Receipt,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { invoicesApi } from '../../api/invoices';
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

const statusSteps: OrderStatus[] = ['pending', 'confirmed', 'picked_up', 'returned', 'completed'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [relatedInvoice, setRelatedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const orderData = await ordersApi.getOrder(id);
        setOrder(orderData);

        // Try to find related invoice
        try {
          const invoice = await invoicesApi.getInvoiceByOrder(id);
          if (invoice) {
            setRelatedInvoice(invoice);
          }
        } catch {
          // Invoice not found is ok
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-primary-300 mb-4" />
        <h2 className="text-xl font-semibold text-primary-900 mb-2">Order not found</h2>
        <p className="text-primary-500 mb-4">{error || "The order you're looking for doesn't exist."}</p>
        <Link to="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCurrentStep = () => {
    if (order.status === 'cancelled') return -1;
    return statusSteps.indexOf(order.status);
  };

  const currentStep = getCurrentStep();

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    try {
      setLoading(true);
      await ordersApi.updateOrder(order.id, { status: newStatus });
      // Refresh order data
      const updatedOrder = await ordersApi.getOrder(order.id);
      setOrder(updatedOrder);
      alert(`Order status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{order.order_number}</h1>
          <p className="text-primary-500">Order Details</p>
        </div>
        <span className={`badge ${statusColors[order.status as OrderStatus]} capitalize`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Order Progress */}
      {order.status !== 'cancelled' && (
        <div className="card p-6">
          <h3 className="font-semibold text-primary-900 mb-6">Order Progress</h3>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-primary-200">
              <div
                className="h-full bg-primary-900 transition-all duration-500"
                style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Steps */}
            <div className="flex justify-between relative">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${isCompleted
                      ? 'bg-primary-900 text-white'
                      : 'bg-white border-2 border-primary-200 text-primary-400'
                      } ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}>
                      {isCompleted ? <CheckCircle size={20} /> : (index + 1)}
                    </div>
                    <p className={`text-xs mt-2 capitalize ${isCompleted ? 'text-primary-900 font-medium' : 'text-primary-400'
                      }`}>
                      {step.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rental Period */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Rental Period
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm text-primary-500">Start Date</p>
                <p className="text-lg font-semibold text-primary-900">
                  {format(new Date(order.rental_start_date), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm text-primary-500">End Date</p>
                <p className="text-lg font-semibold text-primary-900">
                  {format(new Date(order.rental_end_date), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
            </div>
            {order.pickup_date && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <Truck size={16} />
                Picked up on {format(new Date(order.pickup_date), 'MMM d, yyyy')}
              </div>
            )}
            {order.return_date && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <RotateCcw size={16} />
                Returned on {format(new Date(order.return_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4 flex items-center gap-2">
              <Package size={20} />
              Order Items
            </h3>
            <div className="space-y-4">
              {(order.lines || []).map((line: any) => (
                <div key={line.id} className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <Package size={24} className="text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-primary-900">{line.product_name}</h4>
                    <p className="text-sm text-primary-500">
                      {line.rental_period_type || 'daily'} rental • Qty: {line.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-900">{formatPrice(line.total_price)}</p>
                    <p className="text-sm text-primary-500">{formatPrice(line.unitPrice)}/{line.rental_period_type || 'day'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendor/Customer Info */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">
              {user?.role === 'customer' ? 'Vendor Information' : 'Customer Information'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-700">
                    {user?.role === 'customer' ? (order.vendor_name || 'V')[0] : (order.customer_name || 'C')[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-primary-900">
                    {user?.role === 'customer' ? order.vendor_name : order.customer_name}
                  </p>
                  <p className="text-sm text-primary-500">
                    {user?.role === 'customer' ? 'Vendor' : 'Customer'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-primary-500 flex items-center gap-2">
                  <Mail size={14} />
                  contact@example.com
                </p>
                <p className="text-sm text-primary-500 flex items-center gap-2">
                  <Phone size={14} />
                  +91 98765 43210
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-primary-600">Subtotal</span>
                <span className="text-primary-900">{formatPrice(order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Tax (18% GST)</span>
                <span className="text-primary-900">{formatPrice(order.taxAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Security Deposit</span>
                <span className="text-primary-900">{formatPrice(order.security_deposit || 0)}</span>
              </div>
              {order.late_return_fee && (
                <div className="flex justify-between text-red-600">
                  <span>Late Return Fee</span>
                  <span>{formatPrice(order.late_return_fee)}</span>
                </div>
              )}
              <div className="border-t border-primary-200 pt-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-primary-900">Total</span>
                  <span className="text-primary-900">{formatPrice(order.totalAmount || 0)}</span>
                </div>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span>{formatPrice(order.paid_amount || 0)}</span>
              </div>
              {(order.paid_amount || 0) < (order.totalAmount || 0) && (
                <div className="flex justify-between font-medium text-yellow-600">
                  <span>Balance Due</span>
                  <span>{formatPrice((order.totalAmount || 0) - (order.paid_amount || 0))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {relatedInvoice && (
                <Link to={`/invoices/${relatedInvoice.id}`} className="btn btn-secondary w-full">
                  <Receipt size={18} />
                  View Invoice
                </Link>
              )}
              {user?.role === 'customer' && ((order.totalAmount || 0) - (order.paid_amount || 0) > 1) && (
                <Link to={`/orders/${order.id}/pay`} className="btn btn-primary w-full text-center">
                  Pay Balance
                </Link>
              )}
              {/* Calendar Sync - Available for confirmed orders */}
              {/* Client-side Calendar Links - No OAuth required */}
              {order.status !== 'pending' && order.status !== 'cancelled' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const formatDate = (dateString: string) => {
                        return new Date(dateString).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
                      };

                      const openCalendar = (title: string, date: string, desc: string) => {
                        const start = new Date(date);
                        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
                        const dates = `${formatDate(start.toISOString())}/${formatDate(end.toISOString())}`;
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(desc)}`;
                        window.open(url, '_blank');
                      };

                      // Pickup Event
                      const pickupTime = order.pickup_date || order.rental_start_date;
                      openCalendar(
                        `Pickup: Rental #${order.order_number}`,
                        pickupTime,
                        `Pickup Order #${order.order_number}\nItems: ${order.lines?.length || 0}\nStatus: ${order.status}`
                      );

                      // Return Event
                      // Small delay to ensure browser allows second popup or just rely on user clicking separately if needed.
                      // Ideally, maybe show two buttons? Or just try both.
                      // Let's try both with a subtle timeout, but browsers might block.
                      // Better UX: Dropdown or just one button that tries both?
                      // User asked for "prefilled eventr with that time slow", implying simple links.
                      // Let's do two separate calls.
                      setTimeout(() => {
                        const returnTime = order.rental_end_date;
                        openCalendar(
                          `Return: Rental #${order.order_number}`,
                          returnTime,
                          `Return Due for Order #${order.order_number}`
                        );
                      }, 500);

                      alert('Opening Google Calendar tabs for Pickup and Return events...');
                    }}
                    className="btn btn-outline w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Calendar size={18} />
                    Add to Calendar
                  </button>
                </div>
              )}

              {(user?.role === 'vendor' || user?.role === 'admin') && (
                <>
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange('confirmed')}
                        className="btn btn-primary w-full"
                      >
                        <CheckCircle size={18} />
                        Confirm Order
                      </button>
                      <button className="btn btn-danger w-full">
                        <XCircle size={18} />
                        Cancel Order
                      </button>
                    </>
                  )}

                  {order.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="btn btn-secondary w-full"
                      >
                        <Calendar size={18} />
                        Schedule Pickup
                      </button>
                      <button
                        onClick={() => handleStatusChange('picked_up')}
                        className="btn btn-primary w-full"
                      >
                        <Truck size={18} />
                        Mark as Picked Up
                      </button>
                    </>
                  )}
                  {order.status === 'picked_up' && (
                    <button
                      onClick={() => setIsReturnModalOpen(true)}
                      className="btn btn-primary w-full"
                    >
                      <RotateCcw size={18} />
                      Mark as Returned
                    </button>
                  )}
                </>
              )}
              {order.status === 'pending' && user?.role === 'customer' && (
                <button className="btn btn-danger w-full">
                  <XCircle size={18} />
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Order Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-500">Order Number</span>
                <span className="text-primary-900 font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-500">Quotation</span>
                <Link to={`/quotations`} className="text-primary-600 hover:text-primary-900">
                  {order.quotationId || 'N/A'}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-500">Created</span>
                <span className="text-primary-900">
                  {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-500">Last Updated</span>
                <span className="text-primary-900">
                  {format(new Date(order.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Pickup Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Schedule Pickup</h3>
            <p className="text-primary-500 mb-6">
              Select a date and time for the customer to pick up the items.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Combine date and time
                const date = (document.getElementById('pickup-date') as HTMLInputElement).value;
                const time = (document.getElementById('pickup-time') as HTMLInputElement).value;

                if (!date || !time) {
                  alert("Please select both date and time");
                  return;
                }

                await ordersApi.updateOrder(order.id, {
                  pickup_date: new Date(`${date}T${time}`).toISOString()
                });

                setIsScheduleModalOpen(false);
                // Refresh order
                const updatedOrder = await ordersApi.getOrder(order.id);
                setOrder(updatedOrder);
                alert("Pickup scheduled successfully!");
              } catch (err) {
                alert("Failed to schedule pickup");
              }
            }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="label">Pickup Date</label>
                  <input
                    type="date"
                    id="pickup-date"
                    className="input"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="label">Pickup Time</label>
                  <input
                    type="time"
                    id="pickup-time"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Pickup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Confirm Return</h3>
            <p className="text-primary-500 mb-6">
              Mark items as returned. You can add late fees if applicable. The security deposit will be refunded automatically after deducting any fees.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const lateFeeInput = document.getElementById('late-fee') as HTMLInputElement;
                const lateFee = lateFeeInput.value ? parseFloat(lateFeeInput.value) : 0;

                const returnDateInput = document.getElementById('return-date') as HTMLInputElement;
                const returnDate = returnDateInput.value ? new Date(returnDateInput.value).toISOString() : new Date().toISOString();

                await ordersApi.updateOrder(order.id, {
                  status: 'returned',
                  late_return_fee: lateFee,
                  return_date: returnDate
                });

                setIsReturnModalOpen(false);
                // Refresh order
                const updatedOrder = await ordersApi.getOrder(order.id);
                setOrder(updatedOrder);
                alert("Order marked as returned and completed!");
              } catch (err: any) {
                alert(err.message || "Failed to mark as returned");
              }
            }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="label">Return Date</label>
                  <input
                    type="datetime-local"
                    id="return-date"
                    className="input"
                    defaultValue={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div>
                  <label className="label">Late Fee (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">₹</span>
                    <input
                      type="number"
                      id="late-fee"
                      className="input pl-8"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-primary-500 mt-1">
                    Security Deposit: {formatPrice(order.security_deposit || 0)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Return & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
