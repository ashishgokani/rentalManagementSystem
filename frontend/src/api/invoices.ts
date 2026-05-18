const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface InvoiceLineCreate {
  description: string;
  quantity: number;
  unitPrice: number;
  total_price: number;
}

export interface InvoiceCreate {
  orderId: string;
  lines: InvoiceLineCreate[];
  due_days?: number;
  notes?: string;
}

export interface PaymentCreate {
  amount: number;
  method: string;
  transaction_id?: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total_price: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  transaction_id?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  orderId: string;
  customerId: string;
  customer_name: string;
  customer_gstin?: string;
  status: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax_rate: number;
  taxAmount: number;
  totalAmount: number;
  paid_amount: number;
  due_date?: string;
  createdAt: string;
  updatedAt: string;
}

class InvoicesApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/invoices`;
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

  async getInvoices(params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Invoice[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Invoice[]>(response);
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Invoice>(response);
  }

  async getInvoiceByOrder(orderId: string): Promise<Invoice | null> {
    const response = await fetch(`${this.baseUrl}/order/${orderId}`, {
      headers: this.getHeaders()
    });
    if (response.status === 404) return null;
    return this.handleResponse<Invoice>(response);
  }

  async createInvoice(data: InvoiceCreate): Promise<Invoice> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Invoice>(response);
  }

  async addPayment(invoiceId: string, data: PaymentCreate): Promise<Payment> {
    const response = await fetch(`${this.baseUrl}/${invoiceId}/payments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<Payment>(response);
  }

  async getPayments(invoiceId: string): Promise<Payment[]> {
    const response = await fetch(`${this.baseUrl}/${invoiceId}/payments`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Payment[]>(response);
  }
}

export const invoicesApi = new InvoicesApi();
