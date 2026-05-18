const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface RentalPeriodSelection {
  type: string;
  startDate: string;
  endDate: string;
  quantity: number;
}

export interface OrderLineCreate {
  productId: string;
  quantity: number;
  rental_period: RentalPeriodSelection;
  unitPrice: number;
  total_price: number;
}

export interface OrderCreate {
  quotationId?: string;
  vendorId: string;
  lines: OrderLineCreate[];
  security_deposit?: number;
  notes?: string;
}

export interface OrderLine {
  id: string;
  productId: string;
  product_name: string;
  quantity: number;
  rental_period_type: string;
  rental_start_date: string;
  rental_end_date: string;
  unitPrice: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  quotationId?: string;
  customerId: string;
  customer_name: string;
  vendorId: string;
  vendor_name: string;
  status: string;
  lines: OrderLine[];
  subtotal: number;
  tax_rate: number;
  taxAmount: number;
  security_deposit: number;
  totalAmount: number;
  paid_amount: number;
  rental_start_date?: string;
  rental_end_date?: string;
  pickup_date?: string;
  return_date?: string;
  late_return_fee: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderUpdate {
  status?: string;
  pickup_date?: string;
  return_date?: string;
  late_return_fee?: number;
  paid_amount?: number;
}

class OrdersApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/orders`;
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

  async getOrders(params?: {
    status?: string;
    paymentStatus?: string;
    returnStatus?: string;
    skip?: number;
    limit?: number;
  }): Promise<Order[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.paymentStatus) searchParams.append('payment_status', params.paymentStatus);
    if (params?.returnStatus) searchParams.append('return_status', params.returnStatus);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Order[]>(response);
  }

  async getOrder(id: string): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Order>(response);
  }

  async createOrder(data: OrderCreate): Promise<Order> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Order>(response);
  }

  async updateOrder(id: string, data: OrderUpdate): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Order>(response);
  }

  async cancelOrder(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }
}

export const ordersApi = new OrdersApi();
