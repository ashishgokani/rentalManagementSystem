import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  MapPin,
  Check,
  Plus,
  Shield,
  Calendar
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ordersApi } from '../../api/orders';
import { format } from 'date-fns';
import { Address, PaymentMethod } from '../../types';

// Default empty address form
const emptyAddress: Address = {
  id: 'new',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: true,
};

type CheckoutStep = 'address' | 'payment' | 'review';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, getTotal, clearCart } = useCart();
  const { subtotal, tax, total } = getTotal();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [deliveryAddress, setDeliveryAddress] = useState<Address>(emptyAddress);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityDeposit] = useState(Math.round(subtotal * 0.1)); // 10% security deposit

  // Location Data State
  const [allCities, setAllCities] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Fetch cities data
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json')
      .then(res => res.json())
      .then((data: any[]) => {
        setAllCities(data);
        const uniqueStates = Array.from(new Set(data.map(city => city.state))).sort() as string[];
        setAvailableStates(uniqueStates);
      })
      .catch(err => console.error('Failed to load location data', err));
  }, []);

  // Update available cities when state changes
  useEffect(() => {
    if (deliveryAddress.state) {
      const citiesInState = allCities
        .filter(c => c.state === deliveryAddress.state)
        .map(c => c.name)
        .sort();
      setAvailableCities(citiesInState);
    } else {
      setAvailableCities([]);
    }
  }, [deliveryAddress.state, allCities]);

  // Pre-fill address from user profile
  useEffect(() => {
    if (user) {
      setDeliveryAddress(prev => ({
        ...prev,
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postalCode || '',
        country: user.country || 'India',
      }));
    }
  }, [user]);


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  // Razorpay payment link
  const RAZORPAY_PAYMENT_LINK = 'https://rzp.io/rzp/gg6pjKf';

  const steps: { key: CheckoutStep; label: string }[] = [
    { key: 'address', label: 'Delivery Address' },
    { key: 'payment', label: 'Payment' },
    { key: 'review', label: 'Review' },
  ];

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Get vendorId from product (may be vendorId or vendorId depending on source)
      const product = items[0]?.product as any;
      const vendorId = product?.vendorId || product?.vendorId || '';

      // Create order via API
      await ordersApi.createOrder({
        vendorId: vendorId,
        notes: `Delivery: ${deliveryAddress.address}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}. Payment: ${paymentMethod}`,
        lines: items.map(item => {
          const prod = item.product as any;
          return {
            productId: prod.id,
            quantity: item.rentalPeriod.quantity,
            rental_period: {
              type: item.rentalPeriod.type,
              startDate: item.rentalPeriod.startDate,
              endDate: item.rentalPeriod.endDate,
              quantity: item.rentalPeriod.quantity,
            },
            unitPrice: item.unitPrice,
            total_price: item.totalPrice,
          };
        }),
      });

      clearCart();
      
      // Redirect to Razorpay for online payment
      if (paymentMethod === 'online') {
        window.open(RAZORPAY_PAYMENT_LINK, '_blank');
      }
      
      navigate('/orders', { state: { orderPlaced: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-primary-900">No items to checkout</h2>
        <Link to="/products" className="btn btn-primary mt-6">
          Browse Products
        </Link>
      </div>
    );
  }

  const grandTotal = total + securityDeposit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/cart" className="p-2 hover:bg-primary-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Checkout</h1>
          <p className="text-primary-500">Complete your rental order</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="card p-4">
        <div className="flex items-center justify-center gap-4">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => {
                  if (idx < steps.findIndex(s => s.key === currentStep)) {
                    setCurrentStep(step.key);
                  }
                }}
                className={`flex items-center gap-2 ${step.key === currentStep
                  ? 'text-primary-900'
                  : steps.findIndex(s => s.key === step.key) < steps.findIndex(s => s.key === currentStep)
                    ? 'text-green-600'
                    : 'text-primary-400'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step.key === currentStep
                  ? 'border-primary-900 bg-primary-900 text-white'
                  : steps.findIndex(s => s.key === step.key) < steps.findIndex(s => s.key === currentStep)
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-primary-300'
                  }`}>
                  {steps.findIndex(s => s.key === step.key) < steps.findIndex(s => s.key === currentStep) ? (
                    <Check size={16} />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="font-medium hidden sm:inline">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-12 sm:w-24 h-0.5 mx-2 ${steps.findIndex(s => s.key === step.key) < steps.findIndex(s => s.key === currentStep)
                  ? 'bg-green-600'
                  : 'bg-primary-200'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Address Step */}
          {currentStep === 'address' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
                <MapPin size={20} />
                Delivery Address
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.address}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, address: e.target.value })}
                    className="input"
                    placeholder="Enter full address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      State *
                    </label>
                    <select
                      value={deliveryAddress.state}
                      onChange={(e) => {
                        setDeliveryAddress({ ...deliveryAddress, state: e.target.value, city: '' });
                      }}
                      className="input"
                      required
                    >
                      <option value="">Select State</option>
                      {availableStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      City *
                    </label>
                    <select
                      value={deliveryAddress.city}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                      className="input"
                      disabled={!deliveryAddress.state}
                      required
                    >
                      <option value="">Select City</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.postalCode}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })}
                      className="input"
                      placeholder="Enter postal code"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.country}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, country: e.target.value })}
                      className="input"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('payment')}
                disabled={!deliveryAddress.address || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.postalCode}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
                <CreditCard size={20} />
                Payment Method
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('online')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'online'
                    ? 'border-primary-900 bg-primary-50'
                    : 'border-primary-200 hover:border-primary-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <CreditCard size={20} className="text-primary-700" />
                      </div>
                      <div>
                        <p className="font-medium text-primary-900">Online Payment</p>
                        <p className="text-sm text-primary-500">Pay securely via UPI, Cards, or Net Banking</p>
                      </div>
                    </div>
                    {paymentMethod === 'online' && (
                      <div className="w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'bank_transfer'
                    ? 'border-primary-900 bg-primary-50'
                    : 'border-primary-200 hover:border-primary-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building2 size={20} className="text-primary-700" />
                      </div>
                      <div>
                        <p className="font-medium text-primary-900">Bank Transfer</p>
                        <p className="text-sm text-primary-500">Direct bank transfer (NEFT/RTGS)</p>
                      </div>
                    </div>
                    {paymentMethod === 'bank_transfer' && (
                      <div className="w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              </div>

              {/* Security Deposit Info */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Security Deposit Required</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      A refundable security deposit of {formatPrice(securityDeposit)} will be collected
                      to protect against damage or late returns. This will be refunded after successful return.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('address')}
                  className="btn btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="btn btn-primary flex-1"
                >
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Order Items */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-primary-900 mb-4">Order Items</h2>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4 pb-4 border-b border-primary-100 last:border-0 last:pb-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-primary-100 flex-shrink-0">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-primary-900">{item.product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-primary-500 mt-1">
                          <Calendar size={14} />
                          {formatDate(item.rentalPeriod.startDate)} - {formatDate(item.rentalPeriod.endDate)}
                        </div>
                        <p className="text-sm text-primary-500">Qty: {item.rentalPeriod.quantity}</p>
                      </div>
                      <p className="font-semibold text-primary-900">{formatPrice(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-primary-900 mb-4">Delivery Address</h2>
                <div>
                  <p className="text-primary-900">{deliveryAddress.address}</p>
                  <p className="text-primary-600">
                    {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}
                  </p>
                  <p className="text-primary-500">{deliveryAddress.country}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-primary-900 mb-4">Payment Method</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    {paymentMethod === 'online' ? (
                      <CreditCard size={20} className="text-primary-700" />
                    ) : (
                      <Building2 size={20} className="text-primary-700" />
                    )}
                  </div>
                  <p className="font-medium text-primary-900">
                    {paymentMethod === 'online' ? 'Online Payment' : 'Bank Transfer'}
                  </p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-primary-900 mb-4">Billing Information</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-600">Company</span>
                    <span className="text-primary-900">{user?.companyName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-600">GSTIN</span>
                    <span className="text-primary-900">{user?.gstin || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('payment')}
                  className="btn btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="btn btn-primary flex-1"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Place Order</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Order Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-600">Subtotal ({items.length} items)</span>
                <span className="text-primary-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">GST (18%)</span>
                <span className="text-primary-900">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Security Deposit</span>
                <span className="text-primary-900">{formatPrice(securityDeposit)}</span>
              </div>
              <div className="pt-3 border-t border-primary-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-primary-900">Total</span>
                  <span className="text-xl font-bold text-primary-900">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-primary-500 text-center mt-4">
              By placing this order, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
