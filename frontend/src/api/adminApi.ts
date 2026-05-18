const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  companyName?: string;
  businessCategory?: string;
  gstin?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DashboardStats {
  total_users: number;
  total_vendors: number;
  total_customers: number;
  active_users: number;
  new_users_this_month: number;
  new_vendors_this_month: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_vendors: number;
  recent_activities: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  companyName?: string;
  businessCategory?: string;
  gstin?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
  parentId?: string;
  createdAt?: string;
}

class AdminApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/admin`;
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

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.baseUrl}/dashboard/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<DashboardStats>(response);
  }

  async getFullDashboard(): Promise<AdminDashboardData> {
    // Fetch multiple endpoints in parallel
    const [stats, products, orders, invoices, pendingVendors] = await Promise.all([
      this.getDashboardStats(),
      this.getProductsCount(),
      this.getOrdersCount(),
      this.getTotalRevenue(),
      this.getPendingVendorsCount()
    ]);

    return {
      stats,
      total_products: products,
      total_orders: orders,
      total_revenue: invoices,
      pending_vendors: pendingVendors,
      recent_activities: []
    };
  }

  private async getProductsCount(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: this.getHeaders()
      });
      const products = await this.handleResponse<any[]>(response);
      return products.length;
    } catch {
      return 0;
    }
  }

  private async getOrdersCount(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: this.getHeaders()
      });
      const orders = await this.handleResponse<any[]>(response);
      return orders.length;
    } catch {
      return 0;
    }
  }

  private async getTotalRevenue(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        headers: this.getHeaders()
      });
      const invoices = await this.handleResponse<any[]>(response);
      return invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    } catch {
      return 0;
    }
  }

  private async getPendingVendorsCount(): Promise<number> {
    try {
      const vendors = await this.getVendors({ isActive: false });
      return vendors.total;
    } catch {
      return 0;
    }
  }

  // Users
  async getUsers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
    isActive?: boolean;
  }): Promise<PaginatedUsers> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.per_page) searchParams.append('per_page', String(params.per_page));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive));

    const url = `${this.baseUrl}/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<PaginatedUsers>(response);
  }

  async getUser(id: string): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<AdminUser>(response);
  }

  async createUser(data: CreateUserData): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<AdminUser>(response);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ isActive })
    });
    return this.handleResponse<AdminUser>(response);
  }

  async updateUserRole(id: string, role: 'CUSTOMER' | 'VENDOR' | 'ADMIN'): Promise<AdminUser> {
    const response = await fetch(`${this.baseUrl}/users/${id}/role`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ role })
    });
    return this.handleResponse<AdminUser>(response);
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Vendors
  async getVendors(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedUsers> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.per_page) searchParams.append('per_page', String(params.per_page));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive));

    const url = `${this.baseUrl}/vendors${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<PaginatedUsers>(response);
  }

  async approveVendor(id: string, approved: boolean, rejection_reason?: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/vendors/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ approved, rejection_reason })
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Categories (uses products API)
  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Category[]>(response);
  }

  async createCategory(data: { name: string; description?: string; parentId?: string }): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Category>(response);
  }

  async updateCategory(id: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Category>(response);
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Wallet Management
  async getWallets(search?: string): Promise<AdminWallet[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const response = await fetch(`${this.baseUrl}/wallets?${params}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<AdminWallet[]>(response);
  }

  async getWalletStats(): Promise<WalletStats> {
    const response = await fetch(`${this.baseUrl}/wallets/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<WalletStats>(response);
  }

  async getTransactions(params?: { search?: string; transaction_type?: string }): Promise<AdminTransaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.transaction_type) queryParams.append('transaction_type', params.transaction_type);
    const response = await fetch(`${this.baseUrl}/transactions?${queryParams}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<AdminTransaction[]>(response);
  }

  async adjustWallet(data: { user_id: string; amount: number; transaction_type: string; description: string }): Promise<{ message: string; new_balance: number; transaction_id: string }> {
    const response = await fetch(`${this.baseUrl}/wallets/adjust`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<{ message: string; new_balance: number; transaction_id: string }>(response);
  }

  // Coupon Management
  async getCoupons(params?: { page?: number; page_size?: number; search?: string; isActive?: boolean }): Promise<PaginatedCoupons> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    const response = await fetch(`${this.baseUrl}/coupons?${queryParams}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<PaginatedCoupons>(response);
  }

  async getCoupon(couponId: string): Promise<Coupon> {
    const response = await fetch(`${this.baseUrl}/coupons/${couponId}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Coupon>(response);
  }

  async createCoupon(data: CouponCreate): Promise<Coupon> {
    const response = await fetch(`${this.baseUrl}/coupons`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Coupon>(response);
  }

  async updateCoupon(couponId: string, data: Partial<CouponCreate>): Promise<Coupon> {
    const response = await fetch(`${this.baseUrl}/coupons/${couponId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Coupon>(response);
  }

  async deleteCoupon(couponId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/coupons/${couponId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async toggleCouponStatus(couponId: string): Promise<{ message: string; isActive: boolean }> {
    const response = await fetch(`${this.baseUrl}/coupons/${couponId}/toggle`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string; isActive: boolean }>(response);
  }
}

// Additional types for wallet management
export interface AdminWallet {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface WalletStats {
  total_wallets: number;
  total_balance: number;
  total_credited: number;
  total_debited: number;
  active_wallets: number;
  transactions_today: number;
  transactions_this_month: number;
}

export interface AdminTransaction {
  id: string;
  wallet_id: string;
  user_name: string;
  user_email: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  reference_type?: string;
  description?: string;
  createdAt: string;
}

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit?: number;
  valid_from?: string;
  valid_until?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CouponCreate {
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  valid_from?: string;
  valid_until?: string;
  isActive?: boolean;
}

export interface PaginatedCoupons {
  coupons: Coupon[];
  total: number;
  page: number;
  page_size: number;
}

export const adminApi = new AdminApi();
