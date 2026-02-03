import { cookies } from 'next/headers';

const API_BASE_URL =
  process.env.SERVER_API_URL ||
  "http://localhost:3001";

export async function fetchServer<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store', // Default to no-store for dynamic data
  });

  if (!res.ok) {
     const error = await res.json().catch(() => ({}));
     throw new Error(error.message || `API Error: ${res.statusText}`);
  }

  const json = await res.json();
  return (json.data || json) as T;
}
