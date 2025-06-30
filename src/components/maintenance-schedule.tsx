'use client';

import { useState } from 'react';
import { Bot, Loader2, Wrench } from 'lucide-react';
import { generateMaintenanceSchedule, type GenerateMaintenanceScheduleOutput } from '@/ai/flows/generate-maintenance-schedule';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Equipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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

      const output = await generateMaintenanceSchedule({
        equipmentType: equipment.type,
        wearAndTearData,
        manufacturerGuidelines,
      });
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Maintenance Schedule</CardTitle>
          <CardDescription>
            Generate a smart maintenance plan based on current wear.
          </CardDescription>
        </div>
        <Button onClick={handleGenerateSchedule} disabled={isLoading} size="sm" className="ml-auto gap-1">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          Generate Schedule
        </Button>
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
            <p>Click "Generate Schedule" to get AI-powered maintenance recommendations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
