import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Grid, List, Plus, ChevronDown, Clock, Calendar, CalendarDays, Loader2, Trash2, Edit } from 'lucide-react';
import { productsApi, Product, Category } from '../../api/products';
import { useAuth } from '../../context/AuthContext';

type ViewMode = 'grid' | 'list';

export default function ProductsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getProducts({
          search: searchQuery,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          sort_by: sortBy || undefined,
          skip: (currentPage - 1) * itemsPerPage,
          limit: itemsPerPage
        }),
        productsApi.getCategories()
      ]);
      setProducts(productsData);
      setHasMore(productsData.length === itemsPerPage);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const handleDeleteClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      await productsApi.deleteProduct(productToDelete.id);
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const canManageProduct = (product: Product) => {
    if (!user) return false;
    const role = user.role.toUpperCase();
    if (role === 'ADMIN') return true;
    if (role === 'VENDOR' && product.vendorId === user.id) return true;
    return false;
  };

  const productCategories = ['All', ...categories.map(c => c.name)];

  const sortOptions = [
    { label: 'Newest First', value: '' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Quantity: Low to High', value: 'quantity_asc' },
    { label: 'Quantity: High to Low', value: 'quantity_desc' },
  ];

  /* Client-side filtering removed as we now filter on backend */
  const filteredProducts = products;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPriceDisplay = (product: Product) => {
    const pricing = product.rental_pricing;
    if (pricing?.hourly) {
      return { price: formatPrice(pricing.hourly), unit: '/hour' };
    }
    if (pricing?.daily) {
      return { price: formatPrice(pricing.daily), unit: '/day' };
    }
    if (pricing?.weekly) {
      return { price: formatPrice(pricing.weekly), unit: '/week' };
    }
    return { price: '-', unit: '' };
  };

  if (loading && currentPage === 1 && products.length === 0) {
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
          <h1 className="text-2xl font-bold text-primary-900">Products</h1>
          <p className="text-primary-500">Browse and rent equipment</p>
        </div>

        {(user?.role?.toUpperCase() === 'VENDOR' || user?.role?.toUpperCase() === 'ADMIN') && (
          <Link to="/products/new" className="btn btn-primary">
            <Plus size={18} />
            Add Product
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="input pl-10"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary w-full lg:w-auto"
            >
              <Filter size={18} />
              {selectedCategory}
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10">
                {productCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 ${selectedCategory === category ? 'bg-primary-100 font-medium' : ''
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="btn btn-secondary w-full lg:w-auto"
            >
              <Filter size={18} />
              Sort
              <ChevronDown size={16} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>

            {showSort && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-primary-200 rounded-xl shadow-lg py-2 z-10">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSort(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 ${sortBy === option.value ? 'bg-primary-100 font-medium' : ''
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex border border-primary-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-primary-900 text-white' : 'bg-white text-primary-600 hover:bg-primary-50'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 ${viewMode === 'list' ? 'bg-primary-900 text-white' : 'bg-white text-primary-600 hover:bg-primary-50'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-primary-500">
        Showing {filteredProducts.length} products (Page {currentPage})
      </p>

      {/* Products Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const priceInfo = getPriceDisplay(product);
            return (
              <div key={product.id} className="card card-hover overflow-hidden group relative">
                {/* Action Buttons for Vendor/Admin */}
                {canManageProduct(product) && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/products/${product.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-primary-50 text-primary-600"
                      title="Edit product"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={(e) => handleDeleteClick(e, product)}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-600"
                      title="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                <Link to={`/products/${product.id}`} className="block">
                  {/* Image */}
                  <div className="aspect-[4/3] bg-primary-100 overflow-hidden">
                    <img
                      src={(product.images && product.images[0]) || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="badge badge-neutral text-xs">{product.category || 'Uncategorized'}</span>
                      {product.available_quantity > 0 ? (
                        <span className="badge badge-success text-xs">Available</span>
                      ) : (
                        <span className="badge badge-danger text-xs">Out of Stock</span>
                      )}
                    </div>

                    <h3 className="font-semibold text-primary-900 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-primary-500 line-clamp-2">{product.description}</p>

                    {/* Pricing */}
                    <div className="pt-2 border-t border-primary-100">
                      <div className="flex items-center gap-3">
                        {product.rental_pricing?.hourly && (
                          <div className="flex items-center gap-1 text-xs text-primary-500">
                            <Clock size={14} />
                            {formatPrice(product.rental_pricing.hourly)}
                          </div>
                        )}
                        {product.rental_pricing?.daily && (
                          <div className="flex items-center gap-1 text-xs text-primary-500">
                            <Calendar size={14} />
                            {formatPrice(product.rental_pricing.daily)}
                          </div>
                        )}
                        {product.rental_pricing?.weekly && (
                          <div className="flex items-center gap-1 text-xs text-primary-500">
                            <CalendarDays size={14} />
                            {formatPrice(product.rental_pricing.weekly)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary-900">
                        {priceInfo.price}
                        <span className="text-sm font-normal text-primary-500">{priceInfo.unit}</span>
                      </span>
                      <span className="text-xs text-primary-500">
                        {product.available_quantity} available
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => {
            const priceInfo = getPriceDisplay(product);
            return (
              <div key={product.id} className="card card-hover p-4 flex gap-6 relative group">
                {/* Action Buttons for Vendor/Admin */}
                {canManageProduct(product) && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/products/${product.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-primary-50 text-primary-600"
                      title="Edit product"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={(e) => handleDeleteClick(e, product)}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-600"
                      title="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                <Link to={`/products/${product.id}`} className="flex gap-6 flex-1">
                  {/* Image */}
                  <div className="w-32 h-24 rounded-lg bg-primary-100 overflow-hidden flex-shrink-0">
                    <img
                      src={(product.images && product.images[0]) || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge badge-neutral text-xs">{product.category || 'Uncategorized'}</span>
                          {product.available_quantity > 0 ? (
                            <span className="badge badge-success text-xs">Available</span>
                          ) : (
                            <span className="badge badge-danger text-xs">Out of Stock</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-primary-900">{product.name}</h3>
                        <p className="text-sm text-primary-500 line-clamp-1 mt-1">{product.description}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-primary-900">{priceInfo.price}</span>
                        <span className="text-sm text-primary-500">{priceInfo.unit}</span>
                        <p className="text-xs text-primary-500 mt-1">{product.available_quantity} available</p>
                      </div>
                    </div>

                    {/* Pricing Options */}
                    <div className="flex items-center gap-4 mt-3">
                      {product.rental_pricing?.hourly && (
                        <div className="flex items-center gap-1 text-sm text-primary-600">
                          <Clock size={14} />
                          {formatPrice(product.rental_pricing.hourly)}/hr
                        </div>
                      )}
                      {product.rental_pricing?.daily && (
                        <div className="flex items-center gap-1 text-sm text-primary-600">
                          <Calendar size={14} />
                          {formatPrice(product.rental_pricing.daily)}/day
                        </div>
                      )}
                      {product.rental_pricing?.weekly && (
                        <div className="flex items-center gap-1 text-sm text-primary-600">
                          <CalendarDays size={14} />
                          {formatPrice(product.rental_pricing.weekly)}/week
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-900">No products found</h3>
          <p className="text-primary-500 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={() => setCurrentPage(Date.now() > 0 ? currentPage - 1 : 1)}
          disabled={currentPage === 1 || loading}
          className="btn btn-secondary"
        >
          Previous
        </button>
        <span className="flex items-center text-primary-600 font-medium">
          Page {currentPage}
        </span>
        <button
          onClick={() => setCurrentPage(Date.now() > 0 ? currentPage + 1 : 1)}
          disabled={!hasMore || loading}
          className="btn btn-secondary"
        >
          Next
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteModalOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setDeleteModalOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-primary-900 mb-2">Delete Product</h3>
            <p className="text-primary-600 mb-4">
              Are you sure you want to delete <span className="font-medium">"{productToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
