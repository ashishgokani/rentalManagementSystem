import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, ChevronDown, Eye, Edit2, Send, Trash2, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { quotationsApi, Quotation } from '../../api/quotations';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { QuotationStatus } from '../../types';

const statusColors: Partial<Record<QuotationStatus, string>> = {
  draft: 'badge-neutral',
  sent: 'badge-info',
  confirmed: 'badge-success',
  cancelled: 'badge-danger',
};

export default function QuotationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setLoading(true);
        const data = await quotationsApi.getQuotations(
          statusFilter !== 'all' ? { status: statusFilter } : {}
        );
        setQuotations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quotations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuotations();
  }, [statusFilter]);

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Quotations</h1>
          <p className="text-primary-500">Manage your rental quotations</p>
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
              placeholder="Search quotations..."
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
                {['all', 'draft', 'sent', 'confirmed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status as QuotationStatus | 'all');
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 capitalize ${
                      statusFilter === status ? 'bg-primary-100 font-medium' : ''
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

      {/* Quotations List */}
      <div className="space-y-4">
        {filteredQuotations.map((quotation) => (
          <div key={quotation.id} className="card p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Main Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-900">{quotation.quotation_number}</h3>
                    <p className="text-sm text-primary-500">
                      {user?.role !== 'customer' && `Customer: ${quotation.customer_name || 'N/A'} • `}
                      Created {format(new Date(quotation.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5 text-primary-600">
                    <Calendar size={14} />
                    Valid until {quotation.valid_until ? format(new Date(quotation.valid_until), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 text-primary-600">
                    <DollarSign size={14} />
                    {(quotation.lines || []).length} item(s)
                  </div>
                </div>
              </div>

              {/* Status and Amount */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-primary-500">Total Amount</p>
                  <p className="text-xl font-bold text-primary-900">{formatPrice(quotation.totalAmount)}</p>
                </div>
                <span className={`badge ${statusColors[quotation.status as QuotationStatus] || 'badge-neutral'} capitalize`}>
                  {quotation.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 lg:border-l lg:border-primary-200 lg:pl-6">
                <Link
                  to={`/quotations/${quotation.id}`}
                  className="btn btn-ghost p-2"
                  title="View"
                >
                  <Eye size={18} />
                </Link>
                
                {quotation.status === 'draft' && (
                  <>
                    <button className="btn btn-ghost p-2" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button className="btn btn-ghost p-2" title="Send">
                      <Send size={18} />
                    </button>
                    <button className="btn btn-ghost p-2 text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
                
                {quotation.status === 'sent' && user?.role === 'customer' && (
                  <button className="btn btn-primary text-sm">
                    Confirm Order
                  </button>
                )}
              </div>
            </div>

            {/* Line Items Preview */}
            <div className="mt-4 pt-4 border-t border-primary-100">
              <div className="flex flex-wrap gap-2">
                {(quotation.lines || []).map((line) => (
                  <span key={line.id} className="px-3 py-1 bg-primary-50 rounded-full text-sm text-primary-700">
                    {line.product_name} × {line.quantity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredQuotations.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-900">No quotations found</h3>
          <p className="text-primary-500 mt-1">
            {user?.role === 'customer' 
              ? 'Add products to your cart to create a quotation'
              : 'No quotations match your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
}
