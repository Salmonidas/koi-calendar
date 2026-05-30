import { NextResponse } from 'next/server';
import { teamAdapter } from '@/db/adapters/teamAdapter';

export async function GET() {
  try {
    const teams = await teamAdapter.findAll();
    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
