import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.SERVER_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, 'GET', path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, 'POST', path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, 'PUT', path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, 'DELETE', path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, 'PATCH', path);
}

async function proxyRequest(request: NextRequest, method: string, pathParams: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  // Construct backend URL
  // Frontend calls /api/[...path]
  // Backend expects /api/[...path] match
  const path = pathParams.join('/');
  const url = `${BACKEND_URL}/api/${path}`;
  const searchParams = request.nextUrl.search;
  
  const headers: Record<string, string> = {};
  
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
     headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const body = ['GET', 'HEAD', 'DELETE'].includes(method) ? undefined : await request.text();

    const response = await fetch(`${url}${searchParams}`, {
      method,
      headers,
      body: body || undefined,
    });

    // Handle 204 No Content or empty
    const responseText = await response.text();
    
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
