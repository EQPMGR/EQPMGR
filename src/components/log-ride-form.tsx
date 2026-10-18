'use client';

import { useState } from 'react';
import { Bike, Loader2, LocateFixed } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { logManualRideAction } from '@/app/(app)/equipment/[id]/ride-actions';
import type { Equipment } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  startedAt: z.string().min(1, 'When did the ride start?'),
  distanceKm: z.coerce.number().positive('Distance must be positive').max(1000),
  durationMinutes: z.coerce.number().int().positive('Duration must be positive').max(48 * 60),
  elevationGainM: z.union([z.literal(''), z.coerce.number().min(0).max(10000)]).optional(),
  terrain: z.enum(['auto', 'road', 'offroad']),
  conditions: z.enum(['auto', 'wet', 'dry']),
});

type FormValues = z.infer<typeof formSchema>;

/** Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function LogRideForm({ equipment, onSuccess }: { equipment: Equipment; onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { startedAt: localNow(), distanceKm: 20, durationMinutes: 60, elevationGainM: '', terrain: 'auto', conditions: 'auto' },
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Location not available', description: 'Set the conditions by hand instead.' });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast({ variant: 'destructive', title: 'Location blocked', description: 'Set the conditions by hand instead.' });
      },
      { timeout: 10000 }
    );
  };

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setIsSaving(true);
    try {
      const result = await logManualRideAction(await user.getIdToken(), {
        equipmentId: equipment.id,
        startedAt: new Date(values.startedAt).toISOString(),
        distanceKm: values.distanceKm,
        durationMinutes: values.durationMinutes,
        elevationGainM: values.elevationGainM === '' || values.elevationGainM == null ? null : Number(values.elevationGainM),
        terrain: values.terrain,
        conditions: values.conditions,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      });
      if (!result.success) throw new Error(result.message);
      toast({ title: 'Ride logged', description: result.message });
      form.reset({ ...values, startedAt: localNow() });
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not log ride', description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bike className="h-5 w-5" /> Log a ride</CardTitle>
            <CardDescription>
              For rides that aren't on Strava. Wear is added to each part from the distance or riding hours,
              with extra wear for wet rides, climbing, and your weight (from your profile).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField control={form.control} name="startedAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Started</FormLabel>
                  <FormControl><Input type="datetime-local" max={localNow()} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="distanceKm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Distance (km)</FormLabel>
                  <FormControl><Input type="number" step="0.1" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Riding time (minutes)</FormLabel>
                  <FormControl><Input type="number" step="1" min="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="elevationGainM" render={({ field }) => (
                <FormItem>
                  <FormLabel>Climbing (m)</FormLabel>
                  <FormControl><Input type="number" step="1" min="0" placeholder="Optional" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="terrain" render={({ field }) => (
                <FormItem>
                  <FormLabel>Terrain</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Based on this bike ({equipment.type})</SelectItem>
                      <SelectItem value="road">Road / pavement</SelectItem>
                      <SelectItem value="offroad">Gravel / trail</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="conditions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conditions</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Look up the weather</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="wet">Wet or muddy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Weather lookup needs your location and works for rides in the last 7 days.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={isLocating}>
                {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                {location ? 'Update location' : 'Use my location for weather'}
              </Button>
              <span className="text-muted-foreground">
                {location ? `Location set (${location.lat}, ${location.lng})` : 'No location: weather will be "unknown" unless you pick the conditions.'}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log ride
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
