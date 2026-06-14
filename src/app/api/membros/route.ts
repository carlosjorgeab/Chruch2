import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jiinngmxhezdwkxyxkyd.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Z6bmOgV6Hmacwm7i6YKaUQ_-XAvnimn';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/membros`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Supabase returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}
