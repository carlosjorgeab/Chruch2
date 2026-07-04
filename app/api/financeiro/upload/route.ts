import { NextRequest, NextResponse } from 'next/server';
import { Storage } from 'megajs';

export const maxDuration = 60; // Allow enough duration for larger file uploads

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Check credentials inside environment variables
    const email = process.env.MEGA_EMAIL || 'app.chruch.management@gmail.com';
    const password = process.env.MEGA_PASSWORD || 'Cjl@j232608';

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Serviço temporariamente indisponível: As credenciais de armazenamento (MEGA_EMAIL e MEGA_PASSWORD) não foram configuradas pelo administrador no painel de Configurações (.env).' 
      }, { status: 500 });
    }

    // Convert file to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize megajs storage client
    const storage = new Storage({
      email,
      password,
      autologin: true,
      keepalive: false // Close connections on completion
    });

    // Wait for authentication and session initiation
    await storage.ready;

    // Start uploading the buffer content
    const uploadStream = storage.upload({
      name: file.name,
      size: buffer.length
    }, buffer);

    const uploadedNode = await uploadStream.complete;
    
    // Generate a secure shareable link for the uploaded item
    const shareableLink = await uploadedNode.link({ noKey: false });

    // Close storage session to free up resources
    try {
      await storage.close();
    } catch (closeErr) {
      console.warn('Erro ao fechar sessão MEGA:', closeErr);
    }

    return NextResponse.json({
      success: true,
      name: file.name,
      url: shareableLink
    });

  } catch (err: any) {
    console.error('Erro no upload para o MEGA.nz:', err);
    return NextResponse.json({ 
      error: `Erro ao transferir arquivo para o MEGA: ${err.message || 'Erro inesperado durante a autenticação ou upload.'}` 
    }, { status: 500 });
  }
}
