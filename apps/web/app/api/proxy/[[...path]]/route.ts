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
