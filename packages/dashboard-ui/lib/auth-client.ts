export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

const API_URL = ''; // Relative path for proxy

export const authClient = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/api/dashboard/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await res.json();
    this.setToken(data.data.accessToken);
    return data.data; // Wrapper { status: 'success', data: { ... } }
  },

  async signup(data: { email: string; password: string; name: string; organizationName: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/api/dashboard/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Signup failed');
    }

    const responseData = await res.json();
    this.setToken(responseData.data.accessToken);
    return responseData.data;
  },

  async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_URL}/api/dashboard/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to fetch profile');
    const data = await res.json();
    return data.data;
  },

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
  },
};
