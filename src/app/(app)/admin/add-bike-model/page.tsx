
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

export default function AddBikeModelPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

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


    function onSubmit(values: AddBikeModelFormValues) {
        // This is a placeholder for now.
        // In the next step, we will wire this up to save to Firestore.
        setIsSubmitting(true);
        console.log('Form submitted with values:', values);

        setTimeout(() => {
            toast({
                title: 'Form Submitted (Placeholder)',
                description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(values, null, 2)}</code></pre>,
            });
            setIsSubmitting(false);
            form.reset();
        }, 1000);
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Add a New Bike Model</CardTitle>
                <CardDescription>
                    Fill out the form below to add a new bike to the central database. Start with the type.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          disabled={!selectedType}
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Next: Add Components
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
