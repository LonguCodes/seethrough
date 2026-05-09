import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  const pathString = path?.join('/') || '';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';


  const targetUrl = `${apiUrl}/${pathString}${request.nextUrl.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Increase timeout or add other headers if needed
    });

    if (!response.ok) {
      console.log(await response.json())
      return NextResponse.json(
        { error: 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  const pathString = path?.join('/') || '';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const targetUrl = `${apiUrl}/${pathString}${request.nextUrl.search}`;

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy POST error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  const pathString = path?.join('/') || '';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const targetUrl = `${apiUrl}/${pathString}${request.nextUrl.search}`;

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] | undefined }> }
) {
  const { path } = await params;
  const pathString = path?.join('/') || '';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const targetUrl = `${apiUrl}/${pathString}${request.nextUrl.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}
