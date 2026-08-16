import { NextResponse } from 'next/server';

// Garante que a rota não seja cacheada estaticamente durante o build
export const dynamic = 'force-dynamic';

export async function GET() {
  // Opcional: Adicione verificações rápidas (ex: ping simples no banco)
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }, 
    { status: 200 }
  );
}