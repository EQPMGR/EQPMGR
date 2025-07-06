
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BIKE_TYPES } from '@/lib/constants';
import { bikeDatabase } from '@/lib/bike-database';
import { cn } from '@/lib/utils';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  brand: z.string().optional(),
  model: z.string().optional(),
  system: z.string().min(1, 'System is required.'),
  size: z.string().optional(),
  // Drivetrain specific
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
});

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  components: z.array(componentSchema).default([]),
  frontMech: z.enum(['1x', '2x', '3x']).optional(),
  rearMech: z.enum(['9', '10', '11', '12']).optional(),
});

export type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

const WIZARD_SYSTEMS = ['Frameset', 'Drivetrain', 'Brakes', 'Suspension', 'Wheelset', 'Cockpit'];
const SIZED_COMPONENTS = ['frame', 'stem', 'handlebar', 'crankset'];

export default function AddBikeModelPage() {
    const [step, setStep] = useState(1);
    const [systemIndex, setSystemIndex] = useState(0);
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
    
    const { fields, append, remove, update } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const bikeDetails = form.watch();
    const frontMechType = form.watch('frontMech');
    const activeSystem = WIZARD_SYSTEMS[systemIndex];

    const availableBrands = useMemo(() => {
      const brands = bikeDatabase.map(bike => bike.brand);
      const uniqueBrands = [...new Set(brands)];
      return uniqueBrands.sort();
    }, []);

    const findComponentIndex = (name: string, system: string) => {
        return fields.findIndex(field => field.name === name && field.system === system);
    };

    const framesetIndex = findComponentIndex('Frame', 'Frameset');
    const cranksetIndex = findComponentIndex('Crankset', 'Drivetrain');
    const frontDerailleurIndex = findComponentIndex('Front Derailleur', 'Drivetrain');
    const rearDerailleurIndex = findComponentIndex('Rear Derailleur', 'Drivetrain');
    const cassetteIndex = findComponentIndex('Cassette', 'Drivetrain');
    const shiftersIndex = findComponentIndex('Shifters', 'Drivetrain');
    const chainIndex = findComponentIndex('Chain', 'Drivetrain');


    async function handleGoToComponents() {
        const result = await form.trigger(["type", "brand", "model", "modelYear"]);
        if (result) {
            const hasFrameset = fields.some(f => f.system === 'Frameset');
            if (!hasFrameset) {
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

    function handleNextSystem() {
        const nextSystemIndex = systemIndex + 1;
        const nextSystem = WIZARD_SYSTEMS[nextSystemIndex];

        // Pre-populate drivetrain components when moving to that step
        if (nextSystem === 'Drivetrain') {
            const hasDrivetrain = fields.some(f => f.system === 'Drivetrain');
            if (!hasDrivetrain) {
                append([
                    { name: 'Crankset', system: 'Drivetrain', brand: '', model: '', size: '' },
                    { name: 'Front Derailleur', system: 'Drivetrain', brand: '', model: '' },
                    { name: 'Rear Derailleur', system: 'Drivetrain', brand: '', model: '' },
                    { name: 'Cassette', system: 'Drivetrain', brand: '', model: '' },
                    { name: 'Shifters', system: 'Drivetrain', brand: '', model: '' },
                    { name: 'Chain', system: 'Drivetrain', brand: '', model: '', links: '', tensioner: '' },
                ]);
            }
        }

        if (systemIndex < WIZARD_SYSTEMS.length - 1) {
            setSystemIndex(nextSystemIndex);
        } else {
            form.handleSubmit(onSubmit)();
        }
    }

    function handlePreviousSystem() {
        if (systemIndex > 0) {
            setSystemIndex(prev => prev - 1);
        } else {
            setStep(1);
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
            setSystemIndex(0);
            form.reset();
        }, 1000);
    }
    
    const cardTitle = step === 1 ? 'Add a New Bike Model' : activeSystem;
    const cardDescription = step === 1 
      ? 'Fill out the form below to add a new bike to the central database.'
      : `Add components for the ${activeSystem.toLowerCase()} system.`;

    const isLastSystem = systemIndex === WIZARD_SYSTEMS.length - 1;
    
    const renderChainringInputs = () => {
        if (!frontMechType) return null;
        
        const numRings = parseInt(frontMechType.charAt(0));
        const inputs = [];

        for (let i = 1; i <= numRings; i++) {
            inputs.push(
                <FormField
                    key={`chainring${i}`}
                    control={form.control}
                    name={`components.${cranksetIndex}.chainring${i}` as any}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ring {i} (teeth)</FormLabel>
                            <FormControl><Input placeholder="e.g., 50" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }
        return inputs;
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>{cardTitle}</CardTitle>
                <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <CardContent>
                      {step === 1 && (
                        <div className="space-y-6">
                          <FormField
                              control={form.control}
                              name="type"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Bike Type</FormLabel>
                                      <Select onValueChange={(value) => {
                                          field.onChange(value);
                                          form.setValue("brand", "");
                                      }} defaultValue={field.value}>
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
                                            disabled={!bikeDetails.type}
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
                      )}
                      
                      {step === 2 && activeSystem === 'Frameset' && framesetIndex !== -1 && (
                        <Card className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <FormField
                              control={form.control}
                              name={`components.${framesetIndex}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Component Name</FormLabel>
                                  <FormControl><Input {...field} readOnly /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`components.${framesetIndex}.brand`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Brand</FormLabel>
                                  <FormControl><Input {...field} readOnly /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`components.${framesetIndex}.model`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model</FormLabel>
                                  <FormControl><Input {...field} readOnly /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`components.${framesetIndex}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Size</FormLabel>
                                  <FormControl><Input placeholder="e.g., 56cm" {...field} value={field.value ?? ''} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      )}

                      {step === 2 && activeSystem === 'Drivetrain' && (
                        <div className="space-y-6">
                            <Card className="p-4 bg-muted/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                      control={form.control}
                                      name="frontMech"
                                      render={({ field }) => (
                                        <FormItem className="space-y-3">
                                          <FormLabel>Front Mech</FormLabel>
                                          <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="1x" /></FormControl><FormLabel className="font-normal">1x</FormLabel></FormItem>
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="2x" /></FormControl><FormLabel className="font-normal">2x</FormLabel></FormItem>
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="3x" /></FormControl><FormLabel className="font-normal">3x</FormLabel></FormItem>
                                            </RadioGroup>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                     <FormField
                                      control={form.control}
                                      name="rearMech"
                                      render={({ field }) => (
                                        <FormItem className="space-y-3">
                                          <FormLabel>Rear Mech</FormLabel>
                                          <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="9" /></FormControl><FormLabel className="font-normal">9</FormLabel></FormItem>
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="10" /></FormControl><FormLabel className="font-normal">10</FormLabel></FormItem>
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="11" /></FormControl><FormLabel className="font-normal">11</FormLabel></FormItem>
                                               <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="12" /></FormControl><FormLabel className="font-normal">12</FormLabel></FormItem>
                                            </RadioGroup>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                            </Card>

                            {cranksetIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Crankset</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <FormField name={`components.${cranksetIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 172.5mm" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        {renderChainringInputs()}
                                    </CardContent>
                                </Card>
                            )}
                            
                            {frontDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">{frontMechType === '1x' ? 'Chain Guide / Front Derailleur' : 'Front Derailleur'}</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField name={`components.${frontDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                             {rearDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Rear Derailleur</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField name={`components.${rearDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {cassetteIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Cassette</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField name={`components.${cassetteIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cassetteIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED XG-1290" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                             {shiftersIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Shifters</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField name={`components.${shiftersIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${shiftersIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {chainIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Chain</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                                        <FormField name={`components.${chainIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED Flat-Top" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.links`} render={({ field }) => (<FormItem><FormLabel>Links</FormLabel><FormControl><Input placeholder="e.g., 114" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.tensioner`} render={({ field }) => (<FormItem><FormLabel>Tensioner</FormLabel><FormControl><Input placeholder="N/A" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                       {step === 1 ? (
                          <div className="flex justify-end w-full gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/admin">Cancel</Link>
                            </Button>
                            <Button type="button" onClick={handleGoToComponents}>
                                Next: Add Components
                            </Button>
                          </div>
                       ) : (
                         <>
                          <Button type="button" variant="outline" onClick={handlePreviousSystem}>
                              <ArrowLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                          <Button type="button" onClick={handleNextSystem} disabled={isSubmitting}>
                              {isSubmitting && isLastSystem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isLastSystem ? 'Save Bike Model' : 'Next System'}
                          </Button>
                        </>
                       )}
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

