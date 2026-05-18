import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign, Calendar, Tag, Loader2 } from 'lucide-react';
import { adminApi, Coupon, CouponCreate } from '../../api/adminApi';
import { format } from 'date-fns';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponCreate>({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_order_amount: undefined,
    max_discount_amount: undefined,
    usage_limit: undefined,
    per_user_limit: 1,
    valid_from: undefined,
    valid_until: undefined,
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, [searchTerm, filterActive]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCoupons({
        search: searchTerm || undefined,
        isActive: filterActive
      });
      setCoupons(response.coupons);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_order_amount: undefined,
      max_discount_amount: undefined,
      usage_limit: undefined,
      per_user_limit: 1,
      valid_from: undefined,
      valid_until: undefined,
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount_amount: coupon.max_discount_amount,
      usage_limit: coupon.usage_limit,
      per_user_limit: coupon.per_user_limit,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      isActive: coupon.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCoupon) {
        await adminApi.updateCoupon(editingCoupon.id, formData);
      } else {
        await adminApi.createCoupon(formData);
      }
      setShowModal(false);
      loadCoupons();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await adminApi.deleteCoupon(couponId);
      loadCoupons();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete coupon');
    }
  };

  const handleToggle = async (couponId: string) => {
    try {
      await adminApi.toggleCouponStatus(couponId);
      loadCoupons();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to toggle coupon status');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Coupons</h1>
          <p className="text-primary-500">Manage discount coupons for your customers</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} />
          Create Coupon
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
              <input
                type="text"
                placeholder="Search by code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <select
            value={filterActive === undefined ? '' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : coupons.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={48} className="mx-auto text-primary-300 mb-4" />
          <h3 className="text-lg font-semibold text-primary-900">No coupons found</h3>
          <p className="text-primary-500 mt-1">Create your first coupon to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`card p-4 ${!coupon.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${coupon.discount_type === 'PERCENTAGE' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {coupon.discount_type === 'PERCENTAGE' ? (
                      <Percent size={18} className="text-blue-600" />
                    ) : (
                      <DollarSign size={18} className="text-green-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-mono font-bold text-primary-900">{coupon.code}</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(coupon.id)} className="p-1.5 hover:bg-primary-100 rounded" title="Toggle status">
                    {coupon.isActive ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                  </button>
                  <button onClick={() => handleEdit(coupon)} className="p-1.5 hover:bg-primary-100 rounded" title="Edit">
                    <Edit2 size={16} className="text-primary-600" />
                  </button>
                  <button onClick={() => handleDelete(coupon.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              <div className="text-2xl font-bold text-primary-900 mb-2">
                {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : `${formatPrice(coupon.discount_value)} OFF`}
              </div>

              {coupon.description && (
                <p className="text-sm text-primary-600 mb-3">{coupon.description}</p>
              )}

              <div className="space-y-1 text-xs text-primary-500">
                {coupon.min_order_amount && (
                  <div>Min order: {formatPrice(coupon.min_order_amount)}</div>
                )}
                {coupon.max_discount_amount && (
                  <div>Max discount: {formatPrice(coupon.max_discount_amount)}</div>
                )}
                {coupon.usage_limit && (
                  <div>Usage: {coupon.usage_count}/{coupon.usage_limit}</div>
                )}
                {coupon.valid_until && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    Expires: {format(new Date(coupon.valid_until), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-primary-900 mb-4">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Coupon Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="input w-full font-mono"
                    placeholder="SUMMER20"
                    required
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input w-full"
                    placeholder="Summer sale discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Discount Type *</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                      className="input w-full"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Discount Value *</label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                      className="input w-full"
                      min="0"
                      step={formData.discount_type === 'PERCENTAGE' ? '1' : '10'}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Min Order Amount</label>
                    <input
                      type="number"
                      value={formData.min_order_amount || ''}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="input w-full"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">Max Discount</label>
                    <input
                      type="number"
                      value={formData.max_discount_amount || ''}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="input w-full"
                      placeholder="No limit"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Usage Limit</label>
                    <input
                      type="number"
                      value={formData.usage_limit || ''}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="input w-full"
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="label">Per User Limit</label>
                    <input
                      type="number"
                      value={formData.per_user_limit || ''}
                      onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="input w-full"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Valid From</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_from?.slice(0, 16) || ''}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Valid Until</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_until?.slice(0, 16) || ''}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm text-primary-700">Active immediately</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {editingCoupon ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
