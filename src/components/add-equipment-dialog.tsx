
'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Equipment } from '@/lib/types';
import { bikeDatabase, type BikeFromDB } from '@/lib/bike-database';

const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Nickname is required.' }),
  bikeIdentifier: z.string().min(1, { message: 'Please select a bike.' }),
  purchaseDate: z.date({
    required_error: 'A purchase date is required.',
  }),
  purchasePrice: z.coerce.number().min(0, { message: 'Price cannot be negative.' }),
  serialNumber: z.string().optional(),
});

type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

export interface NewEquipmentFormSubmitData extends EquipmentFormValues {
    purchaseDate: string;
}

interface AddEquipmentDialogProps {
  onAddEquipment: (equipment: NewEquipmentFormSubmitData) => Promise<void>;
}

const bikeBrands = [...new Set(bikeDatabase.map(bike => bike.brand))];

export function AddEquipmentDialog({ onAddEquipment }: AddEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      bikeIdentifier: '',
      purchasePrice: 0,
      serialNumber: '',
    },
  });

  const selectedBikeIdentifier = useWatch({
      control: form.control,
      name: 'bikeIdentifier'
  });
  
  const [selectedBrand, setSelectedBrand] = useState('');

  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    return bikeDatabase.filter(bike => bike.brand === selectedBrand);
  }, [selectedBrand]);
  
  const selectedBike = useMemo(() => {
    if (!selectedBikeIdentifier) return null;
    const [brand, model, year] = selectedBikeIdentifier.split('|');
    return bikeDatabase.find(b => b.brand === brand && b.model === model && b.modelYear === parseInt(year));
  }, [selectedBikeIdentifier]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setSelectedBrand('');
    }
  };

  async function onSubmit(data: EquipmentFormValues) {
    setIsSubmitting(true);
    try {
        const newEquipmentData = {
            ...data,
            purchaseDate: data.purchaseDate.toISOString(),
        };
        await onAddEquipment(newEquipmentData);
        toast({
            title: 'Equipment Added!',
            description: `${data.name} has been added to your inventory.`,
        });
        handleOpenChange(false);
    } catch (error) {
        console.error("Error adding equipment:", error);
        toast({
            variant: "destructive",
            title: "Failed to Add Equipment",
            description: "There was an issue adding the equipment. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Select a bike from our database and give it a nickname.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                   <Select onValueChange={(brand) => {
                       setSelectedBrand(brand);
                       form.setValue('bikeIdentifier', '');
                   }}>
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
                </FormItem>
                <FormField
                  control={form.control}
                  name="bikeIdentifier"
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
                            <SelectItem key={`${bike.brand}-${bike.model}`} value={`${bike.brand}|${bike.model}|${bike.modelYear}`}>
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
            
            {selectedBike && (
                <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-semibold">{selectedBike.brand} {selectedBike.model}</p>
                    <p className="text-xs text-muted-foreground">{selectedBike.type} &bull; {selectedBike.modelYear}</p>
                </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My trusty steed" {...field} />
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
                     <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
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
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                      <Input type="number" placeholder="e.g., 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !selectedBike}>
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
