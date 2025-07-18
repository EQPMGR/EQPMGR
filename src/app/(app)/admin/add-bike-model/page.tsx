
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, ArrowLeft, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { writeBatch, doc, collection, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { BIKE_TYPES, DROP_BAR_BIKE_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  brand: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  system: z.string().min(1, 'System is required.'),
  // Drivetrain specific
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
  // Brakes specific
  pads: z.string().optional(),
  // E-Bike specific
  power: z.string().optional(),
  capacity: z.string().optional(),
});

const addBikeModelSchema = z.object({
  type: z.string().min(1, 'Please select a bike type.'),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  modelYear: z.coerce.number().min(1980, 'Year must be after 1980.').max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  isEbike: z.boolean().default(false),
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

// A simple utility to create a slug from a component's details
const createComponentId = (component: Partial<z.infer<typeof componentSchema>>) => {
    const idString = [component.brand, component.model, component.name]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const createBikeModelId = (bike: AddBikeModelFormValues) => {
    return `${bike.brand}-${bike.model}-${bike.modelYear}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Helper to map data from AI to form values
const mapAiDataToFormValues = (data: ExtractBikeDetailsOutput): AddBikeModelFormValues => {
    return {
        brand: data.brand || '',
        model: data.model || '',
        modelYear: data.modelYear || new Date().getFullYear(),
        type: '', // User will select this manually
        isEbike: !!data.components.find(c => c.system === 'E-Bike'),
        components: data.components.map(c => ({
            name: c.name,
            brand: c.brand || '',
            series: c.series || '',
            model: c.model || '',
            size: '', // Size is not extracted by AI currently
            system: c.system,
            chainring1: c.chainring1,
            chainring2: c.chainring2,
            chainring3: c.chainring3,
        })),
        // These will be selected manually by the user
        frontMech: undefined,
        rearMech: undefined,
        shifterSetType: 'matched',
        brakeSetType: 'matched',
        rotorSetType: 'matched',
        suspensionType: 'none',
        rimSetType: 'matched',
        tireSetType: 'matched',
        wheelsetSetup: 'tubes',
    };
};

const WIZARD_SYSTEMS_BASE = ['Frameset', 'Drivetrain', 'Brakes', 'Suspension', 'Wheelset', 'Cockpit'];

function AddBikeModelFormComponent() {
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [systemIndex, setSystemIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);

    const form = useForm<AddBikeModelFormValues>({
        resolver: zodResolver(addBikeModelSchema),
        defaultValues: {
            type: '',
            brand: '',
            model: '',
            modelYear: new Date().getFullYear(),
            isEbike: false,
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

    useEffect(() => {
      async function fetchBrands() {
        try {
          const querySnapshot = await getDocs(collection(db, "bikeModels"));
          const brands = new Set<string>();
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.brand) {
                brands.add(data.brand);
            }
          });
          setAvailableBrands(Array.from(brands).sort());
        } catch (error) {
          console.error("Error fetching brands: ", error);
          toast({ variant: 'destructive', title: "Error", description: "Could not fetch bike brands." });
        }
      }
      fetchBrands();
    }, [toast]);

    useEffect(() => {
        const importedData = sessionStorage.getItem('importedBikeData');
        if (importedData) {
            try {
                const parsedData: ExtractBikeDetailsOutput = JSON.parse(importedData);
                const formValues = mapAiDataToFormValues(parsedData);
                form.reset(formValues);
                toast({ title: "Data Imported!", description: "The form has been pre-filled with the extracted data." });
            } catch (e) {
                console.error("Failed to parse imported data", e);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read the data from the import page.' });
            } finally {
                sessionStorage.removeItem('importedBikeData');
            }
        }
    }, [form, toast]);
    
    const { fields, append, remove, update } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const bikeDetails = form.watch();
    const isEbike = form.watch('isEbike');
    const frontMechType = form.watch('frontMech');
    const shifterSetType = form.watch('shifterSetType');
    const brakeSetType = form.watch('brakeSetType');
    const rotorSetType = form.watch('rotorSetType');
    const suspensionType = form.watch('suspensionType');
    const rimSetType = form.watch('rimSetType');
    const tireSetType = form.watch('tireSetType');
    const wheelsetSetup = form.watch('wheelsetSetup');
    
    const wizardSystems = isEbike ? [...WIZARD_SYSTEMS_BASE, 'E-Bike'] : WIZARD_SYSTEMS_BASE;
    const activeSystem = wizardSystems[systemIndex];

    const findComponentIndex = (name: string, system: string) => {
        return fields.findIndex(field => field.name === name && field.system === system);
    };

    const framesetIndex = findComponentIndex('Frame', 'Frameset');
    const cranksetIndex = findComponentIndex('Crankset', 'Drivetrain');
    const bottomBracketIndex = findComponentIndex('Bottom Bracket', 'Drivetrain');
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
    const motorIndex = findComponentIndex('Motor', 'E-Bike');
    const batteryIndex = findComponentIndex('Battery', 'E-Bike');
    const displayIndex = findComponentIndex('Display', 'E-Bike');
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
            if (findComponentIndex('Frame', 'Frameset') === -1) {
                append({ 
                    name: 'Frame', 
                    brand: bikeDetails.brand, 
                    series: bikeDetails.model, 
                    model: '',
                    system: 'Frameset', 
                });
            }
            setStep(2);
        }
    }

    function handleNextSystem() {
        const nextSystemIndex = systemIndex + 1;
        const nextSystem = wizardSystems[nextSystemIndex];
        const componentsToAdd = [];

        // Pre-populate components when moving to a new step
        if (nextSystem === 'Drivetrain') {
            if (findComponentIndex('Crankset', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Crankset', system: 'Drivetrain', brand: '', series: '', model: ''});
            if (findComponentIndex('Bottom Bracket', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Bottom Bracket', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Front Derailleur', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Front Derailleur', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Derailleur', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Rear Derailleur', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Cassette', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Cassette', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Front Shifter', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Front Shifter', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Shifter', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Rear Shifter', system: 'Drivetrain', brand: '', series: '', model: '' });
            if (findComponentIndex('Chain', 'Drivetrain') === -1) componentsToAdd.push({ name: 'Chain', system: 'Drivetrain', brand: '', series: '', model: '', links: '', tensioner: '' });
        } else if (nextSystem === 'Brakes') {
            if (findComponentIndex('Front Brake', 'Brakes') === -1) componentsToAdd.push({ name: 'Front Brake', system: 'Brakes', brand: '', series: '', model: '', pads: '' });
            if (findComponentIndex('Rear Brake', 'Brakes') === -1) componentsToAdd.push({ name: 'Rear Brake', system: 'Brakes', brand: '', series: '', model: '', pads: '' });
            if (findComponentIndex('Front Rotor', 'Brakes') === -1) componentsToAdd.push({ name: 'Front Rotor', system: 'Brakes', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Rotor', 'Brakes') === -1) componentsToAdd.push({ name: 'Rear Rotor', system: 'Brakes', brand: '', series: '', model: '' });
        } else if (nextSystem === 'Suspension') {
            if (findComponentIndex('Fork', 'Suspension') === -1) componentsToAdd.push({ name: 'Fork', system: 'Suspension', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Shock', 'Suspension') === -1) componentsToAdd.push({ name: 'Rear Shock', system: 'Suspension', brand: '', series: '', model: '' });
        } else if (nextSystem === 'Wheelset') {
            if (findComponentIndex('Front Hub', 'Wheelset') === -1) componentsToAdd.push({ name: 'Front Hub', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Hub', 'Wheelset') === -1) componentsToAdd.push({ name: 'Rear Hub', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Front Rim', 'Wheelset') === -1) componentsToAdd.push({ name: 'Front Rim', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Rim', 'Wheelset') === -1) componentsToAdd.push({ name: 'Rear Rim', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Front Tire', 'Wheelset') === -1) componentsToAdd.push({ name: 'Front Tire', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Tire', 'Wheelset') === -1) componentsToAdd.push({ name: 'Rear Tire', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Front Skewer', 'Wheelset') === -1) componentsToAdd.push({ name: 'Front Skewer', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Rear Skewer', 'Wheelset') === -1) componentsToAdd.push({ name: 'Rear Skewer', system: 'Wheelset', brand: '', series: '', model: '' });
            if (findComponentIndex('Valves', 'Wheelset') === -1) componentsToAdd.push({ name: 'Valves', system: 'Wheelset', brand: '', series: '', model: '' });
        } else if (nextSystem === 'Cockpit') {
            if (findComponentIndex('Handlebar', 'Cockpit') === -1) componentsToAdd.push({ name: 'Handlebar', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Stem', 'Cockpit') === -1) componentsToAdd.push({ name: 'Stem', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Seatpost', 'Cockpit') === -1) componentsToAdd.push({ name: 'Seatpost', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Headset', 'Cockpit') === -1) componentsToAdd.push({ name: 'Headset', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Saddle', 'Cockpit') === -1) componentsToAdd.push({ name: 'Saddle', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Grips', 'Cockpit') === -1) componentsToAdd.push({ name: 'Grips', system: 'Cockpit', brand: '', series: '', model: '' });
            if (findComponentIndex('Seatpost Clamp', 'Cockpit') === -1) componentsToAdd.push({ name: 'Seatpost Clamp', system: 'Cockpit', brand: '', series: '', model: '' });
        } else if (nextSystem === 'E-Bike') {
            if (findComponentIndex('Motor', 'E-Bike') === -1) componentsToAdd.push({ name: 'Motor', system: 'E-Bike', brand: '', model: '', power: '' });
            if (findComponentIndex('Battery', 'E-Bike') === -1) componentsToAdd.push({ name: 'Battery', system: 'E-Bike', brand: '', model: '', capacity: '' });
            if (findComponentIndex('Display', 'E-Bike') === -1) componentsToAdd.push({ name: 'Display', system: 'E-Bike', brand: '', model: '' });
        }


        if (componentsToAdd.length > 0) {
            append(componentsToAdd, { shouldFocus: false });
        }

        if (systemIndex < wizardSystems.length - 1) {
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

    async function onSubmit(values: AddBikeModelFormValues) {
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(db);
            const masterComponentsRef = collection(db, 'masterComponents');
            const bikeModelsRef = collection(db, 'bikeModels');

            const componentReferences: string[] = [];

            // Process all components for the current bike
            for (const originalComponent of values.components) {

                const componentToSave: { [key: string]: any } = {};
                // Copy only defined and non-empty values to the object we'll save
                Object.keys(originalComponent).forEach((key: any) => {
                    const typedKey = key as keyof typeof originalComponent;
                    const value = originalComponent[typedKey];
                    if (value !== undefined && value !== null && value !== '') {
                        componentToSave[key] = value;
                    }
                });
                
                // Skip components with no brand, series, or model if they're not the frame
                if (componentToSave.name !== 'Frame' && !componentToSave.brand && !componentToSave.series && !componentToSave.model) {
                    continue;
                }

                // Final programmatic check for SRAM capitalization
                if (componentToSave.brand && componentToSave.brand.toLowerCase() === 'sram') {
                    componentToSave.brand = 'SRAM';
                }

                const componentId = createComponentId(componentToSave as Partial<z.infer<typeof componentSchema>>);
                
                if (!componentId) continue;

                // Add component to master list
                const masterComponentDocRef = doc(masterComponentsRef, componentId);
                batch.set(masterComponentDocRef, componentToSave, { merge: true });
                
                // Use the full path for the reference
                componentReferences.push(masterComponentDocRef.path);
            }

            // Create the bike model document
            const bikeModelId = createBikeModelId(values);
            const bikeModelDocRef = doc(bikeModelsRef, bikeModelId);
            
            // Exclude full components object from the bike model data before setting it
            const { components, ...bikeModelData } = values;

            const bikeModelDataToSave: { [key: string]: any } = {};
             Object.keys(bikeModelData).forEach((key: any) => {
                const typedKey = key as keyof typeof bikeModelData;
                const value = bikeModelData[typedKey];
                if (value !== undefined && value !== null && value !== '') {
                    bikeModelDataToSave[key] = value;
                }
            });

            // Final programmatic check for SRAM capitalization on the bike itself
            if (bikeModelDataToSave.brand && bikeModelDataToSave.brand.toLowerCase() === 'sram') {
                bikeModelDataToSave.brand = 'SRAM';
            }

            batch.set(bikeModelDocRef, {
                ...bikeModelDataToSave,
                components: componentReferences,
                imageUrl: `https://placehold.co/600x400.png` // Placeholder image
            });
            
            await batch.commit();

            toast({
                title: 'Bike Model Saved!',
                description: `${values.brand} ${values.model} (${values.modelYear}) has been added to the database.`,
            });
            
            // Reset form state
            setStep(1);
            setSystemIndex(0);
            form.reset();

        } catch (error: any) {
            console.error("Failed to save bike model:", error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message || 'An unexpected error occurred while saving the bike model.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const cardTitle = step === 1 ? 'Add a New Bike Model' : activeSystem;
    const cardDescription = step === 1 
      ? 'Fill out the form below to add a new bike to the central database.'
      : `Add components for the ${activeSystem.toLowerCase()} system.`;

    const isLastSystem = systemIndex === wizardSystems.length - 1;
    
    const renderChainringInputs = () => {
        if (!frontMechType || cranksetIndex === -1) return null;
        
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
                                  <FormItem className="md:col-span-1 flex flex-col justify-end">
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
                                              <Input placeholder="e.g., Tarmac SL7" {...field} />
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
                                              <Input type="number" placeholder="e.g., 2023" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                          <FormField
                            control={form.control}
                            name="isEbike"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>E-Bike</FormLabel>
                                  <FormDescription>
                                    Does this model have a motor and battery?
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
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
                              name={`components.${framesetIndex}.series`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Series</FormLabel>
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
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
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
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
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
                                        <FormField name={`components.${cranksetIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cranksetIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        {renderChainringInputs()}
                                    </CardContent>
                                </Card>
                            )}

                             {bottomBracketIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Bottom Bracket</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${bottomBracketIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${bottomBracketIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., DUB" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${bottomBracketIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                            
                            {frontDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">{frontMechType === '1x' ? 'Chain Guide / Front Derailleur' : 'Front Derailleur'}</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontDerailleurIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                             {rearDerailleurIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Rear Derailleur</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearDerailleurIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearDerailleurIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearDerailleurIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {cassetteIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Cassette</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${cassetteIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cassetteIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED XG-1290" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${cassetteIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                                              value={field.value}
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
                                                  value={field.value || ''}
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
                                          name={`components.${frontShifterIndex}.series`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Series</FormLabel>
                                              <FormControl>
                                                <Input
                                                  placeholder="e.g., RED eTap AXS"
                                                  {...field}
                                                  value={field.value || ''}
                                                  onChange={(e) => {
                                                    field.onChange(e);
                                                    form.setValue(`components.${rearShifterIndex}.series`, e.target.value);
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
                                                  placeholder="Optional"
                                                  {...field}
                                                  value={field.value || ''}
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
                                      </div>
                                    )}

                                    {shifterSetType === 'unmatched' && (
                                      <div className="space-y-4">
                                        <h4 className="font-semibold text-sm">Front Shifter</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                          <FormField name={`components.${frontShifterIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${frontShifterIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${frontShifterIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <h4 className="font-semibold text-sm mt-4">Rear Shifter</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                          <FormField name={`components.${rearShifterIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${rearShifterIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField name={`components.${rearShifterIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                                        <FormField name={`components.${chainIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED Flat-Top" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.links`} render={({ field }) => (<FormItem><FormLabel>Links</FormLabel><FormControl><Input placeholder="e.g., 114" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${chainIndex}.tensioner`} render={({ field }) => (<FormItem><FormLabel>Tensioner</FormLabel><FormControl><Input placeholder="N/A" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      )}

                      {step === 2 && activeSystem === 'Brakes' && (
                        <div className="space-y-6">
                            {DROP_BAR_BIKE_TYPES.includes(bikeDetails.type as any) && fields[frontShifterIndex] && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Brake Levers</CardTitle></CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Brake levers are integrated with the shifters for this bike type.
                                        </p>
                                        <p className="font-medium mt-1">
                                            {fields[frontShifterIndex].brand} {fields[frontShifterIndex].series}
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
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
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
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontBrakeIndex}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearBrakeIndex}.pads`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {brakeSetType === 'unmatched' && frontBrakeIndex !== -1 && rearBrakeIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Brake</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${frontBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontBrakeIndex}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Brake</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${rearBrakeIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearBrakeIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearBrakeIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
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
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRotorIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRotorIndex}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {rotorSetType === 'unmatched' && frontRotorIndex !== -1 && rearRotorIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rotor</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRotorIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rotor</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearRotorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRotorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL800" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRotorIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 140mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
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
                                        <FormField name={`components.${forkIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Fox" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${forkIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 36 Factory" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${forkIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}

                            {suspensionType === 'full' && rearShockIndex !== -1 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Rear Shock</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearShockIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Fox" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearShockIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Float X2" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearShockIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                      )}
                      
                      {step === 2 && activeSystem === 'E-Bike' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Motor</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name={`components.${motorIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Bosch" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`components.${motorIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Performance Line CX" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`components.${motorIndex}.power`} render={({ field }) => (<FormItem><FormLabel>Power</FormLabel><FormControl><Input placeholder="e.g., 250W" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Battery</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name={`components.${batteryIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Bosch" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`components.${batteryIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., PowerTube" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`components.${batteryIndex}.capacity`} render={({ field }) => (<FormItem><FormLabel>Capacity</FormLabel><FormControl><Input placeholder="e.g., 750Wh" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Display</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name={`components.${displayIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Bosch" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`components.${displayIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Kiox 300" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </Card>
                        </div>
                      )}

                      {step === 2 && activeSystem === 'Wheelset' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Hubs</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <h4 className="font-semibold text-sm">Front Hub</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontHubIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontHubIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontHubIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <h4 className="font-semibold text-sm mt-4">Rear Hub</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearHubIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearHubIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearHubIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Rims</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="rimSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {rimSetType === 'matched' && frontRimIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${frontRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRimIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearRimIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {rimSetType === 'unmatched' && frontRimIndex !== -1 && rearRimIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rim</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRimIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 303 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rim</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearRimIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRimIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearRimIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Tires</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="tireSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {tireSetType === 'matched' && frontTireIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${frontTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${frontTireIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${rearTireIndex}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                    {tireSetType === 'unmatched' && frontTireIndex !== -1 && rearTireIndex !== -1 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Tire</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${frontTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${frontTireIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Tire</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${rearTireIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearTireIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000 S" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${rearTireIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Tire Setup</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="wheelsetSetup" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Setup</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubes" /></FormControl><FormLabel className="font-normal">Tubes</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubeless" /></FormControl><FormLabel className="font-normal">Tubeless</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                    {wheelsetSetup === 'tubeless' && valvesIndex !== -1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${valvesIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Valve Brand</FormLabel><FormControl><Input placeholder="e.g., Muc-Off" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${valvesIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Valve Series</FormLabel><FormControl><Input placeholder="e.g., V2 Tubeless Valves" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${valvesIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Skewers / Thru-Axles</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <h4 className="font-semibold text-sm">Front Skewer/Axle</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${frontSkewerIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontSkewerIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${frontSkewerIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <h4 className="font-semibold text-sm mt-4">Rear Skewer/Axle</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${rearSkewerIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearSkewerIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${rearSkewerIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                              <FormField name={`components.${handlebarIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${handlebarIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${handlebarIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Stem</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${stemIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${stemIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${stemIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Seatpost</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${seatpostIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostIndex}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 27.2mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Headset</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${headsetIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${headsetIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${headsetIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Saddle</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${saddleIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${saddleIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${saddleIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                           <Card>
                            <CardHeader><CardTitle className="text-lg">Grips / Bar Tape</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${gripsIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${gripsIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${gripsIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader><CardTitle className="text-lg">Seatpost Clamp</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField name={`components.${seatpostClampIndex}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostClampIndex}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`components.${seatpostClampIndex}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
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


export default function AddBikeModelPage() {
    return (
        <AddBikeModelFormComponent />
    )
}
