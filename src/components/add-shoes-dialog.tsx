
'use client';

import { useState, useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Footprints, Loader2 } from 'lucide-react';
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
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchAllMasterComponents, type MasterComponentWithOptions } from '@/services/components';
import type { Equipment } from '@/lib/types';


const shoesFormSchema = z.object({
  name: z.string().min(2, { message: 'Nickname is required.' }),
  shoeId: z.string().min(1, { message: 'Please select a shoe model.' }),
  purchaseDate: z.date({
    required_error: 'A purchase date is required.',
  }),
  purchasePrice: z.coerce.number().min(0, { message: 'Price cannot be negative.' }),
  purchaseCondition: z.enum(['new', 'used']),
  associatedBikeIds: z.array(z.string()),
});


export type ShoesFormValues = z.infer<typeof shoesFormSchema>;

interface AddShoesDialogProps {
  allBikes: Equipment[];
  onAddShoes: (formData: ShoesFormValues) => Promise<void>;
}

export function AddShoesDialog({ onAddShoes, allBikes }: AddShoesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [shoeModels, setShoeModels] = useState<MasterComponentWithOptions[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [discipline, setDiscipline] = useState<'Road' | 'MTB' | 'Gravel' | null>(null);

  const form = useForm<ShoesFormValues>({
    resolver: zodResolver(shoesFormSchema),
    defaultValues: {
      name: '',
      shoeId: '',
      purchaseDate: new Date(),
      purchasePrice: 0,
      purchaseCondition: 'new',
      associatedBikeIds: [],
    },
  });

  const { brand } = form.watch();

  useEffect(() => {
    async function fetchShoeModels() {
      if (!open) return;
      setIsLoadingModels(true);
      try {
        const components = await fetchAllMasterComponents();
        const shoes = components.filter(c => c.system === 'Shoes');
        setShoeModels(shoes);
      } catch (error) {
        console.error("Error fetching shoe models:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load shoe models from the database.',
        });
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchShoeModels();
  }, [open, toast]);

  const filteredShoes = useMemo(() => {
    if (!discipline) return [];
    return shoeModels.filter(shoe => (shoe as any).discipline === discipline);
  }, [discipline, shoeModels]);

  const shoeBrands = useMemo(() => {
    return [...new Set(filteredShoes.map(shoe => shoe.brand).filter(Boolean))].sort();
  }, [filteredShoes]);

  const availableModels = useMemo(() => {
    if (!brand) return [];
    return filteredShoes.filter(shoe => shoe.brand === brand);
  }, [brand, filteredShoes]);
  

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setDiscipline(null);
    }
  };

  async function onSubmit(data: ShoesFormValues) {
    setIsSubmitting(true);
    try {
        await onAddShoes(data);
        toast({
            title: 'Shoes Added!',
            description: `${data.name} have been added to your inventory.`,
        });
        handleOpenChange(false);
    } catch (error) {
        // Error is handled by the parent component's toast
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Footprints className="mr-2 h-4 w-4" />
          Add Shoes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Cycling Shoes</DialogTitle>
          <DialogDescription>
            Select your shoes and associate them with your bikes to track mileage.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <RadioGroup onValueChange={(val) => setDiscipline(val as any)} value={discipline || ''} className="flex gap-2">
                <FormItem className="flex items-center">
                    <FormControl>
                        <RadioGroupItem value="Road" id="road" className="sr-only peer" />
                    </FormControl>
                    <Label htmlFor="road" className="rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">Road</Label>
                </FormItem>
                <FormItem className="flex items-center">
                    <FormControl>
                        <RadioGroupItem value="MTB" id="mtb" className="sr-only peer" />
                    </FormControl>
                    <Label htmlFor="mtb" className="rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">MTB</Label>
                </FormItem>
                 <FormItem className="flex items-center">
                    <FormControl>
                        <RadioGroupItem value="Gravel" id="gravel" className="sr-only peer" />
                    </FormControl>
                    <Label htmlFor="gravel" className="rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">Gravel</Label>
                </FormItem>
            </RadioGroup>
            
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
                           form.setValue('shoeId', '');
                        }}
                        value={field.value}
                        disabled={isLoadingModels || !discipline}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingModels ? "Loading..." : "Select brand"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shoeBrands.map(brand => (
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
                  name="shoeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!brand || isLoadingModels}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingModels ? "Loading..." : "Select model"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableModels.map(shoe => (
                            <SelectItem key={shoe.id} value={shoe.id}>{shoe.model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nickname</FormLabel><FormControl><Input placeholder="e.g., My race day shoes" {...field} /></FormControl><FormMessage /></FormItem> )} />
            
             <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="purchaseDate" render={({ field }) => ( <FormItem><FormLabel>Purchase Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem><FormLabel>Purchase Price ($)</FormLabel><FormControl><Input type="number" placeholder="e.g., 300" {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <FormField
              control={form.control}
              name="associatedBikeIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Associated Bikes</FormLabel>
                    <FormDescription>
                      Select which bikes you use these shoes with to track mileage.
                    </FormDescription>
                  </div>
                  {allBikes.map((bike) => (
                    <FormField
                      key={bike.id}
                      control={form.control}
                      name="associatedBikeIds"
                      render={({ field }) => {
                        return (
                          <FormItem key={bike.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(bike.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), bike.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== bike.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {bike.name} ({bike.brand} {bike.model})
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

             <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 -mb-6 pb-6">
              <Button type="submit" disabled={isSubmitting || form.getValues('shoeId') === ''}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Shoes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
