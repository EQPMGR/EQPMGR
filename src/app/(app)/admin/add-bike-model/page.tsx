
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BIKE_TYPES } from '@/lib/constants';
import { bikeDatabase } from '@/lib/bike-database';
import { cn } from '@/lib/utils';

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
});

export type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

export default function AddBikeModelPage() {
    const [step, setStep] = useState(1);
    const [bikeData, setBikeData] = useState<AddBikeModelFormValues | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);

    const form = useForm<AddBikeModelFormValues>({
        resolver: zodResolver(addBikeModelSchema),
        defaultValues: {
            type: '',
            brand: '',
            model: '',
            modelYear: new Date().getFullYear(),
        },
    });

    const selectedType = useWatch({
      control: form.control,
      name: 'type',
    });

    const selectedBrand = useWatch({
      control: form.control,
      name: 'brand',
    });

    const availableBrands = useMemo(() => {
      const brands = bikeDatabase.map(bike => bike.brand);
      const uniqueBrands = [...new Set(brands)];
      return uniqueBrands.sort();
    }, []);

    // Reset brand when type changes to ensure data consistency
    useEffect(() => {
        if (selectedType) {
            form.resetField('brand', { defaultValue: '' });
        }
    }, [selectedType, form]);


    function handleNextStep(values: AddBikeModelFormValues) {
        setBikeData(values);
        setStep(2);
    }

    function handleFinalSubmit() {
        // This is a placeholder for now.
        // In the next step, we will wire this up to save to Firestore.
        setIsSubmitting(true);
        console.log('Final data to submit:', bikeData);

        setTimeout(() => {
            toast({
                title: 'Bike Model Saved (Placeholder)',
                description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(bikeData, null, 2)}</code></pre>,
            });
            setIsSubmitting(false);
            setStep(1);
            setBikeData(null);
            form.reset();
        }, 1000);
    }
    
    if (step === 2 && bikeData) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Step 2: Add Components</CardTitle>
                    <CardDescription>
                        Now, add the components for the {bikeData.brand} {bikeData.model}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>The component editor will be built here in the next step.</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                     <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Bike Model
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Add a New Bike Model (Step 1 of 2)</CardTitle>
                <CardDescription>
                    Fill out the form below to add a new bike to the central database. Start with the type.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleNextStep)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bike Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a bike type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {BIKE_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <FormField
                              control={form.control}
                              name="brand"
                              render={({ field }) => (
                                <FormItem className="flex flex-col md:col-span-1">
                                  <FormLabel>Brand</FormLabel>
                                  <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value || "Select or create brand"}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        side="bottom" 
                                        align="start" 
                                        className="w-[--radix-popover-trigger-width] p-0"
                                        avoidCollisions={false}
                                    >
                                      <Command>
                                        <CommandInput placeholder="Search brand..." />
                                        <CommandEmpty>No brand found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                            {availableBrands.map((brand) => (
                                                <CommandItem
                                                value={brand}
                                                key={brand}
                                                onSelect={() => {
                                                    form.setValue("brand", brand)
                                                    setBrandPopoverOpen(false);
                                                }}
                                                >
                                                <Check
                                                    className={cn(
                                                    "mr-2 h-4 w-4",
                                                    brand === field.value
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                    )}
                                                />
                                                {brand}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-1">
                                        <FormLabel>Model</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Tarmac SL7" {...field} disabled={!selectedBrand} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="modelYear"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-1">
                                        <FormLabel>Model Year</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 2023" {...field} disabled={!selectedBrand} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                             <Button type="button" variant="outline" asChild>
                                <Link href="/admin">Cancel</Link>
                            </Button>
                            <Button type="submit">
                                Next: Add Components
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

