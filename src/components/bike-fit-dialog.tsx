
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const fitFormSchema = z.object({
  saddleHeight: z.number().optional(),
  saddleHeightOverBars: z.number().optional(),
  saddleToHandlebarReach: z.number().optional(),
  saddleAngle: z.number().optional(),
  saddleForeAft: z.number().optional(),
  saddleBrandModel: z.string().optional(),
  stemLength: z.number().optional(),
  stemAngle: z.number().optional(),
  handlebarBrandModel: z.string().optional(),
  handlebarWidth: z.number().optional(),
  handlebarAngle: z.number().optional(),
  handlebarExtension: z.number().optional(),
  brakeLeverPosition: z.string().optional(),
  crankLength: z.number().optional(),
  hasAeroBars: z.boolean().default(false),
  // Placeholder for aero bar fields
});

type FitFormValues = z.infer<typeof fitFormSchema>;

interface BikeFitDialogProps {
  children: React.ReactNode;
}

export function BikeFitDialog({ children }: BikeFitDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const { toast } = useToast();

  const form = useForm<FitFormValues>({
    resolver: zodResolver(fitFormSchema),
    defaultValues: {
      hasAeroBars: false,
    },
  });
  
  const hasAeroBars = form.watch('hasAeroBars');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const onSubmit = async (data: FitFormValues) => {
    setIsSaving(true);
    console.log("Saving bike fit data:", data);
    // In a real scenario, you'd save this data to Firestore
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: 'Bike Fit Saved!', description: 'Your measurements have been updated.' });
    setIsSaving(false);
    handleOpenChange(false);
  };
  
  const renderMeasurementField = (name: keyof FitFormValues, label: string, letter: string, unit: string) => (
     <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{letter}. {label} ({unit})</FormLabel>
            <FormControl>
              <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
            </FormControl>
          </FormItem>
        )}
      />
  );
  
  const renderTextField = (name: keyof FitFormValues, label: string, letter: string) => (
     <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{letter}. {label}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bike Fit Details</DialogTitle>
          <DialogDescription>
            Enter your bike fit measurements below. All measurements are from the center line unless otherwise specified.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto pr-2">
            <RadioGroup
                value={units}
                onValueChange={(value: 'metric' | 'imperial') => setUnits(value)}
                className="flex space-x-4"
              >
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><RadioGroupItem value="metric" /></FormControl>
                  <FormLabel className="font-normal">Metric (mm/deg)</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><RadioGroupItem value="imperial" /></FormControl>
                  <FormLabel className="font-normal">Imperial (in/deg)</FormLabel>
                </FormItem>
            </RadioGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Column 1: SVG and some fields */}
                <div className="space-y-4">
                    <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">SVG Placeholder</p>
                    </div>
                     {renderTextField('saddleBrandModel', 'Saddle Brand and Model', 'F')}
                     {renderTextField('handlebarBrandModel', 'Handlebar Brand and Model', 'I')}
                </div>

                {/* Column 2: The rest of the fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {renderMeasurementField('saddleHeight', 'Saddle Height', 'A', units === 'metric' ? 'mm' : 'in')}
                    {renderMeasurementField('saddleHeightOverBars', 'Saddle Height Over Bars', 'B', units === 'metric' ? 'mm' : 'in')}
                    {renderMeasurementField('saddleToHandlebarReach', 'Saddle to Handlebar Reach', 'C', units === 'metric' ? 'mm' : 'in')}
                    {renderMeasurementField('saddleAngle', 'Saddle Angle', 'D', 'deg')}
                    {renderMeasurementField('saddleForeAft', 'Saddle Fore-Aft', 'E', units === 'metric' ? 'mm' : 'in')}
                    {renderMeasurementField('stemLength', 'Stem Length', 'G', 'mm')}
                    {renderMeasurementField('stemAngle', 'Stem Angle', 'H', 'deg')}
                    {renderMeasurementField('handlebarWidth', 'Handlebar Width', 'J', units === 'metric' ? 'mm' : 'in')}
                    {renderMeasurementField('handlebarAngle', 'Handlebar Angle', 'K', 'deg')}
                    {renderMeasurementField('handlebarExtension', 'Handlebar Extension', 'L', 'mm')}
                    {renderTextField('brakeLeverPosition', 'Brake Lever Position', 'M')}
                    {renderMeasurementField('crankLength', 'Crank Length', 'N', 'mm')}
                </div>
            </div>
            
            <Separator />
            
            <FormField
                control={form.control}
                name="hasAeroBars"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Aero Bar Setup</FormLabel>
                      <FormDescription>
                        Enable this to add aero bar specific measurements.
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

            {hasAeroBars && (
                <div className="p-4 border-l-2 ml-2 space-y-4">
                    <p className="text-muted-foreground">Aero bar setup fields will go here.</p>
                </div>
            )}


            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Fit Details
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
