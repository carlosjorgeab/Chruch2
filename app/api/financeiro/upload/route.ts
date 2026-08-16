import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';

export const maxDuration = 60; // Allow enough duration for larger file uploads

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Convert file to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique file path to avoid collisions
    const fileExt = file.name.split('.').pop() || 'bin';
    const uniqueName = `${crypto.randomUUID()}.${fileExt}`;

    // Ensure bucket exists (or try to create it, ignoring permissions errors)
    try {
      await supabase.storage.createBucket('files', { public: true });
    } catch (bucketErr) {
      console.warn('Tentativa de criar bucket "files" retornou erro (provavelmente restrição de RLS, o que é normal):', bucketErr);
    }

    // Start uploading to Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('files')
      .upload(uniqueName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Erro de upload ao Supabase Storage:', uploadErr);
      
      // If bucket doesn't exist, provide a highly descriptive instruction
      if (uploadErr.message?.toLowerCase().includes('bucket not found') || (uploadErr as any).status === 404) {
        return NextResponse.json({
          error: `O bucket 'files' não foi encontrado no seu Supabase.

Como resolver em 2 passos rápidos:
1. Acesse o seu painel do Supabase (https://supabase.com).
2. Vá em 'Storage' -> clique em 'New bucket' -> dê o nome de 'files' -> marque como 'Public' e salve.

Depois disso, o seu upload de arquivos funcionará instantaneamente!`
        }, { status: 404 });
      }

      return NextResponse.json({ 
        error: `Erro ao transferir arquivo para o Supabase Storage: ${uploadErr.message}` 
      }, { status: 500 });
    }

    // Generate public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(uniqueName);

    return NextResponse.json({
      success: true,
      name: file.name,
      url: publicUrl
    });

  } catch (err: any) {
    console.error('Erro no upload para o Supabase Storage:', err);
    return NextResponse.json({ 
      error: `Erro ao transferir arquivo para o Supabase Storage: ${err.message || 'Erro inesperado.'}` 
    }, { status: 500 });
  }
}
