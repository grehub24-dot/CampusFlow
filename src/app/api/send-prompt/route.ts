
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, provider } = await request.json();

    if (!id || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // MOCK: Simulate sending a prompt to the user's phone.
    // In a real app, you'd call the payment provider's API here.
    console.log(`Simulating sending payment prompt for invoice ${id} via ${provider}.`);

    // We don't need to do anything else for the mock,
    // the status will be updated by the timeout in the create-invoice route.

    return NextResponse.json({ success: true, message: 'Prompt simulation initiated.' }, { status: 200 });

  } catch (error) {
    console.error('Error sending prompt:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
