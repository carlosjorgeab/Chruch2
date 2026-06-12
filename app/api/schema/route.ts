import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'supabase-schema.sql');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Schema file not found' }, { status: 404 });
    }
    const schemaContent = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ schema: schemaContent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
