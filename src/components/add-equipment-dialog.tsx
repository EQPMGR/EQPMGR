'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, PlusCircle, Camera as CameraIcon } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

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
import { CameraCapture } from './camera-capture';

const equipmentFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  type: z.enum(['Road Bike', 'Mountain Bike', 'Running Shoes', 'Other']),
  brand: z.string().min(2, { message: 'Brand is required.' }),
  model: z.string().min(2, { message: 'Model is required.' }),
  purchaseDate: z.date({
    required_error: 'A purchase date is required.',
  }),
});

type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

interface AddEquipmentDialogProps {
  onAddEquipment: (equipment: Omit<Equipment, 'id' | 'components' | 'maintenanceLog' | 'totalDistance' | 'totalHours'> & { purchaseDate: string }) => void;
}

export function AddEquipmentDialog({ onAddEquipment }: AddEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      type: 'Road Bike',
      brand: '',
      model: '',
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setImageUrl(null);
    }
  };

  function onSubmit(data: EquipmentFormValues) {
    const newEquipmentData = {
      ...data,
      purchaseDate: data.purchaseDate.toISOString(),
      imageUrl: imageUrl || 'https://placehold.co/600x400.png',
    };
    onAddEquipment(newEquipmentData);
    toast({
      title: 'Equipment Added!',
      description: `${data.name} has been added to your inventory.`,
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Enter the details of your new gear. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormItem>
                <FormLabel>Equipment Photo</FormLabel>
                <div className="w-full aspect-video rounded-md bg-muted flex items-center justify-center relative overflow-hidden">
                    {imageUrl ? (
                        <Image src={imageUrl} alt="Equipment preview" layout="fill" objectFit="cover" />
                    ) : (
                        <CameraIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                </div>
                <CameraCapture onCapture={setImageUrl}>
                    <Button type="button" variant="outline" className="w-full mt-2">
                        <CameraIcon className="mr-2" />
                        Take Photo
                    </Button>
                </CameraCapture>
            </FormItem>
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
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Specialized" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tarmac SL7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Road Bike">Road Bike</SelectItem>
                        <SelectItem value="Mountain Bike">Mountain Bike</SelectItem>
                        <SelectItem value="Running Shoes">Running Shoes</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
             <DialogFooter>
              <Button type="submit">Save Equipment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
