
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Equipment } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';


const editEquipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Nickname is required.' }),
  purchaseDate: z.date({
    required_error: 'A purchase date is required.',
  }),
  purchasePrice: z.coerce.number().min(0, { message: 'Price cannot be negative.' }),
  serialNumber: z.string().optional(),
  purchaseCondition: z.enum(['new', 'used']),
}).refine(data => !data.serialNumber || data.serialNumber.length === 0 || data.serialNumber.length >= 3, {
  message: "Serial number must be at least 3 characters.",
  path: ["serialNumber"],
});

type EditEquipmentFormValues = z.infer<typeof editEquipmentFormSchema>;

export interface UpdateEquipmentData extends Omit<EditEquipmentFormValues, 'serialNumber'> {
    serialNumber?: string;
}

interface EditEquipmentDialogProps {
  equipment: Equipment;
  onUpdateEquipment: (equipment: UpdateEquipmentData) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
}

export function EditEquipmentDialog({ equipment, onUpdateEquipment, onOpenChange }: EditEquipmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const form = useForm<EditEquipmentFormValues>({
    resolver: zodResolver(editEquipmentFormSchema),
    // Use useEffect to reset the form when the equipment prop changes.
  });

  useEffect(() => {
    form.reset({
      name: equipment.name,
      purchaseCondition: equipment.purchaseCondition,
      purchaseDate: equipment.purchaseDate,
      purchasePrice: equipment.purchasePrice,
      serialNumber: equipment.serialNumber || '',
    });
  }, [equipment, form]);

  async function onSubmit(data: EditEquipmentFormValues) {
    setIsSubmitting(true);
    try {
        const updateData: UpdateEquipmentData = {
            ...data,
            serialNumber: data.serialNumber || undefined,
        };
        await onUpdateEquipment(updateData);
        toast({
            title: 'Equipment Updated!',
            description: `${data.name} has been updated.`,
        });
        onOpenChange?.(false);
    } catch (error) {
        console.error("Error updating equipment:", error);
        toast({
            variant: "destructive",
            title: "Failed to Update Equipment",
            description: "There was an issue updating the equipment. Please try again.",
        });
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
          if (date) field.onChange(date);
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
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <FormControl>{CalendarButton}</FormControl>
          </PopoverTrigger>
          <DialogContent className="w-auto p-0">
            {CalendarComponent}
          </DialogContent>
        </Popover>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>
            Update the details for your equipment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
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
            
            <FormField
              control={form.control}
              name="purchaseCondition"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Condition</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
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
             <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 -mb-6 pb-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
  );
}
