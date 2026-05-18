const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  reference_type?: string;
  reference_id?: string;
  description?: string;
  payment_method?: string;
  external_reference?: string;
  createdAt: string;
}

export interface WalletSummary {
  wallet: Wallet;
  recent_transactions: WalletTransaction[];
  total_credited: number;
  total_debited: number;
}

export interface AddFundsRequest {
  amount: number;
  payment_method: string;
  external_reference?: string;
}

export interface WithdrawFundsRequest {
  amount: number;
  description?: string;
}

class WalletApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/wallet`;
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

  async getWallet(): Promise<Wallet> {
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders()
    });
    return this.handleResponse<Wallet>(response);
  }

  async getWalletSummary(): Promise<WalletSummary> {
    const response = await fetch(`${this.baseUrl}/summary`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<WalletSummary>(response);
  }

  async getTransactions(params?: {
    skip?: number;
    limit?: number;
    transaction_type?: 'CREDIT' | 'DEBIT';
  }): Promise<WalletTransaction[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', String(params.skip));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.transaction_type) searchParams.append('transaction_type', params.transaction_type);

    const url = `${this.baseUrl}/transactions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<WalletTransaction[]>(response);
  }

  async getTransaction(id: string): Promise<WalletTransaction> {
    const response = await fetch(`${this.baseUrl}/transactions/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<WalletTransaction>(response);
  }

  async addFunds(data: AddFundsRequest): Promise<WalletTransaction> {
    const response = await fetch(`${this.baseUrl}/add-funds`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<WalletTransaction>(response);
  }

  async withdrawFunds(data: WithdrawFundsRequest): Promise<WalletTransaction> {
    const response = await fetch(`${this.baseUrl}/withdraw`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<WalletTransaction>(response);
  }
}

export const walletApi = new WalletApi();
