'use client';

import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

export function AccidentInsuranceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accident Insurance</CardTitle>
        <CardDescription>
          Cover yourself, not just your bike. Accident coverage for riders from our partner Acci7.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/insurance/accident"><HeartPulse className="mr-2 h-4 w-4" />Get in touch</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
