
'use client';

import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { simulateWear } from '@/ai/flows/simulate-wear';
import type { SimulateWearOutput } from '@/lib/ai-types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Equipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  workoutType: z.string().min(1, 'Workout type is required'),
  distance: z.coerce.number().min(0.1, 'Distance must be positive'),
  duration: z.coerce.number().min(1, 'Duration must be positive'),
  intensity: z.enum(['low', 'medium', 'high']),
  environmentalConditions: z.string().min(1, 'Conditions are required'),
});

type FormValues = z.infer<typeof formSchema>;

interface WearSimulationProps {
  equipment: Equipment;
}

export function WearSimulation({ equipment }: WearSimulationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulateWearOutput | null>(null);
  const { toast } = useToast();

  const isBike = equipment.type !== 'Running Shoes' && equipment.type !== 'Other';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workoutType: isBike ? 'cycling' : 'running',
      distance: 10,
      duration: 60,
      intensity: 'medium',
      environmentalConditions: 'Dry, Paved Roads',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResult(null);
    try {
      const output = await simulateWear({
        equipmentType: equipment.type,
        ...values,
      });
      setResult(output);
    } catch (error) {
      console.error('Error simulating wear:', error);
      toast({
        title: 'Simulation Failed',
        description: 'Could not generate wear simulation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>AI Wear Simulation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distance (km)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 90" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="intensity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intensity</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select intensity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="environmentalConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conditions</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rainy, muddy trails"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Simulate Wear
            </Button>
            {result && (
              <div className="text-right">
                <p className="font-bold text-lg">
                  Estimated Wear: {result.wearPercentage.toFixed(2)}%
                </p>
                <p className="text-sm text-muted-foreground">Simulation successful.</p>
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
