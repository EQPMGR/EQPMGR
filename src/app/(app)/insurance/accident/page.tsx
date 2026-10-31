'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { accidentLeadSchema, type AccidentLeadValues } from './schema';
import { submitAccidentInsuranceLead } from './actions';

export default function AccidentInsurancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AccidentLeadValues>({
    resolver: zodResolver(accidentLeadSchema),
    defaultValues: { name: '', address: '', phone: '', email: user?.email ?? '', consent: undefined as unknown as true },
  });

  async function onSubmit(values: AccidentLeadValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const result = await submitAccidentInsuranceLead(await user.getIdToken(), values);
      if (result.success) {
        setSent(true);
        toast({ title: 'Sent!', description: result.message });
      } else {
        toast({ variant: 'destructive', title: "Couldn't send", description: result.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline">Accident Insurance</h1>
        <p className="text-muted-foreground mt-2">Coverage for you if you&apos;re hurt riding, from our partner Acci7.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Get in touch</CardTitle>
          <CardDescription>Leave your details and our partner will contact you with options. There&apos;s no obligation.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">Thanks! Your details are on their way. Expect a call or email soon.</p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {([
                  ['name', 'Full name', 'name'],
                  ['address', 'Address', 'street-address'],
                  ['phone', 'Phone number', 'tel'],
                  ['email', 'Email', 'email'],
                ] as const).map(([name, label, autoComplete]) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl><Input autoComplete={autoComplete} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
                <FormField control={form.control} name="consent" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <FormControl><Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true ? true : undefined)} /></FormControl>
                      <FormLabel className="font-normal leading-snug">
                        I agree to EQPMGR sharing these details with its accident insurance partner so they can contact me.
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send my details
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
