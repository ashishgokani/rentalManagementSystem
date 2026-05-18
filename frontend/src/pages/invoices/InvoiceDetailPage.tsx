import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  Calendar,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle,
  Loader2,
  Wallet
} from 'lucide-react';
import { invoicesApi } from '../../api/invoices';
import { walletApi } from '../../api/wallet';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { InvoiceStatus } from '../../types';

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'badge-neutral',
  sent: 'badge-info',
  partial: 'badge-warning',
  paid: 'badge-success',
  cancelled: 'badge-danger',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [invoiceData, walletData] = await Promise.all([
          invoicesApi.getInvoice(id),
          walletApi.getWallet()
        ]);
        setInvoice(invoiceData);
        setWalletBalance(walletData.balance);
      } catch (err: any) {
        setError(err.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && invoice && searchParams.get('print') === 'true') {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, invoice, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <Receipt size={48} className="mx-auto text-primary-300 mb-4" />
        <h2 className="text-xl font-semibold text-primary-900 mb-2">Invoice not found</h2>
        <p className="text-primary-500 mb-4">{error || "The invoice you're looking for doesn't exist."}</p>
        <Link to="/invoices" className="btn btn-primary">
          Back to Invoices
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

  const handlePayNow = () => {
    // In real app, this would redirect to payment gateway
    alert('Redirecting to payment gateway...');
  };

  const handleWalletPay = async () => {
    if (!invoice) return;

    const amountToPay = (invoice.totalAmount || 0) - (invoice.paid_amount || 0);

    if (walletBalance < amountToPay) {
      alert('Insufficient wallet balance!');
      return;
    }

    if (!confirm(`Pay ${formatPrice(amountToPay)} using your wallet balance?`)) {
      return;
    }

    try {
      setPaying(true);
      await invoicesApi.addPayment(invoice.id, {
        amount: amountToPay,
        method: 'WALLET',
      });

      // Refresh data
      const [invoiceData, walletData] = await Promise.all([
        invoicesApi.getInvoice(invoice.id),
        walletApi.getWallet()
      ]);
      setInvoice(invoiceData);
      setWalletBalance(walletData.balance);

      alert('Payment successful!');
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setPaying(false);
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
          <h1 className="text-2xl font-bold text-primary-900">{invoice.invoice_number}</h1>
          <p className="text-primary-500">Invoice Details</p>
        </div>
        <span className={`badge ${statusColors[invoice.status as InvoiceStatus]} capitalize`}>
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Document */}
          <div className="card p-8">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-primary-200 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary-900">INVOICE</h2>
                <p className="text-primary-500">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-900">RentPe</p>
                <p className="text-sm text-primary-500">123 Business Park</p>
                <p className="text-sm text-primary-500">Mumbai, MH 400001</p>
                <p className="text-sm text-primary-500">GSTIN: 27AABCU9603R1ZM</p>
              </div>
            </div>

            {/* Bill To & Dates */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-primary-500 mb-2">Bill To:</p>
                <p className="font-semibold text-primary-900">{invoice.customer_name}</p>
                <p className="text-sm text-primary-600">GSTIN: {invoice.customer_gstin || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-500">Invoice Date: <span className="text-primary-900">{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</span></p>
                <p className="text-sm text-primary-500 mt-1">Due Date: <span className="text-primary-900">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</span></p>
              </div>
            </div>

            {/* Invoice Items */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-primary-200">
                  <th className="text-left text-sm font-medium text-primary-600 py-3">Description</th>
                  <th className="text-center text-sm font-medium text-primary-600 py-3">Qty</th>
                  <th className="text-right text-sm font-medium text-primary-600 py-3">Unit Price</th>
                  <th className="text-right text-sm font-medium text-primary-600 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {(invoice.lines || []).map((line: any) => (
                  <tr key={line.id}>
                    <td className="py-3 text-primary-900">{line.description}</td>
                    <td className="py-3 text-center text-primary-600">{line.quantity}</td>
                    <td className="py-3 text-right text-primary-600">{formatPrice(line.unitPrice)}</td>
                    <td className="py-3 text-right font-medium text-primary-900">{formatPrice(line.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Invoice Totals */}
            <div className="border-t border-primary-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="text-primary-600">Subtotal</span>
                    <span className="text-primary-900">{formatPrice(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-primary-600">GST ({invoice.tax_rate || 18}%)</span>
                    <span className="text-primary-900">{formatPrice(invoice.taxAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-primary-200 font-bold">
                    <span className="text-primary-900">Total</span>
                    <span className="text-primary-900">{formatPrice(invoice.totalAmount || 0)}</span>
                  </div>
                  {(invoice.paid_amount || 0) > 0 && (
                    <>
                      <div className="flex justify-between py-2 text-green-600">
                        <span>Paid</span>
                        <span>{formatPrice(invoice.paid_amount)}</span>
                      </div>
                      {(invoice.paid_amount || 0) < (invoice.totalAmount || 0) && (
                        <div className="flex justify-between py-2 font-bold text-yellow-600">
                          <span>Balance Due</span>
                          <span>{formatPrice((invoice.totalAmount || 0) - (invoice.paid_amount || 0))}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mt-8 pt-6 border-t border-primary-200">
              <p className="text-sm font-medium text-primary-700 mb-2">Terms & Conditions</p>
              <p className="text-sm text-primary-500">
                1. Payment is due within 15 days from the invoice date.<br />
                2. Late payments may incur additional charges.<br />
                3. Please include the invoice number in your payment reference.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="btn btn-secondary w-full"
              >
                <Printer size={18} />
                Print Invoice
              </button>
              {(user?.role === 'vendor' || user?.role === 'admin') && invoice.status === 'draft' && (
                <button className="btn btn-primary w-full">
                  <Send size={18} />
                  Send to Customer
                </button>
              )}
              {user?.role === 'customer' && invoice.status !== 'cancelled' && ((invoice.totalAmount || 0) - (invoice.paid_amount || 0) > 1) && (
                <div className="space-y-3">
                  <button
                    onClick={handleWalletPay}
                    disabled={paying || walletBalance < ((invoice.totalAmount || 0) - (invoice.paid_amount || 0))}
                    className={`btn w-full flex-col items-start p-4 ${walletBalance >= ((invoice.totalAmount || 0) - (invoice.paid_amount || 0))
                      ? 'bg-primary-900 text-white hover:bg-primary-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet size={18} />
                      <span className="font-medium">Pay with Wallet</span>
                    </div>
                    <span className="text-xs opacity-80">Balance: {formatPrice(walletBalance)}</span>
                  </button>

                  <button
                    onClick={handlePayNow}
                    className="btn btn-outline w-full"
                  >
                    <CreditCard size={18} />
                    Pay Online
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Payment Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-primary-600">Total Amount</span>
                <span className="font-semibold text-primary-900">{formatPrice(invoice.totalAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-primary-600">Amount Paid</span>
                <span className="font-semibold text-green-600">{formatPrice(invoice.paid_amount || 0)}</span>
              </div>
              {(invoice.paid_amount || 0) < (invoice.totalAmount || 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-primary-600">Balance Due</span>
                  <span className="font-semibold text-yellow-600">
                    {formatPrice((invoice.totalAmount || 0) - (invoice.paid_amount || 0))}
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mt-2">
                <div className="w-full bg-primary-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((invoice.paid_amount || 0) / (invoice.totalAmount || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-primary-500 mt-1 text-center">
                  {Math.round(((invoice.paid_amount || 0) / (invoice.totalAmount || 1)) * 100)}% paid
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary-900 mb-4">Invoice Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-primary-400" />
                <div>
                  <p className="text-xs text-primary-500">Created</p>
                  <p className="text-sm text-primary-900">
                    {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-primary-400" />
                <div>
                  <p className="text-xs text-primary-500">Due Date</p>
                  <p className="text-sm text-primary-900">
                    {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-primary-400" />
                <div>
                  <p className="text-xs text-primary-500">Customer GSTIN</p>
                  <p className="text-sm text-primary-900">{invoice.customer_gstin || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Receipt size={18} className="text-primary-400" />
                <div>
                  <p className="text-xs text-primary-500">Related Order</p>
                  <Link to={`/orders/${invoice.orderId}`} className="text-sm text-primary-600 hover:text-primary-900">
                    {invoice.orderId || 'N/A'}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {invoice.status === 'paid' && (
            <div className="card p-6 bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">Fully Paid</p>
                  <p className="text-sm text-green-700">
                    Paid on {format(new Date(invoice.updatedAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}