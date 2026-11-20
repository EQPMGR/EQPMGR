'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getIncompleteBikesAction } from './actions';

type Data = Awaited<ReturnType<typeof getIncompleteBikesAction>>;

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '–');

export default function IncompleteBikesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setData(await getIncompleteBikesAction(await user.getIdToken()));
      } catch (e: any) {
        setError(e.message || 'Could not load incomplete bikes.');
      }
    })();
  }, [user]);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-6 text-destructive">{error}</div>;
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Incomplete bikes</h1>
        <p className="text-muted-foreground">
          Riders see a &ldquo;Your bike seems incomplete&rdquo; notice on these bikes&apos; pages, with a button to add the missing
          catalog parts. Fixing a thin catalog entry is how we reach them: once the catalog build has the parts, the
          notice offers them to every rider whose bike is linked to it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Garage bikes ({data.incompleteBikes.length})</CardTitle>
          <CardDescription>
            Missing parts their catalog model has, or fewer than {data.thresholds.fewParts} parts in all. Newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.incompleteBikes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incomplete bikes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {['Rider', 'Bike', 'Catalog model', 'Parts', 'Missing from catalog build', 'Added'].map((h) => (
                      <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.incompleteBikes.map((b) => (
                    <tr key={b.equipmentId} className="border-b align-top last:border-0">
                      <td className="py-2 pr-4">
                        {b.rider?.name || '–'}
                        {b.rider?.email && <span className="block text-muted-foreground">{b.rider.email}</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {b.bikeName}
                        <span className="block text-muted-foreground">{b.type}</span>
                      </td>
                      <td className="py-2 pr-4">{b.catalogModel ?? <span className="text-muted-foreground">Not linked</span>}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {b.partCount}{b.catalogPartCount !== null && ` of ${b.catalogPartCount}`}
                      </td>
                      <td className="py-2 pr-4">
                        {b.missing.length > 0 ? b.missing.join(', ') : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{day(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thin catalog entries ({data.thinCatalog.length})</CardTitle>
          <CardDescription>
            Catalog bikes with fewer than {data.thresholds.thinCatalog} parts. Most full builds have 23–34. Riders who
            build from these get an incomplete bike.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.thinCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No thin catalog entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {['Catalog bike', 'Parts', 'Garage bikes linked', 'Added by', 'Added'].map((h) => (
                      <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.thinCatalog.map((m) => (
                    <tr key={m.bikeModelId} className="border-b last:border-0">
                      <td className="py-2 pr-4">{m.name}</td>
                      <td className="py-2 pr-4 tabular-nums">{m.partCount}</td>
                      <td className="py-2 pr-4 tabular-nums">{m.garageBikes}</td>
                      <td className="py-2 pr-4">{m.createdBy?.name || m.createdBy?.email || '–'}</td>
                      <td className="py-2 pr-4 tabular-nums">{day(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
