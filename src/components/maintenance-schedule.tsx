
'use client';

import { useState } from 'react';
import { Bot, Loader2, Wrench } from 'lucide-react';
// generateMaintenanceSchedule is executed server-side via API to avoid bundling server-only code in the client.
import type { GenerateMaintenanceScheduleOutput } from '@/lib/ai-types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Equipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from './ui/badge';

interface MaintenanceScheduleProps {
  equipment: Equipment;
}

interface ScheduleItem {
  component: string;
  action: string;
  reason: string;
  urgency: 'High' | 'Medium' | 'Low';
}

export function MaintenanceSchedule({ equipment }: MaintenanceScheduleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateMaintenanceScheduleOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const wearAndTearData = JSON.stringify(
        equipment.components.map((c) => ({
          name: c.name,
          wear: `${c.wearPercentage}%`,
        }))
      );
      // In a real app, this would be fetched from a database
      const manufacturerGuidelines = JSON.stringify({
        chain: 'Replace every 2000-3000km',
        tires: 'Inspect weekly, replace when worn',
        brake_pads: 'Replace when wear indicator is reached',
        suspension: 'Service every 50 hours of riding',
      });

      // Call server API with ID token for authentication
      let token: string | null = null;
      if (user) {
        token = await user.getIdToken(true);
      }

      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch('/api/admin/generate-maintenance-schedule', {
        method: 'POST',
        headers,
        body: JSON.stringify({ equipmentType: equipment.type, wearAndTearData, manufacturerGuidelines }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Schedule generation failed');
      }

      const { result: output } = await resp.json();
      setResult(output);
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast({
        title: 'Schedule Generation Failed',
        description: 'Could not generate maintenance schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parsedSchedule: ScheduleItem[] = result
    ? JSON.parse(result.maintenanceSchedule)
    : [];
    
  const getUrgencyBadgeVariant = (urgency: ScheduleItem['urgency']): 'destructive' | 'secondary' | 'outline' => {
      switch (urgency) {
        case 'High':
            return 'destructive';
        case 'Medium':
            return 'secondary';
        default:
            return 'outline';
      }
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>AI Maintenance Schedule</CardTitle>
            <Button onClick={handleGenerateSchedule} disabled={isLoading} size="sm" className="gap-1 w-full sm:w-auto">
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Bot className="mr-2 h-4 w-4" />
                )}
                Generate Schedule
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-4">
            {parsedSchedule.map((item, index) => (
              <div key={index} className="flex items-start gap-4 p-3 rounded-lg border">
                <div className="flex-shrink-0 pt-1">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{item.component}: <span className="font-normal">{item.action}</span></h4>
                    <Badge variant={getUrgencyBadgeVariant(item.urgency)}>{item.urgency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            
          </div>
        )}
      </CardContent>
    </Card>
  );
}
