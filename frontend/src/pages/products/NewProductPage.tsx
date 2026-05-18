import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, ImagePlus } from 'lucide-react';
import { productsApi, Category, ProductCreateData, RentalPricing, ProductAttribute } from '../../api/products';
import { useAuth } from '../../context/AuthContext';

export default function NewProductPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isRentable, setIsRentable] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [quantityOnHand, setQuantityOnHand] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [salesPrice, setSalesPrice] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Rental pricing
  const [hourlyPrice, setHourlyPrice] = useState<number | undefined>();
  const [dailyPrice, setDailyPrice] = useState<number | undefined>();
  const [weeklyPrice, setWeeklyPrice] = useState<number | undefined>();

  // Attributes
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    // Redirect if not vendor or admin
    const role = user?.role?.toUpperCase();
    if (!loading && (!user || (role !== 'VENDOR' && role !== 'ADMIN'))) {
      navigate('/products');
      return;
    }

    const fetchCategories = async () => {
      try {
        const data = await productsApi.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    fetchCategories();
  }, [user, navigate]);

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  const handleUpdateAttribute = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rentalPricing: RentalPricing = {};
      if (hourlyPrice) rentalPricing.hourly = hourlyPrice;
      if (dailyPrice) rentalPricing.daily = dailyPrice;
      if (weeklyPrice) rentalPricing.weekly = weeklyPrice;

      const productData: ProductCreateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        categoryId: categoryId || undefined,
        is_rentable: isRentable,
        rental_pricing: Object.keys(rentalPricing).length > 0 ? rentalPricing : undefined,
        cost_price: costPrice || undefined,
        sales_price: salesPrice || undefined,
        quantity_on_hand: quantityOnHand,
        is_published: isPublished,
        attributes: attributes.filter(attr => attr.name.trim() && attr.value.trim())
      };

      const created = await productsApi.createProduct(productData);
      navigate(`/products/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-primary-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Add New Product</h1>
          <p className="text-primary-500">Create a new product listing</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-primary-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              rows={4}
              placeholder="Enter product description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input w-full"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Quantity on Hand
              </label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(parseInt(e.target.value) || 0)}
                className="input w-full"
                min="0"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRentable}
                onChange={(e) => setIsRentable(e.target.checked)}
                className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500"
              />
              <span className="text-sm text-primary-700">Available for Rent</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500"
              />
              <span className="text-sm text-primary-700">Published (visible to customers)</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border border-primary-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary-900">Images</h2>

          {/* File Upload Zone */}
          <div
            className="border-2 border-dashed border-primary-300 rounded-xl p-8 text-center hover:border-accent-500 hover:bg-accent-50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('image-upload')?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent-500', 'bg-accent-50'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent-500', 'bg-accent-50'); }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-accent-500', 'bg-accent-50');
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              for (const file of files) {
                try {
                  const result = await productsApi.uploadImage(file);
                  setImages(prev => [...prev, `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${result.url}`]);
                } catch (err) {
                  setError(`Failed to upload ${file.name}`);
                }
              }
            }}
          >
            <ImagePlus size={48} className="mx-auto text-primary-400 mb-4" />
            <p className="text-primary-600 font-medium">Drag and drop images here</p>
            <p className="text-sm text-primary-400 mt-1">or click to select files</p>
            <p className="text-xs text-primary-400 mt-2">Supported: JPG, PNG, GIF, WebP (Max 5MB)</p>
          </div>

          <input
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                try {
                  const result = await productsApi.uploadImage(file);
                  setImages(prev => [...prev, `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${result.url}`]);
                } catch (err) {
                  setError(`Failed to upload ${file.name}`);
                }
              }
              e.target.value = ''; // Reset input
            }}
          />

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-primary-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-primary-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary-900">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                value={costPrice || ''}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="input w-full"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Sales Price (₹)
              </label>
              <input
                type="number"
                value={salesPrice || ''}
                onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                className="input w-full"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          {isRentable && (
            <>
              <h3 className="text-md font-medium text-primary-800 mt-4">Rental Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    Hourly Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={hourlyPrice || ''}
                    onChange={(e) => setHourlyPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input w-full"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    Daily Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={dailyPrice || ''}
                    onChange={(e) => setDailyPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input w-full"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    Weekly Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={weeklyPrice || ''}
                    onChange={(e) => setWeeklyPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input w-full"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Attributes */}
        <div className="bg-white rounded-xl border border-primary-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary-900">Attributes</h2>
            <button
              type="button"
              onClick={handleAddAttribute}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={16} />
              Add Attribute
            </button>
          </div>

          {attributes.length > 0 && (
            <div className="space-y-3">
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => handleUpdateAttribute(index, 'name', e.target.value)}
                    className="input flex-1"
                    placeholder="Attribute name (e.g., Color)"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => handleUpdateAttribute(index, 'value', e.target.value)}
                    className="input flex-1"
                    placeholder="Value (e.g., Red)"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {attributes.length === 0 && (
            <p className="text-sm text-primary-500">
              No attributes added yet. Click "Add Attribute" to add custom attributes like size, color, etc.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Create Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
