'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFieldDataAction } from './actions';

type FieldData = Awaited<ReturnType<typeof getFieldDataAction>>;

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number | null)[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground">{head.map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">{r.map((c, j) => <td key={j} className="py-2 pr-4 tabular-nums">{c ?? '–'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const km = (v: unknown) => (typeof v === 'number' ? `${Math.round(v).toLocaleString()} km` : null);

export default function FieldDataPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FieldData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setData(await getFieldDataAction(await user.getIdToken()));
      } catch (e: any) {
        setError(e.message || 'Could not load field data.');
      }
    })();
  }, [user]);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-6 text-destructive">{error}</div>;
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-6 text-muted-foreground">Loading…</div>;

  const t = data.totals;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Field data</h1>
        <p className="text-muted-foreground">
          What the wear model has learned from real rides, measurements and replacements. Lifespans start at the
          researched baselines and shift toward real data as worn-out replacements are logged (each baseline counts as 8 observations).
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Rides" value={t.rides} />
        <Stat label="Wet rides" value={t.wetRides} />
        <Stat label="Weather unknown" value={t.unknownWeather} />
        <Stat label="Stretch measurements" value={t.measurements} />
        <Stat label="…by shops" value={t.shopMeasurements} />
        <Stat label="Worn-out replacements" value={t.wornOutReplacements} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learned lifespans</CardTitle>
          <CardDescription>Catalog parts with at least one related replacement. Road-equivalent km, adjusted for weather, hills, rider weight and e-bikes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            head={['Part', 'Type', 'Estimate', 'Baseline', 'Model / series / brand / type obs.', 'Confidence', 'Based on']}
            rows={data.learned.map((r: any) => [
              [r.brand, r.series, r.model].filter(Boolean).join(' ') || r.name, r.baseline_key, km(r.lifespan_km), km(r.baseline_km),
              `${r.n_model} / ${r.n_series} / ${r.n_brand} / ${r.n_type}`, r.confidence, r.basis_level,
            ])}
            empty="No worn-out replacements logged yet; every part uses its baseline."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chain care vs drivetrain life</CardTitle>
          <CardDescription>Worn-out cassettes, chainrings and jockey wheels, grouped by how stretched the chains got while they were installed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            head={['Part', 'Chain care', 'Parts', 'Avg adjusted life', 'Avg chains per part']}
            rows={data.stretch.map((r: any) => [r.part_type, r.chain_care, r.parts, km(r.avg_adjusted_km), r.avg_chains_per_part])}
            empty="Not enough data yet. Fills in as chains are replaced with measured stretch and drivetrain parts wear out."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model vs measured chain wear</CardTitle>
          <CardDescription>If measured wear runs consistently above or below the prediction, the chain lifespan or multipliers need tuning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            head={['Month', 'Measured by', 'Measurements', 'Avg measured wear', 'Avg predicted wear']}
            rows={data.calibration.map((r: any) => [String(r.month).slice(0, 7), r.measured_by_role, r.measurements, `${r.avg_measured_wear_pct}%`, r.avg_predicted_wear_pct != null ? `${r.avg_predicted_wear_pct}%` : null])}
            empty="No chain stretch measurements yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baselines</CardTitle>
          <CardDescription>The researched starting points (wear_baselines).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            head={['Part type', 'Tracked by', 'Road', 'Off-road', 'Service hours', 'Confidence']}
            rows={data.baselines.map((b: any) => [b.label, b.basis, km(b.road_km), km(b.offroad_km), b.service_hours, b.confidence])}
            empty="No baselines."
          />
        </CardContent>
      </Card>
    </div>
  );
}
