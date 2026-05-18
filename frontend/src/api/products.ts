const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface RentalPricing {
  hourly?: number;
  daily?: number;
  weekly?: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  images: string[];
  category?: string;
  categoryId?: string;
  is_rentable: boolean;
  rental_pricing: RentalPricing;
  cost_price: number;
  sales_price: number;
  quantity_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;
  is_published: boolean;
  vendorId: string;
  vendor_name: string;
  attributes: ProductAttribute[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ProductCreateData {
  name: string;
  description?: string;
  images?: string[];
  categoryId?: string;
  is_rentable?: boolean;
  rental_pricing?: RentalPricing;
  cost_price?: number;
  sales_price?: number;
  quantity_on_hand?: number;
  is_published?: boolean;
  attributes?: ProductAttribute[];
}

class ProductsApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/products`;
  }

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }
    return response.json();
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Category[]>(response);
  }

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Category>(response);
  }

  // Products
  async getProducts(params?: {
    search?: string;
    category?: string;
    is_published?: boolean;
    vendorId?: string;
    sort_by?: string;
    skip?: number;
    limit?: number;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.is_published !== undefined) searchParams.append('is_published', String(params.is_published));
    if (params?.vendorId) searchParams.append('vendorId', params.vendorId);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Product[]>(response);
  }

  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Product>(response);
  }

  async createProduct(data: ProductCreateData): Promise<Product> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Product>(response);
  }

  async updateProduct(id: string, data: Partial<ProductCreateData>): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Product>(response);
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    return this.handleResponse<{ url: string; filename: string }>(response);
  }
}

export const productsApi = new ProductsApi();

