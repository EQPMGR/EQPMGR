'use client';

import Link from 'next/link';
import { ArrowLeft, BarChart3, ClipboardList, LayoutList, MessageSquareWarning, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { analyzeImportFeedback } from '@/lib/import-feedback-analytics';

function StatCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MiniList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Top recurring patterns from saved feedback.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <span className="text-sm font-medium">{item.label}</span>
              <Badge variant="secondary">{item.count}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Loaded in the browser through the admin-only API route. Rendering this on the
// server exposed the data to anyone, because the admin gate runs client-side.
export default function ImportFeedbackAnalyzerPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReturnType<typeof analyzeImportFeedback> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await fetch('/api/admin/import-feedback-analysis', {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Could not load feedback.');
      else setSummary(data.summary);
    })();
  }, [user]);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-6 text-destructive">{error}</div>;
  if (!summary) return <div className="mx-auto max-w-6xl px-4 py-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="inline-flex items-center gap-2 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Import Feedback Analyzer</h1>
          <p className="text-muted-foreground">
            Compare parsed bike text against the final edited form and spot the most common failure modes.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          {summary.totalFeedback} records analyzed
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Brand corrections"
          value={summary.brandCorrections}
          description="How often the brand changed between parsed output and final form."
          icon={Sparkles}
        />
        <StatCard
          title="Model corrections"
          value={summary.modelCorrections}
          description="How often the bike model name needed manual correction."
          icon={ClipboardList}
        />
        <StatCard
          title="Year corrections"
          value={summary.yearCorrections}
          description="How often the model year changed during editing."
          icon={LayoutList}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniList title="Top added components" items={summary.topAddedComponents} />
        <MiniList title="Top removed components" items={summary.topRemovedComponents} />
        <MiniList title="Top component field changes" items={summary.topComponentFieldChanges} />
        <MiniList title="Top component renames" items={summary.topComponentRenames} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this gives you</CardTitle>
          <CardDescription>Use these patterns to tune the parser prompt, mapping rules, or extraction heuristics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-4">
            <MessageSquareWarning className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Identify recurring mistakes</p>
            <p className="text-sm text-muted-foreground">See which bike brands, models, and components need the most cleanup.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <Sparkles className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Tune parser behavior</p>
            <p className="text-sm text-muted-foreground">Use the observed diffs to improve the import prompt or rules.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <BarChart3 className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Track improvements over time</p>
            <p className="text-sm text-muted-foreground">Re-run the analyzer after parser changes and compare the counts.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}