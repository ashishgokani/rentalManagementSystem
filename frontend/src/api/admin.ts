const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface DashboardStats {
  total_users: number;
  total_vendors: number;
  total_customers: number;
  active_users: number;
  new_users_this_month: number;
  new_vendors_this_month: number;
}

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyName: string | null;
  businessCategory: string | null;
  gstin: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminUserCreate {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  companyName?: string;
  businessCategory?: string;
  gstin?: string;
}

class AdminApiClient {
  private baseUrl = `${API_BASE_URL}/api/admin`;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    return response.json();
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.baseUrl}/dashboard/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<DashboardStats>(response);
  }

  // Users
  async listUsers(params: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<PaginatedResponse<UserListItem>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.search) searchParams.set('search', params.search);
    if (params.role) searchParams.set('role', params.role);
    if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const response = await fetch(`${this.baseUrl}/users?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<PaginatedResponse<UserListItem>>(response);
  }

  async getUser(userId: string): Promise<UserListItem> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<UserListItem>(response);
  }

  async createUser(userData: AdminUserCreate): Promise<UserListItem> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse<UserListItem>(response);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<UserListItem> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive: isActive }),
    });
    return this.handleResponse<UserListItem>(response);
  }

  async updateUserRole(userId: string, role: string): Promise<UserListItem> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/role`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return this.handleResponse<UserListItem>(response);
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Vendors
  async listVendors(params: {
    page?: number;
    per_page?: number;
    search?: string;
    isActive?: boolean;
  } = {}): Promise<PaginatedResponse<UserListItem>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.search) searchParams.set('search', params.search);
    if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const response = await fetch(`${this.baseUrl}/vendors?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<PaginatedResponse<UserListItem>>(response);
  }

  async approveVendor(vendorId: string, approved: boolean, rejectionReason?: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/vendors/${vendorId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ approved, rejection_reason: rejectionReason }),
    });
    return this.handleResponse<{ message: string }>(response);
  }
}

export const adminApi = new AdminApiClient();
