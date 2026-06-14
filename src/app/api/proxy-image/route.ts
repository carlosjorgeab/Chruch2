import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch original image: ${res.status}`);
    }

    // Determine content type
    let contentType = res.headers.get('content-type') || 'image/jpeg';
    
    // Read response body as buffer/arrayBuffer
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Image proxy fetched failure error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
