import { NextResponse, after } from 'next/server';
import { getServiceSupabase, processStravaEvent, stravaWebhookVerifyToken } from '@/lib/strava-sync';

// Strava push subscription endpoint (https://developers.strava.com/docs/webhooks/).
// GET: Strava confirms the subscription. POST: an athlete event. Events aren't
// signed by Strava, so we only use their ids to re-fetch data from Strava with
// the rider's own token; a fake event can't inject distances.

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && challenge && token && token === (await stravaWebhookVerifyToken())) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }
  return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ok = body && typeof body.object_id === 'number' && typeof body.owner_id === 'number'
    && ['activity', 'athlete'].includes(body.object_type) && ['create', 'update', 'delete'].includes(body.aspect_type);
  if (!ok) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('strava_webhook_events')
    .upsert({
      object_type: body.object_type,
      aspect_type: body.aspect_type,
      object_id: body.object_id,
      owner_id: body.owner_id,
      event_time: typeof body.event_time === 'number' ? body.event_time : null,
      updates: body.updates ?? null,
    }, { onConflict: 'object_type,object_id,aspect_type,event_time', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[strava webhook] could not store event', error);
    // A non-200 makes Strava retry, which is what we want here.
    return NextResponse.json({ error: 'Could not store event' }, { status: 500 });
  }

  // Reply within Strava's 2-second limit; do the work afterwards. If this
  // doesn't finish, the rider's next app visit catches up (processPendingStravaEvents).
  if (data?.id) after(() => processStravaEvent(supabase, data.id));
  return NextResponse.json({ received: true });
}
