import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(req: Request, { params }: { params: { id: string }}) {
  try {
    const id = params.id;
    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json({ scenario: content });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
