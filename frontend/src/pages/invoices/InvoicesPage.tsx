import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Download,
  Send,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { invoicesApi, Invoice } from '../../api/invoices';
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

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
  draft: <Clock size={14} />,
  sent: <Send size={14} />,
  partial: <AlertCircle size={14} />,
  paid: <CheckCircle size={14} />,
  cancelled: <XCircle size={14} />,
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await invoicesApi.getInvoices(
          statusFilter !== 'all' ? { status: statusFilter } : {}
        );
        setInvoices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [statusFilter]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const totalStats = {
    total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.paid_amount || 0), 0),
    pending: invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + (inv.totalAmount - (inv.paid_amount || 0)), 0),
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
          <h1 className="text-2xl font-bold text-primary-900">Invoices</h1>
          <p className="text-primary-500">Manage and track your invoices</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Receipt size={20} className="text-primary-700" />
            </div>
            <div>
              <p className="text-sm text-primary-500">Total Invoiced</p>
              <p className="text-lg font-semibold text-primary-900">{formatPrice(totalStats.total)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-primary-500">Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatPrice(totalStats.paid)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-primary-500">Pending</p>
              <p className="text-lg font-semibold text-yellow-600">{formatPrice(totalStats.pending)}</p>
            </div>
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
              placeholder="Search invoices..."
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              <Filter size={18} />
              {statusFilter === 'all' ? 'All Status' : statusFilter}
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10">
                {['all', 'draft', 'sent', 'partial', 'paid', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status as InvoiceStatus | 'all');
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 capitalize ${statusFilter === status ? 'bg-primary-100 font-medium' : ''
                      }`}
                  >
                    {status === 'all' ? 'All Status' : status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="card p-12 text-center">
            <Receipt size={48} className="mx-auto text-primary-300 mb-4" />
            <h3 className="text-lg font-medium text-primary-900 mb-2">No invoices found</h3>
            <p className="text-primary-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'You don\'t have any invoices yet'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="card p-6 card-hover">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Receipt size={20} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-900">{invoice.invoice_number}</h3>
                      <p className="text-sm text-primary-500">{invoice.customer_name || 'N/A'}</p>
                    </div>
                    <span className={`badge ${statusColors[invoice.status as InvoiceStatus] || 'badge-neutral'} flex items-center gap-1 ml-2`}>
                      {statusIcons[invoice.status as InvoiceStatus]}
                      <span className="capitalize">{invoice.status}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-primary-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      Order: {invoice.orderId}
                    </span>
                  </div>
                </div>

                {/* Amount & Payment Info */}
                <div className="lg:text-right">
                  <p className="text-sm text-primary-500">Total Amount</p>
                  <p className="text-xl font-bold text-primary-900">{formatPrice(invoice.totalAmount)}</p>
                  {invoice.status === 'partial' && (
                    <p className="text-sm text-yellow-600 mt-1">
                      Paid: {formatPrice(invoice.paid_amount || 0)} | Due: {formatPrice(invoice.totalAmount - (invoice.paid_amount || 0))}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="btn btn-secondary"
                  >
                    <Eye size={18} />
                    View
                  </Link>
                  <Link
                    to={`/invoices/${invoice.id}?print=true`}
                    className="btn btn-ghost"
                    title="Print/Download Invoice"
                  >
                    <Download size={18} />
                  </Link>
                  {(user?.role === 'vendor' || user?.role === 'admin') && invoice.status === 'draft' && (
                    <button className="btn btn-ghost">
                      <Send size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice Lines Preview */}
              <div className="mt-4 pt-4 border-t border-primary-100">
                <div className="text-sm text-primary-600">
                  {(invoice.lines || []).length} item{(invoice.lines || []).length !== 1 ? 's' : ''}: {' '}
                  {(invoice.lines || []).map(line => line.description).join(', ').substring(0, 100)}
                  {(invoice.lines || []).map(line => line.description).join(', ').length > 100 && '...'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
