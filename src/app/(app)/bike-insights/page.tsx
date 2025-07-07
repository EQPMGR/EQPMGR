'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Bot, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { bikeDatabase } from '@/lib/bike-database';
import { getBikeModelDetails, type BikeModelDetailsOutput } from '@/ai/flows/get-bike-model-details';

const formSchema = z.object({
  brand: z.string().min(1, { message: 'Please select a brand.' }),
  modelIdentifier: z.string().min(1, { message: 'Please select a model.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function BikeInsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BikeModelDetailsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brand: '',
      modelIdentifier: '',
    },
  });
  
  const selectedBrand = form.watch('brand');

  const bikeBrands = useMemo(() => {
    return [...new Set(bikeDatabase.map((bike) => bike.brand))].sort();
  }, []);
  
  const availableModels = useMemo(() => {
      if (!selectedBrand) return [];
      return bikeDatabase.filter(bike => bike.brand === selectedBrand);
  }, [selectedBrand]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResult(null);

    const [model, modelYearStr] = values.modelIdentifier.split('|');
    const modelYear = parseInt(modelYearStr, 10);

    try {
      const output = await getBikeModelDetails({
        brand: values.brand,
        model,
        modelYear,
      });
      setResult(output);
    } catch (error: any) {
      console.error('Error generating bike insights:', error);
      toast({
        title: 'Insight Generation Failed',
        description: error.message || 'Could not generate bike details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot />
              AI Bike Insights
            </CardTitle>
            <CardDescription>
              Select a bike model from the database to get a detailed, AI-generated overview.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                   <Select onValueChange={(brand) => {
                       field.onChange(brand);
                       form.setValue('modelIdentifier', '');
                   }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bikeBrands.map(brand => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedBrand}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableModels.map(bike => (
                        <SelectItem key={`${bike.model}|${bike.modelYear}`} value={`${bike.model}|${bike.modelYear}`}>
                            {bike.model} ({bike.modelYear})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Insights
            </Button>
            {isLoading && (
                 <div className="space-y-2 w-full p-4 border rounded-lg">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">The AI is analyzing the bike... this may take a moment.</p>
                </div>
            )}
            {result && (
              <div className="p-4 border rounded-lg w-full">
                <h4 className="font-semibold mb-2">AI-Generated Overview</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {result.details}
                </div>
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
