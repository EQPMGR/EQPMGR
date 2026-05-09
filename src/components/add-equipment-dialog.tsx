
'use client';

import { useState, useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { fetchAllDocsPaginated } from '@/backend/dbPagination';
import { CalendarIcon, Loader2, Bike, FileInput, FilePlus } from 'lucide-react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDb } from '@/backend';
import type { Equipment } from '@/lib/types';
import { Separator } from './ui/separator';


const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Nickname is required.' }),
  bikeIdentifier: z.string().min(1, { message: 'Please select a bike.' }),
  purchaseDate: z.date({
    required_error: 'A purchase date is required.',
  }),
  purchasePrice: z.coerce.number().min(0, { message: 'Price cannot be negative.' }),
  serialNumber: z.string().optional(),
  frameSize: z.string().optional(),
  purchaseCondition: z.enum(['new', 'used']),
  estimatedMileage: z.coerce.number().min(0, { message: 'Mileage must be a positive number.' }).optional(),
});


export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

interface BikeModelOption {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
}

interface AddEquipmentDialogProps {
  onAddEquipment: (equipment: EquipmentFormValues) => Promise<void>;
}

export function AddEquipmentDialog({ onAddEquipment }: AddEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [bikeBrands, setBikeBrands] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<BikeModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      bikeIdentifier: '',
      purchaseDate: new Date(),
      purchasePrice: 0,
      serialNumber: '',
      frameSize: '',
      purchaseCondition: 'new',
    },
  });

  const selectedBrand = useWatch({
      control: form.control,
      name: 'brand'
  });
  
  const purchaseCondition = useWatch({ control: form.control, name: 'purchaseCondition' });
  const purchaseDate = useWatch({ control: form.control, name: 'purchaseDate' });

  const showEstimatedMileage = useMemo(() => {
    if (purchaseCondition === 'used') return true;
    if (purchaseDate && purchaseDate < subDays(new Date(), 7)) return true;
    return false;
  }, [purchaseCondition, purchaseDate]);

  useEffect(() => {
    async function fetchBikeBrands() {
      if (!open) return;
      setIsLoadingModels(true);
      try {
        const database = await getDb();
        const docs = await fetchAllDocsPaginated<{ brand: string; model: string; modelYear: number }>(
          database,
          'bikeModels',
          500,
          'brand'
        );

        const brands = [...new Set(docs.map((doc) => doc.data.brand).filter(Boolean))].sort();
        setBikeBrands(brands);
      } catch (error) {
        console.error('Error fetching bike models:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load bike models from the database.',
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchBikeBrands();
  }, [open, toast]);

  useEffect(() => {
    async function fetchModelsForBrand() {
      if (!selectedBrand) {
        setModelOptions([]);
        return;
      }
      setIsLoadingModels(true);
      try {
        const database = await getDb();
        const querySnapshot = await database.getDocs<BikeModelOption>(
          'bikeModels',
          { type: 'where', field: 'brand', op: '==', value: selectedBrand },
          { type: 'orderBy', field: 'model', direction: 'asc' },
          { type: 'limit', value: 500 }
        );

        setModelOptions(querySnapshot.docs.map((doc) => ({
          id: doc.id,
          brand: doc.data.brand,
          model: doc.data.model,
          modelYear: doc.data.modelYear,
        })));
      } catch (error) {
        console.error('Error fetching bike models for brand:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load bike models for the selected brand.',
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchModelsForBrand();
  }, [selectedBrand, open, toast]);

  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    return modelOptions;
  }, [selectedBrand, modelOptions]);
  

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  async function onSubmit(data: EquipmentFormValues) {
    setIsSubmitting(true);
    try {
        await onAddEquipment(data);
        toast({
            title: 'Bike Added!',
            description: `${data.name} has been added to your inventory.`,
        });
        handleOpenChange(false);
    } catch (error) {
        // The error toast is handled in the onAddEquipment function itself
    } finally {
        setIsSubmitting(false);
    }
  }

  const CalendarControl = ({field}: {field: any}) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    
    const CalendarButton = (
      <Button
        variant={"outline"}
        className={cn(
          "w-full pl-3 text-left font-normal",
          !field.value && "text-muted-foreground"
        )}
      >
        {field.value ? (
          format(field.value, "PPP")
        ) : (
          <span>Pick a date</span>
        )}
        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
      </Button>
    )

    const CalendarComponent = (
       <Calendar
        mode="single"
        captionLayout="dropdown-buttons"
        fromYear={1980}
        toYear={new Date().getFullYear()}
        fixedWeeks
        selected={field.value}
        onSelect={(date) => {
          if(date) field.onChange(date);
          setIsCalendarOpen(false);
        }}
        disabled={(date) =>
          date > new Date() || date < new Date("1900-01-01")
        }
        initialFocus
      />
    );
    
    if (isMobile) {
      return (
        <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <DialogTrigger asChild>
            <FormControl>{CalendarButton}</FormControl>
          </DialogTrigger>
          <DialogContent className="w-auto p-0">
            <DialogTitle className="sr-only">Select date</DialogTitle>
            {CalendarComponent}
          </DialogContent>
        </Dialog>
      );
    }
    
    return (
       <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <FormControl>{CalendarButton}</FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {CalendarComponent}
          </PopoverContent>
        </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Bike className="mr-2 h-4 w-4" />
          Add Bike
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Bike</DialogTitle>
          <DialogDescription>
            Select a bike from our database and give it a nickname.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                       <Select 
                        onValueChange={(brand) => {
                           field.onChange(brand);
                           form.setValue('bikeIdentifier', '');
                        }}
                        value={field.value}
                        disabled={isLoadingModels}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingModels ? "Loading..." : "Select a brand"} />
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
                  name="bikeIdentifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedBrand || isLoadingModels}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingModels ? "Loading..." : "Select a model"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableModels.map(bike => (
                            <SelectItem key={bike.id} value={bike.id}>
                                {bike.model} ({bike.modelYear})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <div className="pt-4 space-y-2">
                <Separator />
                <p className="text-sm text-center text-muted-foreground">Can't find your bike?</p>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" asChild>
                        <Link href="/admin/import-text"><FileInput className="mr-2 h-4 w-4" /> Import from Text</Link>
                    </Button>
                     <Button type="button" variant="outline" className="w-full" asChild>
                        <Link href="/admin/add-bike-model"><FilePlus className="mr-2 h-4 w-4" /> Add Manually</Link>
                    </Button>
                </div>
                <Separator />
            </div>


            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My trusty steed" value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="purchaseCondition"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Condition</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="new" />
                        </FormControl>
                        <FormLabel className="font-normal">New</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="used" />
                        </FormControl>
                        <FormLabel className="font-normal">Used</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <CalendarControl field={field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {showEstimatedMileage && (
              <FormField
                control={form.control}
                name="estimatedMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Current Mileage (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 1500"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="frameSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frame Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 56cm or Large" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 -mb-6 pb-6">
              <Button type="submit" disabled={isSubmitting || form.getValues('bikeIdentifier') === ''}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Equipment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
