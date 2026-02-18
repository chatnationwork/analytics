import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.SERVER_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, "GET", path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, "POST", path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, "PUT", path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, "DELETE", path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, "PATCH", path);
}

async function proxyRequest(
  request: NextRequest,
  method: string,
  pathParams: string[],
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  // Debug logging for production auth issues
  console.log("[Proxy] Request:", method, pathParams.join("/"));
  console.log("[Proxy] Cookie token exists:", !!token);
  console.log("[Proxy] SERVER_API_URL:", BACKEND_URL);

  // Construct backend URL
  // Frontend calls /api/[...path]
  // Backend expects /api/[...path] match
  const path = pathParams.join("/");
  const url = `${BACKEND_URL}/api/${path}`;
  const searchParams = request.nextUrl.search;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type") ?? "";

  if (["POST", "PUT", "PATCH"].includes(method)) {
    if (contentType.toLowerCase().includes("multipart/form-data")) {
      headers["Content-Type"] = contentType;
    } else {
      headers["Content-Type"] = "application/json";
    }
  }

  const incomingAuthHeader = request.headers.get("authorization");

  if (incomingAuthHeader) {
    // Prefer the header provided by the client (e.g. for Admin API calls)
    headers["Authorization"] = incomingAuthHeader;
  } else if (token) {
    // Fallback to cookie-based auth
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Forward x-* headers (e.g. x-tenant-id) from client to backend
  request.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-")) {
      headers[key] = value;
    }
  });

  try {
    let body: string | ArrayBuffer | undefined;
    if (["GET", "HEAD", "DELETE"].includes(method)) {
      body = undefined;
    } else if (contentType.toLowerCase().includes("multipart/form-data")) {
      body = await request.arrayBuffer();
    } else {
      body = await request.text();
      
      // If body is empty string, remove Content-Type JSON header to avoid 400 Bad Request
      // (Fastify throws "Body cannot be empty" if Content-Type is application/json but body is empty)
      if (!body) {
        delete headers["Content-Type"];
        body = undefined;
      }
    }

    const response = await fetch(`${url}${searchParams}`, {
      method,
      headers,
      body: body || undefined,
    });

    const responseContentType =
      response.headers.get("Content-Type") || "application/json";

    // Binary types must not be read as text (would corrupt images/pdf/etc)
    const isBinary =
      responseContentType.startsWith("image/") ||
      responseContentType.startsWith("video/") ||
      responseContentType.startsWith("audio/") ||
      responseContentType === "application/pdf" ||
      responseContentType === "application/octet-stream";

    if (isBinary) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": responseContentType },
      });
    }

    const responseText = await response.text();
    return new NextResponse(responseText, {
      status: response.status,
      headers: { "Content-Type": responseContentType },
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
