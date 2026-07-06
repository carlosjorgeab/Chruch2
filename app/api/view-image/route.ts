import { NextRequest, NextResponse } from 'next/server';
import { File as MegaFile } from 'megajs';

export const maxDuration = 60; // Allow enough duration for proxying file streams

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return new Response('Parâmetro "url" é obrigatório.', { status: 400 });
    }

    // If it's not a MEGA URL, redirect the client to the direct public URL (e.g., Supabase)
    if (!fileUrl.includes('mega.nz')) {
      return NextResponse.redirect(fileUrl);
    }

    // Load file attributes from the shareable URL
    const file = MegaFile.fromURL(fileUrl);
    await file.loadAttributes();

    // Stream the download
    const stream = file.download({});
    
    const chunks: any[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Determine the Content-Type based on file extension
    let contentType = 'application/octet-stream';
    const nameLower = (file.name || '').toLowerCase();
    
    if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (nameLower.endsWith('.png')) {
      contentType = 'image/png';
    } else if (nameLower.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (nameLower.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (nameLower.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (nameLower.endsWith('.pdf')) {
      contentType = 'application/pdf';
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('Erro ao processar imagem do MEGA:', err);
    return new Response(`Erro ao buscar arquivo: ${err.message || err}`, { status: 500 });
  }
}
