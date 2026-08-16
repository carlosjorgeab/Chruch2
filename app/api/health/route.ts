import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: 'error', details: 'Configuração do Supabase ausente' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const { error } = await supabase
      .from('perfis') // Tabela existente no seu banco
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