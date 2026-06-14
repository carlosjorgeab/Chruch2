import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jiinngmxhezdwkxyxkyd.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Z6bmOgV6Hmacwm7i6YKaUQ_-XAvnimn';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/igrejas`, {
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
    // Return first church config
    const church = data && data.length > 0 ? data[0] : null;
    return NextResponse.json(church);
  } catch (error: any) {
    console.error('Error fetching church:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch church config' }, { status: 500 });
  }
}
