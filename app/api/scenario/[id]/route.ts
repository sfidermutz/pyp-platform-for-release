// app/api/scenario/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

// Ensure this runs in Node runtime so `fs` is available
export const runtime = 'nodejs';

type MaybePromiseParams = { id: string } | Promise<{ id: string }>;

export async function GET(req: NextRequest, context: { params: MaybePromiseParams }) {
  try {
    // params may be a Promise depending on Next.js typing; await it defensively
    const paramsObj = (context.params && typeof (context.params as any).then === 'function')
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string });

    const id = paramsObj?.id;
    if (!id) {
      return NextResponse.json({ error: 'missing id' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json({ scenario: content });
  } catch (e) {
    console.error('scenario GET error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
