
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BIKE_TYPES, COMPONENT_SYSTEMS } from '@/lib/constants';
import { bikeDatabase } from '@/lib/bike-database';
import { cn } from '@/lib/utils';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  brand: z.string().min(1, 'Brand is required.'),
  model: z.string().min(1, 'Model is required.'),
  system: z.string().min(1, 'System is required.'),
  size: z.string().optional(),
});

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  components: z.array(componentSchema).default([]),
});

export type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

const SIZED_COMPONENTS = ['frame', 'stem', 'handlebar', 'crankset'];

export default function AddBikeModelPage() {
    const [step, setStep] = useState(1);
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
            components: [],
        },
    });
    
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const bikeDetails = form.watch();

    const availableBrands = useMemo(() => {
      const brands = bikeDatabase.map(bike => bike.brand);
      const uniqueBrands = [...new Set(brands)];
      return uniqueBrands.sort();
    }, []);

    useEffect(() => {
        // No logic change here, but effect is kept for future use if needed
    }, [bikeDetails.type, form]);

    async function handleGoToNextStep() {
        const result = await form.trigger(["type", "brand", "model", "modelYear"]);
        if (result) {
            if (fields.length === 0) {
                // Pre-populate with Frame component, including model.
                append({ 
                    name: 'Frame', 
                    brand: bikeDetails.brand, 
                    model: bikeDetails.model, 
                    system: 'Frameset', 
                    size: '' 
                });
            }
            setStep(2);
        }
    }

    function onSubmit(values: AddBikeModelFormValues) {
        setIsSubmitting(true);
        console.log('Final data to submit:', values);

        setTimeout(() => {
            toast({
                title: 'Bike Model Saved (Placeholder)',
                description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(values, null, 2)}</code></pre>,
            });
            setIsSubmitting(false);
            setStep(1);
            form.reset();
        }, 1000);
    }
    
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>{step === 1 ? 'Add a New Bike Model' : `Add Components for ${bikeDetails.brand} ${bikeDetails.model}`}</CardTitle>
                <CardDescription>
                  {step === 1 
                    ? 'Fill out the form below to add a new bike to the central database.'
                    : 'Add the components for this bike model. This will be used as a template for users.'
                  }
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <CardContent>
                      {step === 1 ? (
                        <div className="space-y-6">
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
                                                      form.setValue("brand", brand);
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
                                              <Input placeholder="e.g., Tarmac SL7" {...field} disabled={!bikeDetails.brand} />
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
                                              <Input type="number" placeholder="e.g., 2023" {...field} disabled={!bikeDetails.brand} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {fields.map((field, index) => {
                            const componentName = form.watch(`components.${index}.name`) ?? '';
                            const showSizeField = SIZED_COMPONENTS.some(c => componentName.toLowerCase().includes(c));

                            return (
                                <Card key={field.id} className="p-4 relative">
                                  <div className={cn(
                                      "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                      showSizeField ? "lg:grid-cols-5" : "lg:grid-cols-4"
                                    )}>
                                    <FormField
                                      control={form.control}
                                      name={`components.${index}.name`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Component Name</FormLabel>
                                          <FormControl><Input placeholder="e.g., Rear Derailleur" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`components.${index}.brand`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Brand</FormLabel>
                                          <FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`components.${index}.model`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Model</FormLabel>
                                          <FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`components.${index}.system`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>System</FormLabel>
                                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a system" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {COMPONENT_SYSTEMS.map(system => (
                                                <SelectItem key={system} value={system}>{system}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    {showSizeField && (
                                        <FormField
                                          control={form.control}
                                          name={`components.${index}.size`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Size</FormLabel>
                                              <FormControl><Input placeholder="e.g., 56cm" {...field} value={field.value ?? ''} /></FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                    )}
                                  </div>
                                   <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Remove Component</span>
                                    </Button>
                                </Card>
                              )
                            })}
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => append({ name: '', brand: '', model: '', system: '', size: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                       {step === 1 ? (
                          <div className="flex justify-end w-full gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/admin">Cancel</Link>
                            </Button>
                            <Button type="button" onClick={handleGoToNextStep}>
                                Next: Add Components
                            </Button>
                          </div>
                       ) : (
                         <>
                          <Button type="button" variant="outline" onClick={() => setStep(1)}>
                              <ArrowLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Bike Model
                          </Button>
                        </>
                       )}
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
