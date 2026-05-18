const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface RentalPeriodSelection {
  type: string;
  startDate: string;
  endDate: string;
  quantity: number;
}

export interface QuotationLineCreate {
  productId: string;
  quantity: number;
  rental_period: RentalPeriodSelection;
  unitPrice: number;
  total_price: number;
}

export interface QuotationCreate {
  lines: QuotationLineCreate[];
  valid_days?: number;
  notes?: string;
}

export interface QuotationLine {
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

export interface Quotation {
  id: string;
  quotation_number: string;
  customerId: string;
  customer_name: string;
  status: string;
  lines: QuotationLine[];
  subtotal: number;
  tax_rate: number;
  taxAmount: number;
  totalAmount: number;
  valid_until?: string;
  createdAt: string;
  updatedAt: string;
}

class QuotationsApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/quotations`;
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

  async getQuotations(params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Quotation[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Quotation[]>(response);
  }

  async getQuotation(id: string): Promise<Quotation> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Quotation>(response);
  }

  async createQuotation(data: QuotationCreate): Promise<Quotation[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Quotation[]>(response);
  }

  async updateQuotation(id: string, data: {
    status?: string;
    notes?: string;
    lines?: { id: string; unitPrice: number; total_price: number }[];
  }): Promise<Quotation> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Quotation>(response);
  }

  async deleteQuotation(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }
}

export const quotationsApi = new QuotationsApi();
