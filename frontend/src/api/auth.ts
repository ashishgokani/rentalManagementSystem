const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ApiError {
  detail: string;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponse;
}

// Request interfaces
export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  companyName?: string;
  businessCategory?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  companyName?: string;
  businessCategory?: string;
  gstin?: string;
  isActive: boolean;
  referralCode?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  profilePhoto?: string;
  phoneNumber?: string;
  isCalendarConnected?: boolean;
}

export interface OTPResponse {
  message: string;
  expires_in_minutes: number;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ReferralValidationResponse {
  valid: boolean;
  message: string;
}

class AuthApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/auth`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'An error occurred');
    }
    return response.json();
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    companyName?: string;
    businessCategory?: string;
    gstin?: string;
    role?: 'CUSTOMER' | 'VENDOR';
    referralCode?: string;
  }): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<TokenResponse>(response);
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse<TokenResponse>(response);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken }),
    });
    return this.handleResponse<TokenResponse>(response);
  }

  async forgotPassword(email: string): Promise<OTPResponse> {
    const response = await fetch(`${this.baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse<OTPResponse>(response);
  }

  async verifyOtp(email: string, otp: string): Promise<MessageResponse> {
    const response = await fetch(`${this.baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return this.handleResponse<MessageResponse>(response);
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<MessageResponse> {
    const response = await fetch(`${this.baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });
    return this.handleResponse<MessageResponse>(response);
  }

  async getCurrentUser(accessToken: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return this.handleResponse<UserResponse>(response);
  }

  getGoogleAuthUrl(): string {
    return `${this.baseUrl}/google`;
  }

  async validateReferralCode(code: string): Promise<ReferralValidationResponse> {
    const response = await fetch(`${this.baseUrl}/validate-referral/${code}`);
    return this.handleResponse<ReferralValidationResponse>(response);
  }

  async updateProfile(data: UserUpdateData): Promise<UserResponse> {
    // Get token from storage - handled manually here since we don't have interceptors
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${this.baseUrl}/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<UserResponse>(response);
  }


}

export const authApi = new AuthApi();
