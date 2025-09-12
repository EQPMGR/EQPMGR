
import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Basic validation to ensure we're not sending an empty config.
  if (!config.apiKey || !config.projectId) {
    console.error('Server-side Firebase config is missing. Check apphosting.yaml environment variables.');
    return NextResponse.json(
        { error: 'Server configuration error.' }, 
        { status: 500 }
    );
  }

  return NextResponse.json(config);
}
