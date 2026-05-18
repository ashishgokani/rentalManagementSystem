const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface TopProduct {
  name: string;
  rentals: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  active_rentals: number;
  pending_returns: number;
  total_products: number;
  top_products: TopProduct[];
  revenue_by_month: RevenueByMonth[];
  orders_by_status: OrdersByStatus[];
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  vendor_name: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface VendorPerformance {
  vendorId: string;
  vendor_name: string;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  avg_order_value: number;
}

export interface DailyStats {
  date: string;
  day_name: string;
  orders: number;
  revenue: number;
}

export interface CategoryStats {
  categoryId: string;
  category_name: string;
  product_count: number;
  order_count: number;
  revenue: number;
  percentage: number;
}

class DashboardApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/dashboard`;
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

  async getStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<DashboardStats>(response);
  }

  async getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
    const response = await fetch(`${this.baseUrl}/recent-orders?limit=${limit}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<RecentOrder[]>(response);
  }

  async getVendorPerformance(): Promise<VendorPerformance[]> {
    const response = await fetch(`${this.baseUrl}/reports/vendor-performance`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<VendorPerformance[]>(response);
  }

  async getWeeklyStats(): Promise<DailyStats[]> {
    const response = await fetch(`${this.baseUrl}/reports/weekly-stats`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<DailyStats[]>(response);
  }

  async getCategoryDistribution(): Promise<CategoryStats[]> {
    const response = await fetch(`${this.baseUrl}/reports/category-distribution`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<CategoryStats[]>(response);
  }

  async exportReport(reportType: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reports/export?report_type=${reportType}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const dashboardApi = new DashboardApi();

