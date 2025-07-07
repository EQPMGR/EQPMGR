
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
  partNumber: z.string().optional(),
  system: z.string().min(1, 'System is required.'),
  // Drivetrain specific
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
  // Brakes specific
  pads: z.string().optional(),
});

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  components: z.array(componentSchema).default([]),
  frontMech: z.enum(['1x', '2x', '3x']).optional(),
  rearMech: z.enum(['9', '10', '11', '12']).optional(),
  shifterSetType: z.enum(['matched', 'unmatched']).default('matched'),
  brakeSetType: z.enum(['matched', 'unmatched']).default('matched'),
  rotorSetType: z.enum(['matched', 'unmatched']).default('matched'),
  suspensionType: z.enum(['none', 'front', 'full']).default('none'),
  rimSetType: z.enum(['matched', 'unmatched']).default('matched'),
  tireSetType: z.enum(['matched', 'unmatched']).default('matched'),
  wheelsetSetup: z.enum(['tubes', 'tubeless']).default('tubes'),
});

export type AddBikeModelFormValues = z.infer<typeof addBikeModelSchema>;

const WIZARD_SYSTEMS = ['Frameset', 'Drivetrain', 'Brakes', 'Suspension', 'Wheelset', 'Cockpit'];
const DROP_BAR_BIKE_TYPES = ['Road', 'Cyclocross', 'Gravel'];

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
            shifterSetType: 'matched',
            brakeSetType: 'matched',
            rotorSetType: 'matched',
            suspensionType: 'none',
            rimSetType: 'matched',
            tireSetType: 'matched',
            wheelsetSetup: 'tubes',
        },
    });
    
    const { fields, append, remove, update } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const bikeDetails = form.watch();
    const frontMechType = form.watch('frontMech');
    const shifterSetType = form.watch('shifterSetType');
    const brakeSetType = form.watch('brakeSetType');
    const rotorSetType = form.watch('rotorSetType');
    const suspensionType = form.watch('suspensionType');
    const rimSetType = form.watch('rimSetType');
    const tireSetType = form.watch('tireSetType');
    const wheelsetSetup = form.watch('wheelsetSetup');
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
    const frontShifterIndex = findComponentIndex('Front Shifter', 'Drivetrain');
    const rearShifterIndex = findComponentIndex('Rear Shifter', 'Drivetrain');
    const chainIndex = findComponentIndex('Chain', 'Drivetrain');
    const frontBrakeIndex = findComponentIndex('Front Brake', 'Brakes');
    const rearBrakeIndex = findComponentIndex('Rear Brake', 'Brakes');
    const frontRotorIndex = findComponentIndex('Front Rotor', 'Brakes');
    const rearRotorIndex = findComponentIndex('Rear Rotor', 'Brakes');
    const forkIndex = findComponentIndex('Fork', 'Suspension');
    const rearShockIndex = findComponentIndex('Rear Shock', 'Suspension');
    const frontHubIndex = findComponentIndex('Front Hub', 'Wheelset');
    const rearHubIndex = findComponentIndex('Rear Hub', 'Wheelset');
    const frontRimIndex = findComponentIndex('Front Rim', 'Wheelset');
    const rearRimIndex = findComponentIndex('Rear Rim', 'Wheelset');
    const frontTireIndex = findComponentIndex('Front Tire', 'Wheelset');
    const rearTireIndex = findComponentIndex('Rear Tire', 'Wheelset');
    const frontSkewerIndex = findComponentIndex('Front Skewer', 'Wheelset');
    const rearSkewerIndex = findComponentIndex('Rear Skewer', 'Wheelset');
    const valvesIndex = findComponentIndex('Valves', 'Wheelset');
    const handlebarIndex = findComponentIndex('Handlebar', 'Cockpit');
    const stemIndex = findComponentIndex('Stem', 'Cockpit');
    const seatpostIndex = findComponentIndex('Seatpost', 'Cockpit');
    const headsetIndex = findComponentIndex('Headset', 'Cockpit');
    const saddleIndex = findComponentIndex('Saddle', 'Cockpit');
    const gripsIndex = findComponentIndex('Grips', 'Cockpit');
    const seatpostClampIndex = findComponentIndex('Seatpost Clamp', 'Cockpit');


    async function handleGoToComponents() {
        const result = await form.trigger(["type", "brand", "model", "modelYear"]);
        if (result) {
            const hasFrameset = fields.some(f => f.system === 'Frameset');
            if (!hasFrameset) {
                append({ 
                    name: 'Frame', 
                    brand: bikeDetails.brand, 
                    model: bikeDetails.model, 
                    partNumber: '',
                    system: 'Frameset', 
                });
            }
            setStep(2);
        }
    }

    function handleNextSystem() {
        const nextSystemIndex = systemIndex + 1;
        const nextSystem = WIZARD_SYSTEMS[nextSystemIndex];

        // Pre-populate components when moving to a new step
        if (nextSystem === 'Drivetrain') {
            const hasDrivetrain = fields.some(f => f.system === 'Drivetrain');
            if (!hasDrivetrain) {
                append([
                    { name: 'Crankset', system: 'Drivetrain', brand: '', model: '', partNumber: ''},
                    { name: 'Front Derailleur', system: 'Drivetrain', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Derailleur', system: 'Drivetrain', brand: '', model: '', partNumber: '' },
                    { name: 'Cassette', system: 'Drivetrain', brand: '', model: '', partNumber: '' },
                    { name: 'Front Shifter', system: 'Drivetrain', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Shifter', system: 'Drivetrain', brand: '', model: '', partNumber: '' },
                    { name: 'Chain', system: 'Drivetrain', brand: '', model: '', partNumber: '', links: '', tensioner: '' },
                ]);
            }
        } else if (nextSystem === 'Brakes') {
            const hasBrakes = fields.some(f => f.system === 'Brakes');
            if (!hasBrakes) {
                append([
                    { name: 'Front Brake', system: 'Brakes', brand: '', model: '', partNumber: '', pads: '' },
                    { name: 'Rear Brake', system: 'Brakes', brand: '', model: '', partNumber: '', pads: '' },
                    { name: 'Front Rotor', system: 'Brakes', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Rotor', system: 'Brakes', brand: '', model: '', partNumber: '' },
                ]);
            }
        } else if (nextSystem === 'Suspension') {
            const hasSuspension = fields.some(f => f.system === 'Suspension');
            if (!hasSuspension) {
                append([
                    { name: 'Fork', system: 'Suspension', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Shock', system: 'Suspension', brand: '', model: '', partNumber: '' },
                ]);
            }
        } else if (nextSystem === 'Wheelset') {
            const hasWheelset = fields.some(f => f.system === 'Wheelset');
            if (!hasWheelset) {
                append([
                    { name: 'Front Hub', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Hub', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Front Rim', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Rim', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Front Tire', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Tire', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Front Skewer', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Rear Skewer', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                    { name: 'Valves', system: 'Wheelset', brand: '', model: '', partNumber: '' },
                ]);
            }
        } else if (nextSystem === 'Cockpit') {
            const hasCockpit = fields.some(f => f.system === 'Cockpit');
            if (!hasCockpit) {
                append([
                    { name: 'Handlebar', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Stem', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Seatpost', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Headset', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Saddle', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Grips', system: 'Cockpit', brand: '', model: '', partNumber: '' },
                    { name: 'Seatpost Clamp', system: 'Cockpit', brand: '', model: '', partNumber: '' },
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
        
        const processedValues = { ...values };
        const finalComponents = [...processedValues.components];

        const forkIndex = finalComponents.findIndex(c => c.name === 'Fork');
        const rearShockIndex = finalComponents.findIndex(c => c.name === 'Rear Shock');

        if (processedValues.suspensionType === 'none') {
            if (rearShockIndex > -1) {
                finalComponents.splice(rearShockIndex, 1);
            }
            if (forkIndex > -1) {
                // This is the "ghost fork" logic. It's a rigid fork, part of the frameset.
                const frameComponent = finalComponents.find(c => c.name === 'Frame');
                finalComponents[forkIndex] = {
                    ...finalComponents[forkIndex],
                    system: 'Frameset', // Re-assign to Frameset system
                    brand: frameComponent?.brand || processedValues.brand,
                    model: frameComponent?.model || processedValues.model,
                    partNumber: '',
                };
            }
        } else if (processedValues.suspensionType === 'front') {
            if (rearShockIndex > -1) {
                finalComponents.splice(rearShockIndex, 1);
            }
        }
        
        processedValues.components = finalComponents;

        console.log('Final data to submit:', processedValues);

        setTimeout(() => {
            toast({
                title: 'Bike Model Saved (Placeholder)',
                description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(processedValues, null, 2)}</code></pre>,
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              name={`components.${framesetIndex}.partNumber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Part Number</FormLabel>
                                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
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
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField name={`components.${cranksetIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        {renderChainringInputs()}
                                    </CardContent>
                                </Card>
                            )}
                            
                            {frontDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">{frontMechType === '1x' ? 'Chain Guide / Front Derailleur' : 'Front Derailleur'}</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontDerailleurIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                             {rearDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Rear Derailleur</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearDerailleurIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {cassetteIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Cassette</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${cassetteIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cassetteIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED XG-1290" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cassetteIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                             {frontShifterIndex !== -1 && rearShifterIndex !== -1 && (
                                <Card>
                                  <CardHeader><CardTitle className="text-lg">Shifters</CardTitle></CardHeader>
                                  <CardContent className="space-y-4">
                                    <FormField
                                      control={form.control}
                                      name="shifterSetType"
                                      render={({ field }) => (
                                        <FormItem className="space-y-3">
                                          <FormLabel>Configuration</FormLabel>
                                          <FormControl>
                                            <RadioGroup
                                              onValueChange={field.onChange}
                                              defaultValue={field.value}
                                              className="flex space-x-4"
                                            >
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem>
                                              <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem>
                                            </RadioGroup>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {shifterSetType === 'matched' && (
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField
                                          control={form.control}
                                          name={`components.${frontShifterIndex}.brand`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Brand</FormLabel>
                                              <FormControl>
                                                <Input
                                                  placeholder="e.g., SRAM"
                                                  {...field}
                                                  onChange={(e) => {
                                                    field.onChange(e);
                                                    form.setValue(`components.${rearShifterIndex}.brand`, e.target.value);
                                                  }}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name={`components.${frontShifterIndex}.model`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Model</FormLabel>
                                              <FormControl>
                                                <Input
                                                  placeholder="e.g., RED eTap AXS"
                                                  {...field}
                                                  onChange={(e) => {
                                                    field.onChange(e);
                                                    form.setValue(`components.${rearShifterIndex}.model`, e.target.value);
                                                  }}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name={`components.${frontShifterIndex}.partNumber`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Part Number</FormLabel>
                                              <FormControl>
                                                <Input
                                                  placeholder="Optional"
                                                  {...field}
                                                  onChange={(e) => {
                                                    field.onChange(e);
                                                    form.setValue(`components.${rearShifterIndex}.partNumber`, e.target.value);
                                                  }}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    )}

                                    {shifterSetType === 'unmatched' && (
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">Front Shifter</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                          <FormField name={`components.${frontShifterIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${frontShifterIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${frontShifterIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <h4 className="font-semibold text-sm mt-4">Rear Shifter</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                          <FormField name={`components.${rearShifterIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${rearShifterIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${rearShifterIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                            )}

                            {chainIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Chain</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField name={`components.${chainIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RED Flat-Top" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.links`} render={({ field }) => (<FormItem><FormLabel>Links</FormLabel><FormControl><Input placeholder="e.g., 114" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.tensioner`} render={({ field }) => (<FormItem><FormLabel>Tensioner</FormLabel><FormControl><Input placeholder="N/A" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      )}

                      {step === 2 && activeSystem === 'Brakes' && (
                        <div className="space-y-6">
                            {DROP_BAR_BIKE_TYPES.includes(bikeDetails.type) && fields[frontShifterIndex] && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Brake Levers</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Brake levers are integrated with the shifters for this bike type.
                                        </p>
                                        <p className="font-medium mt-1">
                                            {fields[frontShifterIndex].brand} {fields[frontShifterIndex].model}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Brake Calipers</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="brakeSetType"
                                        render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Configuration</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     {brakeSetType === 'matched' && frontBrakeIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.partNumber`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.pads`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {brakeSetType === 'unmatched' && frontBrakeIndex !== -1 && rearBrakeIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Brake</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${frontBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Brake</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${rearBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearBrakeIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearBrakeIndex}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Brake Rotors</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="rotorSetType"
                                        render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Configuration</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    {rotorSetType === 'matched' && frontRotorIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.partNumber`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {rotorSetType === 'unmatched' && frontRotorIndex !== -1 && rearRotorIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rotor</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRotorIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rotor</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRotorIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                      )}
                      
                      {step === 2 && activeSystem === 'Suspension' && (
                        <div className="space-y-6">
                            <Card className="p-4">
                                <FormField
                                  control={form.control}
                                  name="suspensionType"
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Suspension Configuration</FormLabel>
                                      <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><FormLabel className="font-normal">No Suspension</FormLabel></FormItem>
                                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="front" /></FormControl><FormLabel className="font-normal">Front Suspension</FormLabel></FormItem>
                                          <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="full" /></FormControl><FormLabel className="font-normal">Full Suspension</FormLabel></FormItem>
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </Card>

                            {(suspensionType === 'front' || suspensionType === 'full') && forkIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Fork</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${forkIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Fox" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${forkIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 36 Factory" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${forkIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {suspensionType === 'full' && rearShockIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Rear Shock</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearShockIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Fox" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearShockIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Float X2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearShockIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      )}
                      
                      {step === 2 && activeSystem === 'Wheelset' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Hubs</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <h4 className="font-semibold text-sm">Front Hub</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontHubIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontHubIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontHubIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <h4 className="font-semibold text-sm mt-4">Rear Hub</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearHubIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearHubIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearHubIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Rims</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="rimSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {rimSetType === 'matched' && frontRimIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${frontRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRimIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.partNumber`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {rimSetType === 'unmatched' && frontRimIndex !== -1 && rearRimIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rim</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 303 Firecrest" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRimIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rim</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRimIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Tires</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="tireSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {tireSetType === 'matched' && frontTireIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${frontTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontTireIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.partNumber`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {tireSetType === 'unmatched' && frontTireIndex !== -1 && rearTireIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Tire</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontTireIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Tire</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000 S" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearTireIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Tire Setup</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="wheelsetSetup" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Setup</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubes" /></FormControl><FormLabel className="font-normal">Tubes</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubeless" /></FormControl><FormLabel className="font-normal">Tubeless</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {wheelsetSetup === 'tubeless' && valvesIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${valvesIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Valve Brand</FormLabel><FormControl><Input placeholder="e.g., Muc-Off" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${valvesIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Valve Model</FormLabel><FormControl><Input placeholder="e.g., V2 Tubeless Valves" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${valvesIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Skewers / Thru-Axles</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <h4 className="font-semibold text-sm">Front Skewer/Axle</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontSkewerIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontSkewerIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontSkewerIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <h4 className="font-semibold text-sm mt-4">Rear Skewer/Axle</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearSkewerIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearSkewerIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearSkewerIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                      )}
                      
                      {step === 2 && activeSystem === 'Cockpit' && (
                        <div className="space-y-6">
                          <Card>
                            <CardHeader><CardTitle className="text-lg">Handlebar</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${handlebarIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${handlebarIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${handlebarIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Stem</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${stemIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${stemIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${stemIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Seatpost</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${seatpostIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Headset</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${headsetIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${headsetIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${headsetIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Saddle</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${saddleIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${saddleIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${saddleIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Grips / Bar Tape</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${gripsIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${gripsIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${gripsIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader><CardTitle className="text-lg">Seatpost Clamp</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${seatpostClampIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostClampIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostClampIndex}.partNumber`} render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
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
