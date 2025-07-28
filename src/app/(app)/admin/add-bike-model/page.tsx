
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { writeBatch, doc, collection, getDocs, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { BIKE_TYPES, DROP_BAR_BIKE_TYPES, BASE_COMPONENTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';
import { indexComponentFlow } from '@/ai/flows/index-components';

const componentSchema = z.object({
  id: z.string().optional(), // Used to track fields in the array
  name: z.string().min(1, 'Component name is required.'),
  brand: z.string().optional(),
  series: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  sizeVariants: z.string().optional(), // Now storing as a string
  system: z.string().min(1, 'System is required.'),
  chainring1: z.string().optional(),
  chainring2: z.string().optional(),
  chainring3: z.string().optional(),
  links: z.string().optional(),
  tensioner: z.string().optional(),
  pads: z.string().optional(),
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

const createComponentId = (component: Partial<z.infer<typeof componentSchema>>) => {
    const idString = [component.brand, component.name, component.model]
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

const mapAiDataToFormValues = (data: ExtractBikeDetailsOutput): AddBikeModelFormValues => {
    return {
        brand: data.brand || '',
        model: data.model || '',
        modelYear: data.modelYear || new Date().getFullYear(),
        type: '', 
        isEbike: !!data.components.find(c => c.system === 'E-Bike'),
        components: data.components.map(c => ({
            name: c.name,
            brand: c.brand || '',
            series: c.series || '',
            model: c.model || '',
            size: c.size || '',
            sizeVariants: c.sizeVariants,
            system: c.system,
            chainring1: c.chainring1,
            chainring2: c.chainring2,
            chainring3: c.chainring3,
        })),
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

function AddBikeModelFormComponent() {
    const { toast } = useToast();
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
            components: BASE_COMPONENTS,
            shifterSetType: 'matched',
            brakeSetType: 'matched',
            rotorSetType: 'matched',
            suspensionType: 'none',
            rimSetType: 'matched',
            tireSetType: 'matched',
            wheelsetSetup: 'tubes',
        },
    });
    
    const { fields, update } = useFieldArray({
      control: form.control,
      name: "components"
    });

    const isEbike = form.watch('isEbike');
    const frontMechType = form.watch('frontMech');
    const shifterSetType = form.watch('shifterSetType');
    const brakeSetType = form.watch('brakeSetType');
    const rotorSetType = form.watch('rotorSetType');
    const suspensionType = form.watch('suspensionType');
    const rimSetType = form.watch('rimSetType');
    const tireSetType = form.watch('tireSetType');
    const wheelsetSetup = form.watch('wheelsetSetup');
    const bikeType = form.watch('type');

    useEffect(() => {
      async function fetchBrands() {
        try {
          const querySnapshot = await getDocs(collection(db, "bikeModels"));
          const brands = new Set<string>();
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.brand) brands.add(data.brand);
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
                
                const mergedComponents = BASE_COMPONENTS.map(baseComp => {
                    const foundComp = formValues.components.find(aiComp => aiComp.name.toLowerCase() === baseComp.name.toLowerCase());
                    return foundComp ? { ...baseComp, ...foundComp } : baseComp;
                });

                form.reset({
                  ...formValues,
                  components: mergedComponents,
                });
                toast({ title: "Data Imported!", description: "The form has been pre-filled with the extracted data." });
            } catch (e) {
                console.error("Failed to parse imported data", e);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read the data from the import page.' });
            } finally {
                sessionStorage.removeItem('importedBikeData');
                sessionStorage.removeItem('rawBikeData'); // Clean up raw text too
            }
        }
    }, [form, toast]);

    const getComponentIndex = (name: string) => fields.findIndex(f => f.name === name);

    async function onSubmit(values: AddBikeModelFormValues) {
        setIsSubmitting(true);
        
        try {
            const componentProcessingPromises: Promise<void>[] = [];
            const componentReferences: string[] = [];

            for (const originalComponent of values.components) {
                const componentToSave: { [key: string]: any } = {};
                Object.keys(originalComponent).forEach((key: any) => {
                    const typedKey = key as keyof typeof originalComponent;
                    const value = originalComponent[typedKey];
                    if (value !== undefined && value !== null && value !== '' && key !== 'id') {
                        componentToSave[key] = value;
                    }
                });
                
                if (Object.keys(componentToSave).length <= 2) continue;
                if (!componentToSave.brand && !componentToSave.series && !componentToSave.model) continue;

                if (componentToSave.brand && componentToSave.brand.toLowerCase() === 'sram') {
                    componentToSave.brand = 'SRAM';
                }

                const componentId = createComponentId(componentToSave as Partial<z.infer<typeof componentSchema>>);
                if (!componentId) continue;
                
                componentToSave.id = componentId;

                // Call the indexComponentFlow for each component
                componentProcessingPromises.push(indexComponentFlow(componentToSave));
                componentReferences.push(`masterComponents/${componentId}`);
            }

            // Wait for all component indexing to complete
            await Promise.all(componentProcessingPromises);

            // Now, save the bike model document
            const bikeModelId = createBikeModelId(values);
            const bikeModelDocRef = doc(db, 'bikeModels', bikeModelId);
            
            const { components, ...bikeModelData } = values;
            const bikeModelDataToSave: { [key: string]: any } = {};
             Object.keys(bikeModelData).forEach((key: any) => {
                const typedKey = key as keyof typeof bikeModelData;
                const value = bikeModelData[typedKey];
                if (value !== undefined && value !== null && value !== '') {
                    bikeModelDataToSave[key] = value;
                }
            });

            if (bikeModelDataToSave.brand && bikeModelDataToSave.brand.toLowerCase() === 'sram') {
                bikeModelDataToSave.brand = 'SRAM';
            }

            await setDoc(bikeModelDocRef, {
                ...bikeModelDataToSave,
                components: componentReferences,
                imageUrl: `https://placehold.co/600x400.png`
            });
            
            toast({
                title: 'Bike Model Saved!',
                description: `${values.brand} ${values.model} (${values.modelYear}) has been added to the database.`,
            });
            
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
    
    const renderChainringInputs = (cranksetIndex: number) => {
        if (!frontMechType || cranksetIndex === -1) return null;
        const numRings = parseInt(frontMechType.charAt(0));
        return Array.from({ length: numRings }, (_, i) => i + 1).map(ringNum => (
            <FormField
                key={`chainring${ringNum}`}
                control={form.control}
                name={`components.${cranksetIndex}.chainring${ringNum}` as any}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ring {ringNum} (teeth)</FormLabel>
                        <FormControl><Input placeholder="e.g., 50" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        ));
    };

    const renderComponentFields = (name: string, fieldsToRender: ('brand' | 'series' | 'model' | 'size' | 'pads' | 'links' | 'tensioner' | 'power' | 'capacity')[]) => {
        const index = getComponentIndex(name);
        if (index === -1) return null;

        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">{name}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fieldsToRender.map(fieldName => (
                        <FormField
                            key={`${name}-${fieldName}`}
                            control={form.control}
                            name={`components.${index}.${fieldName}` as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="capitalize">{fieldName}</FormLabel>
                                    <FormControl><Input placeholder={`e.g., ${fieldName === 'brand' ? 'SRAM' : ''}`} {...field} value={field.value || ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="max-w-6xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Add a New Bike Model</CardTitle>
                        <CardDescription>Fill out the form below to add a new bike to the central database. Use the accordions to navigate between component systems.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-lg space-y-6">
                            <h3 className="text-lg font-semibold">Primary Bike Details</h3>
                             <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Bike Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a bike type" /></SelectTrigger></FormControl><SelectContent>{BIKE_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="brand" render={({ field }) => ( <FormItem className="flex flex-col justify-end"><FormLabel>Brand</FormLabel><Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between",!field.value && "text-muted-foreground")}>{field.value || "Select or create brand"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent side="bottom" align="start" className="w-[--radix-popover-trigger-width] p-0" avoidCollisions={false}><Command><CommandInput placeholder="Search brand..." /><CommandEmpty>No brand found.</CommandEmpty><CommandList><CommandGroup>{availableBrands.map((brand) => (<CommandItem value={brand} key={brand} onSelect={() => {form.setValue("brand", brand); setBrandPopoverOpen(false);}}><Check className={cn("mr-2 h-4 w-4", brand === field.value ? "opacity-100" : "opacity-0")}/>{brand}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Tarmac SL7" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="modelYear" render={({ field }) => (<FormItem><FormLabel>Model Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2023" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                             <FormField control={form.control} name="isEbike" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>E-Bike</FormLabel><FormDescription>Does this model have a motor and battery?</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)}/>
                        </div>
                        
                        <Accordion type="multiple" className="w-full space-y-4">
                            {/* Frameset Section */}
                            <AccordionItem value="frameset" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Frameset</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderComponentFields('Frame', ['brand', 'series', 'model'])}
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Drivetrain Section */}
                            <AccordionItem value="drivetrain" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Drivetrain</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    <Card className="p-4 bg-muted/30"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="frontMech" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Front Mech</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="1x" /></FormControl><FormLabel className="font-normal">1x</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="2x" /></FormControl><FormLabel className="font-normal">2x</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="3x" /></FormControl><FormLabel className="font-normal">3x</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="rearMech" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Rear Mech</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="9" /></FormControl><FormLabel className="font-normal">9</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="10" /></FormControl><FormLabel className="font-normal">10</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="11" /></FormControl><FormLabel className="font-normal">11</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="12" /></FormControl><FormLabel className="font-normal">12</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                    </div></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Crankset</CardTitle></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField name={`components.${getComponentIndex('Crankset')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Crankset')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Crankset')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        {renderChainringInputs(getComponentIndex('Crankset'))}
                                    </CardContent></Card>
                                    {renderComponentFields('Bottom Bracket', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Front Derailleur', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Rear Derailleur', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Cassette', ['brand', 'series', 'model'])}
                                    <Card><CardHeader><CardTitle className="text-lg">Shifters</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="shifterSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {shifterSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Shifter')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>)}
                                        {shifterSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Shifter</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Shifter</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., SRAM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., RED eTap AXS" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Shifter')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    {renderComponentFields('Chain', ['brand', 'series', 'model', 'links', 'tensioner'])}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Brakes Section */}
                             <AccordionItem value="brakes" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Brakes</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    {DROP_BAR_BIKE_TYPES.includes(bikeType as any) && fields[getComponentIndex('Front Shifter')] && (<Card><CardHeader><CardTitle className="text-lg">Brake Levers</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Brake levers are integrated with the shifters for this bike type.</p><p className="font-medium mt-1">{fields[getComponentIndex('Front Shifter')].brand} {fields[getComponentIndex('Front Shifter')].series}</p></CardContent></Card>)}
                                    <Card><CardHeader><CardTitle className="text-lg">Brake Calipers</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="brakeSetType" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {brakeSetType === 'matched' && getComponentIndex('Front Brake') !== -1 && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Brake')}.pads`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {brakeSetType === 'unmatched' && getComponentIndex('Front Brake') !== -1 && getComponentIndex('Rear Brake') !== -1 && (<div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Brake</h4><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Brake</h4><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Dura-Ace R9270" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Brake')}.pads`} render={({ field }) => (<FormItem><FormLabel>Brake Pad Model</FormLabel><FormControl><Input placeholder="e.g., L05A-RF" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div></div>
                                        )}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Brake Rotors</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="rotorSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {rotorSetType === 'matched' && getComponentIndex('Front Rotor') !== -1 && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rotor')}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {rotorSetType === 'unmatched' && getComponentIndex('Front Rotor') !== -1 && getComponentIndex('Rear Rotor') !== -1 && (<div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Front Rotor</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL900" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Front Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 160mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <h4 className="font-semibold text-sm mt-4">Rear Rotor</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Shimano" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., RT-CL800" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField name={`components.${getComponentIndex('Rear Rotor')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 140mm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            </div></div>
                                        )}
                                    </CardContent></Card>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Suspension Section */}
                             <AccordionItem value="suspension" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Suspension</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    <Card className="p-4"><FormField control={form.control} name="suspensionType" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Suspension Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><FormLabel className="font-normal">No Suspension</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="front" /></FormControl><FormLabel className="font-normal">Front Suspension</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="full" /></FormControl><FormLabel className="font-normal">Full Suspension</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                    </Card>
                                    {(suspensionType === 'front' || suspensionType === 'full') && renderComponentFields('Fork', ['brand', 'series', 'model'])}
                                    {suspensionType === 'full' && renderComponentFields('Rear Shock', ['brand', 'series', 'model'])}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Wheelset Section */}
                            <AccordionItem value="wheelset" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Wheelset</AccordionTrigger>
                                <AccordionContent className="space-y-6 pt-4">
                                    <Card><CardHeader><CardTitle className="text-lg">Hubs</CardTitle></CardHeader><CardContent className="space-y-4"><h4 className="font-semibold text-sm">Front Hub</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Hub')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div><h4 className="font-semibold text-sm mt-4">Rear Hub</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., DT Swiss" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 240" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Hub')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div></CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Rims</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="rimSetType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {rimSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.series`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Rim')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {rimSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Rim</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 303 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Rim</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., 404 Firecrest" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Rim')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Tires</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="tireSetType" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Configuration</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="matched" /></FormControl><FormLabel className="font-normal">Matched Set</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="unmatched" /></FormControl><FormLabel className="font-normal">Unmatched Set</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {tireSetType === 'matched' && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.brand`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.model`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`components.${getComponentIndex('Front Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); form.setValue(`components.${getComponentIndex('Rear Tire')}.size`, e.target.value); }} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>)}
                                        {tireSetType === 'unmatched' && (<div className="space-y-4"><h4 className="font-semibold text-sm">Front Tire</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Front Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div><h4 className="font-semibold text-sm mt-4">Rear Tire</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Continental" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., Grand Prix 5000 S" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField name={`components.${getComponentIndex('Rear Tire')}.size`} render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., 700x28c" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div></div>)}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Tire Setup</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="wheelsetSetup" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Setup</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubes" /></FormControl><FormLabel className="font-normal">Tubes</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="tubeless" /></FormControl><FormLabel className="font-normal">Tubeless</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)}/>
                                        {wheelsetSetup === 'tubeless' && renderComponentFields('Valves', ['brand', 'series', 'model'])}
                                    </CardContent></Card>
                                    <Card><CardHeader><CardTitle className="text-lg">Skewers / Thru-Axles</CardTitle></CardHeader><CardContent className="space-y-4"><h4 className="font-semibold text-sm">Front Skewer/Axle</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Front Skewer')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div><h4 className="font-semibold text-sm mt-4">Rear Skewer/Axle</h4><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.brand`} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Maxle" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.series`} render={({ field }) => (<FormItem><FormLabel>Series</FormLabel><FormControl><Input placeholder="e.g., Stealth" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name={`components.${getComponentIndex('Rear Skewer')}.model`} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Optional" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div></CardContent></Card>
                                </AccordionContent>
                            </AccordionItem>

                             {/* Cockpit Section */}
                            <AccordionItem value="cockpit" className="border rounded-lg px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Cockpit</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderComponentFields('Handlebar', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Stem', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Seatpost', ['brand', 'model', 'size'])}
                                    {renderComponentFields('Headset', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Saddle', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Grips', ['brand', 'series', 'model'])}
                                    {renderComponentFields('Seatpost Clamp', ['brand', 'series', 'model'])}
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* E-Bike Section */}
                            {isEbike && (
                                <AccordionItem value="ebike" className="border rounded-lg px-4">
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">E-Bike System</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-4">
                                        {renderComponentFields('Motor', ['brand', 'model', 'power'])}
                                        {renderComponentFields('Battery', ['brand', 'model', 'capacity'])}
                                        {renderComponentFields('Display', ['brand', 'model'])}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/admin">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Bike Model
                        </Button>
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
