'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Info, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Equipment } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAX_FILES = 50;

type FileResult = {
  fileName: string;
  status: 'waiting' | 'uploading' | 'counted' | 'duplicate' | 'error';
  message?: string;
};

/** Gzip in the browser when it can (GPX shrinks ~10x), so long rides fit the upload limit. */
async function packFile(file: File): Promise<{ blob: Blob; encoding: 'gzip' | 'none' }> {
  if (typeof CompressionStream === 'undefined') return { blob: file, encoding: 'none' };
  try {
    const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
    return { blob: await new Response(stream).blob(), encoding: 'gzip' };
  } catch {
    return { blob: file, encoding: 'none' };
  }
}

export function UploadRideFiles({ equipment, onSuccess }: { equipment: Equipment; onSuccess: () => void }) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [terrain, setTerrain] = useState<'auto' | 'road' | 'offroad'>('auto');
  const [conditions, setConditions] = useState<'auto' | 'wet' | 'dry'>('auto');
  const [isUploading, setIsUploading] = useState(false);

  const pickFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []).slice(0, MAX_FILES);
    setFiles(picked);
    setResults(picked.map((f) => ({ fileName: f.name, status: 'waiting' })));
  };

  const setResult = (i: number, r: Partial<FileResult>) =>
    setResults((prev) => prev.map((x, j) => (j === i ? { ...x, ...r } : x)));

  async function upload() {
    if (!user || files.length === 0) return;
    setIsUploading(true);
    let counted = 0;
    // One at a time: simple on the server, and each file gets its own result.
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setResult(i, { status: 'uploading', message: undefined });
      try {
        const { blob, encoding } = await packFile(file);
        const body = new FormData();
        body.set('equipmentId', equipment.id);
        body.set('terrain', terrain);
        body.set('conditions', conditions);
        body.set('encoding', encoding);
        body.set('fileName', file.name);
        body.set('file', blob, file.name);
        const res = await fetch('/api/rides/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          body,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setResult(i, { status: 'error', message: data?.message ?? data?.error ?? `Upload failed (${res.status}).` });
          if (res.status === 429) break;
          continue;
        }
        const r = data.ride;
        const when = new Date(r.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const climb = r.elevationGainM != null ? `, ${r.elevationGainM} m climbing` : '';
        setResult(i, {
          status: data.duplicate ? 'duplicate' : 'counted',
          message: data.duplicate
            ? `${when}: ${data.message}`
            : `${when}, ${r.distanceKm} km, ${r.movingMinutes} min riding${climb}. ${data.weather ?? ''}`,
        });
        if (!data.duplicate) counted++;
      } catch {
        setResult(i, { status: 'error', message: 'Upload failed. Check your connection and try again.' });
      }
    }
    setIsUploading(false);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = '';
    if (counted > 0) onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> Upload ride files</CardTitle>
        <CardDescription>
          Ride on a Garmin, Wahoo, Hammerhead, Coros or a phone app? Export the ride as a .FIT, .GPX or .TCX file
          and upload it here. Distance, riding time and climbing come from the file. Rides already counted from
          Strava are skipped automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ride-files">Ride files (up to {MAX_FILES} at a time)</Label>
          <input
            id="ride-files"
            ref={inputRef}
            type="file"
            multiple
            accept=".fit,.gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml,application/octet-stream"
            disabled={isUploading}
            onChange={(e) => pickFiles(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Terrain</Label>
            <Select value={terrain} onValueChange={(v) => setTerrain(v as typeof terrain)} disabled={isUploading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">From the file, else this bike ({equipment.type})</SelectItem>
                <SelectItem value="road">Road / pavement</SelectItem>
                <SelectItem value="offroad">Gravel / trail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conditions</Label>
            <Select value={conditions} onValueChange={(v) => setConditions(v as typeof conditions)} disabled={isUploading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Look up the weather</SelectItem>
                <SelectItem value="dry">Dry</SelectItem>
                <SelectItem value="wet">Wet or muddy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Weather can only be looked up for rides in the last 7 days. For older rides, pick Dry or Wet if you remember.
        </p>
        {results.length > 0 && (
          <ul className="space-y-2 text-sm">
            {results.map((r, i) => (
              <li key={`${r.fileName}-${i}`} className="flex gap-2">
                {r.status === 'uploading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                {r.status === 'waiting' && <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                {r.status === 'counted' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                {r.status === 'duplicate' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                {r.status === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <span>
                  <span className="font-medium break-all">{r.fileName}</span>
                  {r.message && <span className={r.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}> {r.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={upload} disabled={isUploading || files.length === 0}>
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {files.length > 1 ? `Upload ${files.length} rides` : 'Upload ride'}
        </Button>
      </CardFooter>
    </Card>
  );
}
