
'use client';

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import type { Equipment, MasterComponent } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchAllMasterComponents, type MasterComponentWithOptions } from '@/services/components';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


const componentFieldSchema = z.object({
  type: z.enum(['db', 'manual']),
  masterComponentId: z.string().optional(),
  manualBrand: z.string().optional(),
  manualModel: z.string().optional(),
}).default({ type: 'db' });

const wheelsetFormSchema = z.object({
  nickname: z.string().min(2, { message: 'Nickname is required.' }),
  frontHub: componentFieldSchema,
  rearHub: componentFieldSchema,
  frontRim: componentFieldSchema,
  rearRim: componentFieldSchema,
  frontTire: componentFieldSchema,
  rearTire: componentFieldSchema,
  cassette: componentFieldSchema,
}).refine(data => {
    const isComponentValid = (comp: z.infer<typeof componentFieldSchema>) => {
        return (comp.type === 'db' && comp.masterComponentId) || (comp.type === 'manual' && comp.manualBrand && comp.manualModel);
    };
    return isComponentValid(data.frontHub) && isComponentValid(data.rearHub) && isComponentValid(data.frontRim) && isComponentValid(data.rearRim) && isComponentValid(data.frontTire) && isComponentValid(data.rearTire) && isComponentValid(data.cassette);
}, {
    message: "All wheelset components must be either selected from the database or entered manually.",
    path: ['nickname'], // Add error to a field that is always visible
});


type WheelsetFormValues = z.infer<typeof wheelsetFormSchema>;

interface AddWheelsetDialogProps {
  equipment: Equipment;
  onSuccess: () => void;
  children: React.ReactNode;
}

