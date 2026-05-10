import { NextRequest, NextResponse } from 'next/server';
import ky from 'ky';

async function handleRequest(request: NextRequest, path: string[] | undefined) {
  const pathString = path?.join('/') || '';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const targetUrl = `${apiUrl}/${pathString}${request.nextUrl.search}`;

  try {
    const options: any = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      throwHttpErrors: false,
    };

    if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
      options.json = await request.json();
    }

    const response = await ky(targetUrl, options);

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
      } catch (e) {
        console.error('Backend error (could not parse JSON)');
      }

      return NextResponse.json(
        { error: 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy ${request.method} error:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  return handleRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  return handleRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  return handleRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  return handleRequest(request, path);
}
