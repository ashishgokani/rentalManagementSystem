import { useState, useEffect } from 'react';
import {
    Wallet,
    Search,
    Plus,
    Minus,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    X,
    Users,
    DollarSign,
    Activity
} from 'lucide-react';
import { adminApi, AdminWallet, WalletStats, AdminTransaction, AdminUser } from '../../api/adminApi';
import { format } from 'date-fns';

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<'transactions' | 'wallets'>('transactions');
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [wallets, setWallets] = useState<AdminWallet[]>([]);
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Modal states
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustData, setAdjustData] = useState({
        user_id: '',
        amount: 0,
        transaction_type: 'CREDIT',
        description: ''
    });
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab, typeFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, usersData] = await Promise.all([
                adminApi.getWalletStats(),
                adminApi.getUsers({ per_page: 100 })
            ]);
            setStats(statsData);
            setUsers(usersData.items);

            if (activeTab === 'transactions') {
                const txns = await adminApi.getTransactions({
                    search: searchQuery,
                    transaction_type: typeFilter
                });
                setTransactions(txns);
            } else {
                const walletData = await adminApi.getWallets(searchQuery);
                setWallets(walletData);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchData();
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price);
    };

    const handleAdjustWallet = async () => {
        if (!adjustData.user_id || !adjustData.amount || !adjustData.description) {
            setError('Please fill all fields');
            return;
        }

        try {
            setAdjusting(true);
            await adminApi.adjustWallet(adjustData);
            setShowAdjustModal(false);
            setAdjustData({ user_id: '', amount: 0, transaction_type: 'CREDIT', description: '' });
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to adjust wallet');
        } finally {
            setAdjusting(false);
        }
    };

    if (loading && !transactions.length && !wallets.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary-900">Transaction Management</h1>
                    <p className="text-primary-500">Manage wallets and transactions</p>
                </div>
                <button
                    onClick={() => setShowAdjustModal(true)}
                    className="btn btn-primary"
                >
                    <DollarSign size={18} />
                    Adjust Wallet
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex justify-between items-center">
                    {error}
                    <button onClick={() => setError(null)}><X size={18} /></button>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Wallet size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary-900">{formatPrice(stats.total_balance)}</p>
                                <p className="text-sm text-primary-500">Total Balance</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <TrendingUp size={24} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">{formatPrice(stats.total_credited)}</p>
                                <p className="text-sm text-primary-500">Total Credited</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <TrendingDown size={24} className="text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{formatPrice(stats.total_debited)}</p>
                                <p className="text-sm text-primary-500">Total Debited</p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Activity size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary-900">{stats.transactions_today}</p>
                                <p className="text-sm text-primary-500">Today's Transactions</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs and Filter */}
            <div className="card">
                <div className="border-b border-primary-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions'
                                    ? 'border-primary-900 text-primary-900'
                                    : 'border-transparent text-primary-500 hover:text-primary-700'
                                }`}
                        >
                            All Transactions
                        </button>
                        <button
                            onClick={() => setActiveTab('wallets')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wallets'
                                    ? 'border-primary-900 text-primary-900'
                                    : 'border-transparent text-primary-500 hover:text-primary-700'
                                }`}
                        >
                            All Wallets
                        </button>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="p-4 border-b border-primary-100 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="input pl-10 w-full"
                        />
                    </div>
                    {activeTab === 'transactions' && (
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="input w-auto"
                        >
                            <option value="">All Types</option>
                            <option value="CREDIT">Credits Only</option>
                            <option value="DEBIT">Debits Only</option>
                        </select>
                    )}
                    <button onClick={handleSearch} className="btn btn-secondary">
                        Search
                    </button>
                </div>

                {/* Transactions Table */}
                {activeTab === 'transactions' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-primary-200">
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">User</th>
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">Type</th>
                                    <th className="text-right text-sm font-medium text-primary-600 py-3 px-4">Amount</th>
                                    <th className="text-right text-sm font-medium text-primary-600 py-3 px-4">Balance After</th>
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">Description</th>
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-100">
                                {transactions.length > 0 ? (
                                    transactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-primary-50">
                                            <td className="py-4 px-4">
                                                <div>
                                                    <p className="font-medium text-primary-900">{txn.user_name}</p>
                                                    <p className="text-sm text-primary-500">{txn.user_email}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${txn.transaction_type === 'CREDIT'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {txn.transaction_type === 'CREDIT' ? (
                                                        <ArrowUpRight size={14} />
                                                    ) : (
                                                        <ArrowDownRight size={14} />
                                                    )}
                                                    {txn.transaction_type}
                                                </span>
                                            </td>
                                            <td className={`py-4 px-4 text-right font-medium ${txn.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {txn.transaction_type === 'CREDIT' ? '+' : '-'}{formatPrice(txn.amount)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-primary-900">
                                                {formatPrice(txn.balance_after)}
                                            </td>
                                            <td className="py-4 px-4 text-primary-600 max-w-[200px] truncate">
                                                {txn.description || txn.reference_type || '-'}
                                            </td>
                                            <td className="py-4 px-4 text-primary-600">
                                                {txn.createdAt ? format(new Date(txn.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-primary-500">
                                            No transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Wallets Table */}
                {activeTab === 'wallets' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-primary-200">
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">User</th>
                                    <th className="text-right text-sm font-medium text-primary-600 py-3 px-4">Balance</th>
                                    <th className="text-center text-sm font-medium text-primary-600 py-3 px-4">Status</th>
                                    <th className="text-left text-sm font-medium text-primary-600 py-3 px-4">Created</th>
                                    <th className="text-center text-sm font-medium text-primary-600 py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-100">
                                {wallets.length > 0 ? (
                                    wallets.map((wallet) => (
                                        <tr key={wallet.id} className="hover:bg-primary-50">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                        <span className="font-medium text-primary-700">{wallet.user_name[0]}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-primary-900">{wallet.user_name}</p>
                                                        <p className="text-sm text-primary-500">{wallet.user_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`text-lg font-bold ${wallet.balance > 0 ? 'text-green-600' : 'text-primary-900'}`}>
                                                    {formatPrice(wallet.balance)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`badge ${wallet.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                    {wallet.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-primary-600">
                                                {wallet.createdAt ? format(new Date(wallet.createdAt), 'MMM d, yyyy') : '-'}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setAdjustData({
                                                                user_id: wallet.user_id,
                                                                amount: 0,
                                                                transaction_type: 'CREDIT',
                                                                description: ''
                                                            });
                                                            setShowAdjustModal(true);
                                                        }}
                                                        className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                                                        title="Add Money"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAdjustData({
                                                                user_id: wallet.user_id,
                                                                amount: 0,
                                                                transaction_type: 'DEBIT',
                                                                description: ''
                                                            });
                                                            setShowAdjustModal(true);
                                                        }}
                                                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                                                        title="Remove Money"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-primary-500">
                                            No wallets found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Adjust Wallet Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-primary-900">
                                {adjustData.transaction_type === 'CREDIT' ? 'Add Money' : 'Remove Money'}
                            </h2>
                            <button onClick={() => setShowAdjustModal(false)} className="text-primary-500 hover:text-primary-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-2">Select User</label>
                                <select
                                    value={adjustData.user_id}
                                    onChange={(e) => setAdjustData({ ...adjustData, user_id: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">Choose a user...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-2">Transaction Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="CREDIT"
                                            checked={adjustData.transaction_type === 'CREDIT'}
                                            onChange={(e) => setAdjustData({ ...adjustData, transaction_type: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <span className="text-green-600 font-medium">Credit (Add)</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="DEBIT"
                                            checked={adjustData.transaction_type === 'DEBIT'}
                                            onChange={(e) => setAdjustData({ ...adjustData, transaction_type: e.target.value })}
                                            className="w-4 h-4 text-red-600"
                                        />
                                        <span className="text-red-600 font-medium">Debit (Remove)</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-2">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={adjustData.amount || ''}
                                    onChange={(e) => setAdjustData({ ...adjustData, amount: parseFloat(e.target.value) || 0 })}
                                    className="input w-full"
                                    placeholder="Enter amount"
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary-700 mb-2">Description / Reason</label>
                                <textarea
                                    value={adjustData.description}
                                    onChange={(e) => setAdjustData({ ...adjustData, description: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                    placeholder="Reason for this adjustment..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdjustWallet}
                                    disabled={adjusting}
                                    className={`btn flex-1 ${adjustData.transaction_type === 'CREDIT'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                        }`}
                                >
                                    {adjusting ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : adjustData.transaction_type === 'CREDIT' ? (
                                        <>
                                            <Plus size={18} />
                                            Add Money
                                        </>
                                    ) : (
                                        <>
                                            <Minus size={18} />
                                            Remove Money
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
