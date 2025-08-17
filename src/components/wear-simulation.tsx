
'use client';

import { useState, useMemo } from 'react';
import { Bot, Loader2, LocateFixed } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  workoutType: z.string().min(1, 'Workout type is required'),
  distance: z.coerce.number().min(0.1, 'Distance must be positive'),
  duration: z.coerce.number().min(1, 'Duration must be positive'),
  intensity: z.enum(['low', 'medium', 'high']),
  environmentalConditions: z.string().min(1, 'Weather conditions are required. Please fetch them using your location.'),
  wheelsetId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WearSimulationProps {
  equipment: Equipment;
}

export function WearSimulation({ equipment }: WearSimulationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [result, setResult] = useState<SimulateWearOutput | null>(null);
  const { toast } = useToast();

  const isBike = equipment.type !== 'Running Shoes' && equipment.type !== 'Other';
  const wheelsetOptions = useMemo(() => {
    const sets = [{ id: 'default', name: 'Default Wheelset' }];
    if (equipment.wheelsets) {
      Object.entries(equipment.wheelsets).forEach(([id, name]) => {
        sets.push({ id, name });
      });
    }
    return sets;
  }, [equipment.wheelsets]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workoutType: isBike ? 'cycling' : 'running',
      distance: 10,
      duration: 60,
      intensity: 'medium',
      environmentalConditions: '',
      wheelsetId: 'default',
    },
  });

  const handleFetchWeather = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Geolocation not supported', description: 'Your browser does not support geolocation.' });
      return;
    }
    setIsFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch weather data.");
          }
          const data = await response.json();
          form.setValue('environmentalConditions', data.conditions, { shouldValidate: true });
          toast({ title: "Weather fetched!", description: data.conditions });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Weather Error', description: error.message });
        } finally {
          setIsFetchingWeather(false);
        }
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Location Error', description: error.message });
        setIsFetchingWeather(false);
      }
    );
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResult(null);
    try {
      const componentsToSimulate = values.wheelsetId === 'default'
        ? equipment.components.filter(c => !c.wheelsetId)
        : equipment.components.filter(c => c.wheelsetId === values.wheelsetId);

      const wearAndTearData = JSON.stringify(
        componentsToSimulate.map((c) => ({
          name: c.name,
          wear: `${c.wearPercentage}%`,
        }))
      );

      const output = await simulateWear({
        equipmentType: equipment.type,
        workoutType: values.workoutType,
        distance: values.distance,
        duration: values.duration,
        intensity: values.intensity,
        environmentalConditions: values.environmentalConditions,
        wearAndTearData,
        manufacturerGuidelines: JSON.stringify({}), // Placeholder
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
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-2">
                  <FormLabel>Weather Conditions</FormLabel>
                  <Button type="button" variant="outline" className="w-full" onClick={handleFetchWeather} disabled={isFetchingWeather}>
                      {isFetchingWeather ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                      Get Current Weather
                  </Button>
                </div>
            </div>
             <FormField
                control={form.control}
                name="environmentalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        readOnly
                        placeholder="Click button above to fetch weather..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isBike && wheelsetOptions.length > 1 && (
                <FormField
                  control={form.control}
                  name="wheelsetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wheelset Used</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the wheelset used for this activity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wheelsetOptions.map(ws => (
                            <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {result && (
                <Alert>
                  <AlertTitle className="font-semibold">Simulation Result</AlertTitle>
                  <AlertDescription>
                     <p>Estimated Total Wear: <span className="font-bold">{result.wearPercentage.toFixed(2)}%</span></p>
                      <div className="mt-2">
                          <h5 className="font-medium">Recommendations:</h5>
                          <ul className="list-disc pl-5 text-xs">
                              {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                          </ul>
                      </div>
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Simulate Wear
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
