import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ArrowLeft, Calendar, Ticket, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { format } from 'date-fns';
import { paymentApi, CouponValidationResponse } from '../../api/payment';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart();
  const { subtotal, tax, total } = getTotal();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Calculate discounted totals
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const discountedTotal = total - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponLoading(true);
    setCouponError(null);
    
    try {
      const response = await paymentApi.validateCoupon(couponCode, total);
      
      if (response.valid) {
        setAppliedCoupon(response);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(response.message);
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart size={32} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold text-primary-900">Your cart is empty</h2>
        <p className="text-primary-500 mt-2">Browse our products and add items to your cart</p>
        <Link to="/products" className="btn btn-primary mt-6">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Shopping Cart</h1>
          <p className="text-primary-500">{items.length} item(s) in your cart</p>
        </div>
        <button
          onClick={() => clearCart()}
          className="btn btn-ghost text-red-600 hover:bg-red-50"
        >
          <Trash2 size={18} />
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.variant?.id}`} className="card p-4">
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-primary-100 flex-shrink-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/products/${item.product.id}`}
                        className="font-semibold text-primary-900 hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-primary-500">{item.variant.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id, item.variant?.id)}
                      className="p-1.5 text-primary-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Rental Period */}
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary-600">
                    <Calendar size={14} />
                    <span>{formatDate(item.rentalPeriod.startDate)}</span>
                    <span>→</span>
                    <span>{formatDate(item.rentalPeriod.endDate)}</span>
                  </div>
                  <p className="text-xs text-primary-500 mt-1 capitalize">
                    Rental type: {item.rentalPeriod.type}ly
                  </p>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-primary-200 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.rentalPeriod.quantity - 1, item.variant?.id)}
                        className="p-2 hover:bg-primary-50"
                        disabled={item.rentalPeriod.quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-medium">{item.rentalPeriod.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.rentalPeriod.quantity + 1, item.variant?.id)}
                        className="p-2 hover:bg-primary-50"
                        disabled={item.rentalPeriod.quantity >= item.product.availableQuantity}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary-500">
                        {formatPrice(item.unitPrice)} × {item.rentalPeriod.quantity}
                      </p>
                      <p className="font-bold text-primary-900">{formatPrice(item.totalPrice)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link to="/products" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-900">
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Order Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-primary-600">Subtotal</span>
                <span className="text-primary-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-primary-600">GST (18%)</span>
                <span className="text-primary-900">{formatPrice(tax)}</span>
              </div>
              <div className="pt-3 border-t border-primary-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-primary-900">Subtotal + Tax</span>
                  <span className={`text-xl font-bold ${appliedCoupon ? 'text-primary-400 line-through' : 'text-primary-900'}`}>{formatPrice(total)}</span>
                </div>
                {appliedCoupon && (
                  <>
                    <div className="flex justify-between text-green-600 mt-2">
                      <span className="text-sm">Discount ({appliedCoupon.code})</span>
                      <span className="font-medium">-{formatPrice(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="font-semibold text-primary-900">Final Total</span>
                      <span className="text-xl font-bold text-green-600">{formatPrice(discountedTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Coupon Code */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Ticket size={16} className="text-primary-500" />
                <label className="text-sm font-medium text-primary-700">Have a coupon?</label>
              </div>
              
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-mono font-medium text-green-700">{appliedCoupon.code}</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X size={16} className="text-green-600" />
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-1">{appliedCoupon.message}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="input flex-1 font-mono uppercase"
                      placeholder="Enter code"
                    />
                    <button 
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
                    >
                      {couponLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                  {couponError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                      <AlertCircle size={14} />
                      {couponError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Request Quote Button */}
            <button
              onClick={async () => {
                if (!confirm('Request a quotation for these items?')) return;
                try {
                  await import('../../api/quotations').then(({ quotationsApi }) =>
                    quotationsApi.createQuotation({
                      lines: items.map(item => ({
                        productId: item.product.id,
                        quantity: item.rentalPeriod.quantity,
                        rental_period: {
                          type: item.rentalPeriod.type,
                          startDate: item.rentalPeriod.startDate,
                          endDate: item.rentalPeriod.endDate,
                          quantity: item.rentalPeriod.quantity
                        },
                        unitPrice: item.unitPrice,
                        total_price: item.totalPrice
                      }))
                    })
                  );
                  clearCart();
                  navigate('/quotations');
                } catch (err) {
                  alert('Failed to create quotation');
                }
              }}
              className="btn btn-primary w-full mt-6"
            >
              Request Quote
              <ArrowRight size={18} />
            </button>

            {/* Security Note */}
            <p className="text-xs text-primary-500 text-center mt-4">
              🔒 Secure checkout powered by RentPe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
