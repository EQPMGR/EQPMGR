

'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Wrench } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MaintenanceLog } from '@/lib/types';
import { Textarea } from './ui/textarea';

const maintenanceLogSchema = z.object({
  logType: z.enum(['service', 'repair', 'modification'], { required_error: 'Please select a log type.' }),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  cost: z.coerce.number().min(0, { message: 'Cost cannot be negative.' }).default(0),
  serviceType: z.enum(['diy', 'shop'], { required_error: 'Please select a service type.' }),
  serviceProvider: z.string().optional(),
  technician: z.string().optional(),
  componentReplaced: z.boolean().default(false),
  isOEM: z.boolean().optional(),
  replacementPart: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.serviceType === 'shop' && (!data.serviceProvider || data.serviceProvider.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Shop name is required',
      path: ['serviceProvider'],
    });
  }
  if (data.componentReplaced && data.isOEM === undefined) {
      ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify if the part was OEM or not.',
          path: ['isOEM'],
      });
  }
  if (data.componentReplaced && data.isOEM === false && (!data.replacementPart || data.replacementPart.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify the replacement part used.',
      path: ['replacementPart'],
    });
  }
});


type MaintenanceLogFormValues = z.infer<typeof maintenanceLogSchema>;

interface AddMaintenanceLogDialogProps {
  onAddLog: (log: Omit<MaintenanceLog, 'id'>) => void;
  children: React.ReactNode;
}

export function AddMaintenanceLogDialog({ onAddLog, children }: AddMaintenanceLogDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<MaintenanceLogFormValues>({
    resolver: zodResolver(maintenanceLogSchema),
    defaultValues: {
      logType: 'service',
      description: '',
      cost: 0,
      serviceType: 'diy',
      serviceProvider: '',
      technician: '',
      componentReplaced: false,
      notes: '',
    },
  });

  const serviceType = form.watch('serviceType');
  const componentReplaced = form.watch('componentReplaced');
  const isOEM = form.watch('isOEM');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  function onSubmit(data: MaintenanceLogFormValues) {
    const newLogData = {
      ...data,
      date: data.date,
    };
    onAddLog(newLogData);
    toast({
      title: 'Log Added!',
      description: 'The maintenance entry has been added.',
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Maintenance Log</DialogTitle>
          <DialogDescription>
            Enter the details of the service, repair, or modification.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
               <FormField
                control={form.control}
                name="logType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Log Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="service" />
                          </FormControl>
                          <FormLabel className="font-normal">Service</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="repair" />
                          </FormControl>
                          <FormLabel className="font-normal">Repair</FormLabel>
                        </FormItem>
                         <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="modification" />
                          </FormControl>
                          <FormLabel className="font-normal">Modification</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Full tune-up and cleaning" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Date</FormLabel>
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
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 75" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Service Provider</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="diy" />
                          </FormControl>
                          <FormLabel className="font-normal">DIY</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="shop" />
                          </FormControl>
                          <FormLabel className="font-normal">Shop</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serviceType === 'shop' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Local Bike Shop" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technician"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technician Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Alex Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="componentReplaced"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Component Replaced?</FormLabel>
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

              {componentReplaced && (
                <div className="pl-4 border-l-2 ml-2 space-y-4">
                  <FormField
                    control={form.control}
                    name="isOEM"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                         <FormLabel>Was it an original (OEM) part?</FormLabel>
                        <FormControl>
                          <RadioGroup
                             onValueChange={(value) => field.onChange(value === 'true')}
                             defaultValue={field.value === undefined ? undefined : String(field.value)}
                             className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="true" /></FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="false" /></FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isOEM === false && (
                    <FormField
                      control={form.control}
                      name="replacementPart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What part was used instead?</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., SRAM Eagle XX1 Chain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional notes about the service..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="submit">Save Log</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
