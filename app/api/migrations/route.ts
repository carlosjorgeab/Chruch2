import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({ migrations: [] });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => b.localeCompare(a)); // Newest first

    const migrations = files.map(filename => {
      const filePath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract a description from the first line or comments
      const firstLine = content.split('\n')[0] || '';
      const description = firstLine.replace(/^--\s*(Migration:\s*)?/i, '').trim() || 'Sem descrição';

      return {
        filename,
        description,
        content
      };
    });

    return NextResponse.json({ migrations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
