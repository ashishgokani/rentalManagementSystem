const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class CalendarApi {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/calendar`;
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

    async getConnectUrl(): Promise<{ url: string }> {
        const response = await fetch(`${this.baseUrl}/connect`, {
            headers: this.getHeaders()
        });
        return this.handleResponse<{ url: string }>(response);
    }

    async callback(code: string): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/callback`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ code })
        });
        return this.handleResponse<{ message: string }>(response);
    }

    async syncOrder(orderId: string): Promise<{ message: string; link?: string; links?: string[] }> {
        const response = await fetch(`${this.baseUrl}/sync-order`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ orderId: orderId })
        });
        return this.handleResponse<{ message: string; link?: string; links?: string[] }>(response);
    }
}

export const calendarApi = new CalendarApi();
