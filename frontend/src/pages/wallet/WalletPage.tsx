import { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  X,
  Gift,
  Copy,
  Share2,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { walletApi, WalletSummary, WalletTransaction, AddFundsRequest } from '../../api/wallet';
import { useAuth } from '../../context/AuthContext';

type ModalType = 'add-funds' | 'withdraw' | null;

export default function WalletPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [filterType, setFilterType] = useState<'all' | 'CREDIT' | 'DEBIT'>('all');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterType]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const data = await walletApi.getWalletSummary();
      setSummary(data);
      setTransactions(data.recent_transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = filterType !== 'all' ? { transaction_type: filterType as 'CREDIT' | 'DEBIT' } : {};
      const data = await walletApi.getTransactions({ ...params, limit: 50 });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  // Razorpay payment link
  const RAZORPAY_PAYMENT_LINK = 'https://rzp.io/rzp/gg6pjKf';

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      // Open Razorpay payment link in new tab
      window.open(RAZORPAY_PAYMENT_LINK, '_blank');
      
      // Record the pending transaction
      const request: AddFundsRequest = {
        amount: numAmount,
        payment_method: paymentMethod
      };
      await walletApi.addFunds(request);
      setModalType(null);
      setAmount('');
      fetchWalletData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add funds');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await walletApi.withdrawFunds({
        amount: numAmount,
        description: description || undefined
      });
      setModalType(null);
      setAmount('');
      setDescription('');
      fetchWalletData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw funds');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'REFUNDED':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'UPI':
        return <Smartphone className="w-4 h-4" />;
      case 'CARD':
        return <CreditCard className="w-4 h-4" />;
      case 'BANK_TRANSFER':
        return <Building2 className="w-4 h-4" />;
      default:
        return <WalletIcon className="w-4 h-4" />;
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Wallet</h1>
          <p className="text-primary-500">Manage your funds and transactions</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setModalType('add-funds')}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Add Funds
          </button>
          {user?.role === 'vendor' && (
            <button 
              onClick={() => setModalType('withdraw')}
              className="btn btn-secondary"
            >
              <ArrowUpRight size={18} />
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-white/20 rounded-xl">
            <WalletIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Available Balance</p>
            <p className="text-4xl font-bold">{formatCurrency(summary?.wallet?.balance || 0)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/80 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Credited</span>
            </div>
            <p className="text-xl font-semibold">{formatCurrency(summary?.total_credited || 0)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/80 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Total Debited</span>
            </div>
            <p className="text-xl font-semibold">{formatCurrency(summary?.total_debited || 0)}</p>
          </div>
        </div>
      </div>

      {/* Referral Code Section */}
      {user?.referralCode && (
        <div className="bg-white rounded-xl border border-primary-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-accent-100 rounded-xl">
              <Gift className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-900">Refer & Earn</h2>
              <p className="text-sm text-primary-500">Share your code and earn rewards</p>
            </div>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-primary-600 mb-2">Your Referral Code</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary-900 tracking-wider">
                {user.referralCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode || '');
                  setCopiedReferral(true);
                  setTimeout(() => setCopiedReferral(false), 2000);
                }}
                className="p-2 rounded-lg bg-white border border-primary-200 hover:bg-primary-100 transition-colors"
                title="Copy code"
              >
                {copiedReferral ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-primary-600" />
                )}
              </button>
              <button
                onClick={() => {
                  const signupUrl = `${window.location.origin}/signup/customer?ref=${user.referralCode}`;
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join using my referral code!',
                      text: `Sign up and get ₹500 bonus! Use my referral code: ${user.referralCode}`,
                      url: signupUrl,
                    });
                  } else {
                    navigator.clipboard.writeText(signupUrl);
                    setCopiedReferral(true);
                    setTimeout(() => setCopiedReferral(false), 2000);
                  }
                }}
                className="p-2 rounded-lg bg-white border border-primary-200 hover:bg-primary-100 transition-colors"
                title="Share referral link"
              >
                <Share2 className="w-5 h-5 text-primary-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-700 font-medium">Your friend gets</p>
              <p className="text-xl font-bold text-green-600">₹500</p>
              <p className="text-xs text-green-600 mt-1">Added to their wallet on signup</p>
            </div>
            <div className="bg-accent-50 rounded-xl p-4 border border-accent-200">
              <p className="text-sm text-accent-700 font-medium">You get</p>
              <p className="text-xl font-bold text-accent-600">₹250</p>
              <p className="text-xs text-accent-600 mt-1">When they sign up using your code</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-primary-200 overflow-hidden">
        <div className="p-4 border-b border-primary-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary-900">Transaction History</h2>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('CREDIT')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'CREDIT'
                  ? 'bg-green-100 text-green-800'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              Credits
            </button>
            <button
              onClick={() => setFilterType('DEBIT')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'DEBIT'
                  ? 'bg-red-100 text-red-800'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              Debits
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-primary-500">
            <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-primary-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="p-4 hover:bg-primary-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      txn.transaction_type === 'CREDIT' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {txn.transaction_type === 'CREDIT' 
                        ? <ArrowDownLeft className="w-5 h-5" /> 
                        : <ArrowUpRight className="w-5 h-5" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-primary-900">
                        {txn.reference_type || (txn.transaction_type === 'CREDIT' ? 'Credit' : 'Debit')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-primary-500">
                        {txn.payment_method && (
                          <span className="flex items-center gap-1">
                            {getPaymentMethodIcon(txn.payment_method)}
                            {txn.payment_method}
                          </span>
                        )}
                        {txn.description && (
                          <span>• {txn.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold ${
                      txn.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-sm text-primary-500">
                      {getStatusIcon(txn.status)}
                      <span>{format(new Date(txn.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {modalType === 'add-funds' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-primary-200">
              <h3 className="text-lg font-semibold text-primary-900">Add Funds</h3>
              <button 
                onClick={() => setModalType(null)}
                className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddFunds} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input w-full"
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'UPI', label: 'UPI', icon: Smartphone },
                    { value: 'CARD', label: 'Card', icon: CreditCard },
                    { value: 'BANK_TRANSFER', label: 'Bank', icon: Building2 }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                        paymentMethod === method.value
                          ? 'border-accent-500 bg-accent-50 text-accent-700'
                          : 'border-primary-200 hover:border-primary-300'
                      }`}
                    >
                      <method.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus size={18} />
                      Add {amount ? formatCurrency(Number.parseFloat(amount)) : 'Funds'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {modalType === 'withdraw' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-primary-200">
              <h3 className="text-lg font-semibold text-primary-900">Withdraw Funds</h3>
              <button 
                onClick={() => setModalType(null)}
                className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleWithdraw} className="p-4 space-y-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-600">Available Balance</p>
                <p className="text-xl font-bold text-primary-900">
                  {formatCurrency(summary?.wallet.balance || 0)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input w-full"
                  placeholder="Enter amount"
                  min="1"
                  max={summary?.wallet.balance || 0}
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full"
                  placeholder="Reason for withdrawal"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !amount || Number.parseFloat(amount) > (summary?.wallet.balance || 0)}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowUpRight size={18} />
                      Withdraw
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
