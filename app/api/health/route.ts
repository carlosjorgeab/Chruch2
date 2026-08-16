import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client'; // Ajuste para o caminho do seu cliente Supabase

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. AbortController para interromper a requisição se demorar mais de 2 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    // 2. Requisição ultra leve: 'head: true' não baixa linhas do banco
    const { error } = await supabase
      .from('perfis') // Substitua por qualquer tabela leve existente no seu banco
      .select('id', { head: true })
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      return NextResponse.json(
        { status: 'error', database: 'disconnected', details: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: 'ok', database: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: isTimeout ? 'timeout (2s reached)' : 'unreachable',
      },
      { status: 503 }
    );
  }
}