const createMasterComponentId = (brand: string, name: string, model: string) => {
    return `${brand}-${name}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function AddWheelsetDialog({
  equipment,
  onSuccess,
  children,
}: AddWheelsetDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [masterComponents, setMasterComponents] = useState<MasterComponentWithOptions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<WheelsetFormValues>({
    resolver: zodResolver(wheelsetFormSchema),
    defaultValues: {
      nickname: '',
    },
  });

  useEffect(() => {
    async function loadData() {
        if (open) {
            setIsLoading(true);
            try {
                const components = await fetchAllMasterComponents();
                setMasterComponents(components);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error loading components', description: e.message });
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadData();
  }, [open, toast]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };
  
  const createComponentEntry = (
      batch: ReturnType<typeof writeBatch>,
      data: z.infer<typeof componentFieldSchema>,
      name: string,
      system: 'Drivetrain' | 'Wheelset',
      wheelsetId: string
  ) => {
      let masterId = data.masterComponentId;
      if (data.type === 'manual' && data.manualBrand && data.manualModel) {
          masterId = createMasterComponentId(data.manualBrand, name, data.manualModel);
          const masterRef = doc(db, 'masterComponents', masterId);
          batch.set(masterRef, { name, system, brand: data.manualBrand, model: data.manualModel }, { merge: true });
      }

      if (!masterId) return; // Skip if no ID could be determined

      const userCompRef = doc(collection(db, 'users', user!.uid, 'equipment', equipment.id, 'components'));
      batch.set(userCompRef, {
          masterComponentId: masterId,
          purchaseDate: new Date(),
          wearPercentage: 0,
          lastServiceDate: null,
          wheelsetId,
      });
  }

  const onSubmit = async (data: WheelsetFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated.' });
      return;
    }
    setIsSaving(true);
    const batch = writeBatch(db);
    const wheelsetId = `wheelset_${Date.now()}`;

    try {
      // Update equipment with the new wheelset's nickname
      const equipmentRef = doc(db, 'users', user.uid, 'equipment', equipment.id);
      batch.update(equipmentRef, {
        [`wheelsets.${wheelsetId}`]: data.nickname,
      });

      // Create components
      createComponentEntry(batch, data.frontHub, 'Front Hub', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.rearHub, 'Rear Hub', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.frontRim, 'Front Rim', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.rearRim, 'Rear Rim', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.frontTire, 'Front Tire', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.rearTire, 'Rear Tire', 'Wheelset', wheelsetId);
      createComponentEntry(batch, data.cassette, 'Cassette', 'Drivetrain', wheelsetId);
      
      await batch.commit();

      toast({ title: 'Wheelset Added!', description: `${data.nickname} has been added to your ${equipment.name}.` });
      onSuccess();
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Wheelset',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const ComponentSelector = ({ name, label }: { name: keyof WheelsetFormValues, label: string }) => {
      const componentType = form.watch(name as any)?.type || 'db';
      const componentName = label.replace(/ Model/g, ''); // "Front Hub Model" -> "Front Hub"

      const filteredOptions = useMemo(() => masterComponents.filter(c => c.name === componentName), [componentName]);
      const brands = useMemo(() => [...new Set(filteredOptions.map(c => c.brand).filter(Boolean))].sort(), [filteredOptions]);
      
      return (
           <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Select {label}</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <FormField control={form.control} name={`${name}.masterComponentId` as any} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Brand</FormLabel>
                                 <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select from database..." /></SelectTrigger></FormControl><SelectContent>{filteredOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.brand} {o.model}</SelectItem>)}</SelectContent></Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Or Add Manually</AccordionTrigger>
                     <AccordionContent className="space-y-4 pt-4">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name={`${name}.manualBrand` as any} render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Zipp" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name={`${name}.manualModel` as any} render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g., 303 Firecrest" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                         </div>
                     </AccordionContent>
                </AccordionItem>
            </Accordion>
      )
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Wheelset</DialogTitle>
          <DialogDescription>
            Define the components for your new wheelset. This will create a new set of trackable parts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wheelset Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Race Day Wheels" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />
            <h4 className="font-semibold">Components</h4>
            {isLoading ? <Loader2 className="animate-spin" /> : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <ComponentSelector name="frontHub" label="Front Hub" />
                    <ComponentSelector name="rearHub" label="Rear Hub" />
                    <ComponentSelector name="frontRim" label="Front Rim" />
                    <ComponentSelector name="rearRim" label="Rear Rim" />
                    <ComponentSelector name="frontTire" label="Front Tire" />
                    <ComponentSelector name="rearTire" label="Rear Tire" />
                    <ComponentSelector name="cassette" label="Cassette" />
                </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isLoading}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Wheelset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

```
  <change>
    <file>/src/lib/types.ts</file>
    <content><![CDATA[

import type { BikeType } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

// Data from the master/central database
export interface MasterComponent {
  id: string;
  name: string;
  brand?: string;
  series?: string;
  model?: string;
  system: string;
  size?: string; // For components with a single size, or as a default/base size.
  sizeVariants?: string; // JSON string for components with size tied to frame, e.g. '{"S": "170mm", "M": "172.5mm"}'
  chainring1?: string;
  chainring2?: string;
  chainring3?: string;
  embedding?: number[]; // To store the vector embedding
}

// Data specific to a user's instance of a component
export interface UserComponent {
  id: string; // Unique ID for this specific instance (document ID in the subcollection)
  parentUserComponentId?: string | null; // ID of the parent UserComponent, if this is a sub-component
  masterComponentId: string; // Reference to the MasterComponent
  wearPercentage: number;
  lastServiceDate: Date | null;
  purchaseDate: Date;
  notes?: string;
  size?: string; // The specific size for this user's instance, resolved from size or sizeVariants.
  wheelsetId?: string; // To associate a component with a specific wheelset
}

// The combined object we'll use in the app UI
export interface Component extends MasterComponent, Omit<UserComponent, 'id' | 'masterComponentId'> {
  userComponentId: string;
}

// Represents a component that has been replaced.
export interface ArchivedComponent {
    name: string;
    brand?: string;
    series?: string;
    model?: string;
    system: string;
    size?: string;
    wearPercentage: number;
    purchaseDate: string;
    lastServiceDate: string | null;
    replacedOn: string;
    finalMileage: number;
    replacementReason: 'failure' | 'modification' | 'upgrade';
}


export interface MaintenanceLog {
  id: string;
  date: Date;
  logType: 'service' | 'repair' | 'modification';
  description: string;
  cost: number;
  serviceType: 'diy' | 'shop';
  serviceProvider?: string;
  technician?: string;
  componentReplaced: boolean;
  isOEM?: boolean;
  replacementPart?: string;
  notes?: string;
}

export interface CleatPosition {
    foreAft?: number;
    lateral?: number;
    rotational?: number;
}

export interface BikeFitData {
  saddleHeight?: number;
  saddleHeightOverBars?: number;
  saddleToHandlebarReach?: number;
  saddleAngle?: number;
  saddleForeAft?: number;
  saddleBrandModel?: string;
  stemLength?: number;
  stemAngle?: number;
  handlebarBrandModel?: string;
  handlebarWidth?: number;
  handlebarAngle?: number;
  handlebarExtension?: number;
  brakeLeverPosition?: string;
  crankLength?: number;
  hasAeroBars?: boolean;
  cleatPosition?: CleatPosition;
}

export interface Equipment {
  id:string;
  name: string;
  type: BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes';
  brand: string;
  model: string;
  modelYear: number;
  serialNumber?: string;
  frameSize?: string;
  purchaseCondition: 'new' | 'used';
  purchaseDate: Date;
  purchasePrice: number;
  totalDistance: number;
  totalHours: number;
  imageUrl: string;
  components: Component[]; // This will be populated at runtime, not stored in Firestore
  maintenanceLog: MaintenanceLog[];
  archivedComponents?: ArchivedComponent[];
  fitData?: BikeFitData;
  associatedEquipmentIds?: string[];
  wheelsets?: Record<string, string>; // e.g. { "wheelsetId1": "Training Wheels" }
}

export interface ServiceProvider {
  id: string;
  name: string;
  shopName?: string;
  logoUrl?: string;
  services: ('bike-fitting' | 'repairs')[];
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  website?: string;
  geohash?: string; // For location-based queries
  lat?: number;
  lng?: number;
  averageRating?: number;
  ratingCount?: number;
  availability?: string;
  dropOff?: boolean;
  valetService?: boolean;
}

export interface WorkOrder {
    id: string;
    userId: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    serviceProviderId: string;
    providerName: string;
    equipmentId: string;
    equipmentName: string;
    equipmentBrand: string;
    equipmentModel: string;
    serviceType: string;
    status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    fitData?: BikeFitData;
    createdAt: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}
