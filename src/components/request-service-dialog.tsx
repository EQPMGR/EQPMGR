

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Wrench, Bike } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ServiceProvider, Equipment, Component } from '@/lib/types';
import { submitWorkOrderAction } from '@/app/(app)/service-providers/actions';

interface RequestServiceDialogProps {
  provider: ServiceProvider;
}

export function RequestServiceDialog({ provider }: RequestServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEquipment = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const equipmentQuery = query(collection(db, 'users', user.uid, 'equipment'));
        const equipmentSnapshot = await getDocs(equipmentQuery);
        const allEquipment = equipmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
        setEquipmentList(allEquipment);
        
        if (allEquipment.length === 1) {
            setSelectedEquipmentId(allEquipment[0].id);
        }

    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your equipment.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (open) {
      fetchEquipment();
    }
  }, [open, fetchEquipment]);
  
  const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
          // Reset state when closing
          setStep(1);
          setSelectedEquipmentId(null);
          setSelectedService(null);
          setIsLoading(true);
          setIsSubmitting(false);
          setNotes('');
      }
  }
  
  const handleNextStep = () => {
      if (step === 1 && !selectedEquipmentId) {
          toast({ variant: 'destructive', title: 'Please select an item.'});
          return;
      }
       if (step === 2 && !selectedService) {
          toast({ variant: 'destructive', title: 'Please select a service.'});
          return;
      }
      setStep(prev => prev + 1);
  }

  const handleSubmit = async () => {
    if (!user || !selectedEquipmentId || !selectedService || !selectedEquipment) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure all fields are selected.' });
        return;
    }
    setIsSubmitting(true);
    
    const result = await submitWorkOrderAction({
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown User',
        userPhone: user.phone || '',
        userEmail: user.email || '',
        serviceProviderId: provider.id,
        providerName: provider.shopName || provider.name,
        equipmentId: selectedEquipmentId,
        equipmentName: selectedEquipment.name,
        equipmentBrand: selectedEquipment.brand,
        equipmentModel: selectedEquipment.model,
        serviceType: selectedService,
        notes: notes,
        fitData: selectedService === 'bike-fitting' ? selectedEquipment.fitData : undefined,
    });
    
    if (result.success) {
        toast({ title: 'Success!', description: result.message });
        handleOpenChange(false);
    } else {
        toast({ variant: 'destructive', title: 'Submission Failed', description: result.message });
    }
    
    setIsSubmitting(false);
  }

  const selectedEquipment = equipmentList.find(e => e.id === selectedEquipmentId);
  
  const renderStepContent = () => {
    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    switch (step) {
      case 1: // Equipment Selection
        if (equipmentList.length === 0) {
            return <p>You have no equipment. Please add gear first.</p>;
        }
        if (equipmentList.length > 1) {
          return (
            <div>
              <Label>Select your gear</Label>
              <Select onValueChange={setSelectedEquipmentId} value={selectedEquipmentId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bike or shoes..." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentList.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.brand} {eq.model})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        // If only one piece of equipment, this step is automatically handled
        return <p className="font-medium p-2 border rounded-md bg-muted">Selected: {equipmentList[0].name}</p>;
      
      case 2: // Service Selection
        return (
          <div className="space-y-4">
            <Label>What service do you need for your {selectedEquipment?.name}?</Label>
            <RadioGroup onValueChange={setSelectedService} value={selectedService || ''}>
              {provider.services.map(service => (
                <Label key={service} htmlFor={service} className="flex items-center gap-4 p-4 border rounded-md has-[:checked]:bg-muted">
                    <RadioGroupItem value={service} id={service} />
                    <span className="font-medium capitalize">{service.replace('-', ' ')}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        );

      case 3: // Confirmation/Form
        return (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                <Card>
                    <CardHeader><CardTitle>Athlete Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p><strong>Name:</strong> {user?.displayName || 'N/A'}</p>
                        <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {user?.phone || 'Not provided'}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Equipment Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p><strong>Item:</strong> {selectedEquipment?.name} ({selectedEquipment?.brand} {selectedEquipment?.model})</p>
                         <p><strong>Size:</strong> {selectedEquipment?.frameSize || 'N/A'}</p>
                    </CardContent>
                </Card>
                {selectedService === 'bike-fitting' && (
                     <Card>
                        <CardHeader><CardTitle>Current Fit Measurements</CardTitle><CardDescription>This information will be sent to the fitter.</CardDescription></CardHeader>
                        <CardContent className="text-sm space-y-2">
                           {selectedEquipment?.fitData ? (
                               Object.entries(selectedEquipment.fitData).map(([key, value]) => (
                                   value && typeof value !== 'object' && <p key={key}><strong>{key}:</strong> {String(value)}</p>
                               ))
                           ) : (
                               <p>No fit data has been saved for this bike.</p>
                           )}
                           {selectedEquipment?.fitData?.cleatPosition && (
                                <div className='pt-2 mt-2 border-t'>
                                    <h4 className='font-semibold'>Cleat Position</h4>
                                    {Object.entries(selectedEquipment.fitData.cleatPosition).map(([key, value]) => (
                                        <p key={key}><strong>{key}:</strong> {String(value)}</p>
                                    ))}
                                </div>
                           )}
                        </CardContent>
                    </Card>
                )}
                <div>
                    <Label htmlFor="notes">
                        {selectedService === 'bike-fitting' ? 'Reason for Fit / Issues' : 'Notes for the Shop'}
                    </Label>
                    <Textarea 
                        id="notes" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder={
                            selectedService === 'bike-fitting' 
                            ? "e.g., Numbness in hands, lower back pain..." 
                            : `Please describe the issue or service you need for your ${selectedEquipment?.name}...`
                        } 
                    />
                </div>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">
            <Wrench className="mr-2 h-4 w-4"/>
            Request Service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Service from {provider.shopName}</DialogTitle>
          <DialogDescription>
            {step === 1 && "Select the equipment you need service for."}
            {step === 2 && "Choose the service you'd like to book."}
            {step === 3 && `Confirm details for your ${selectedService?.replace('-', ' ')}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            {renderStepContent()}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          {step > 1 && <Button variant="secondary" onClick={() => setStep(prev => prev - 1)}>Back</Button>}
          {step < 3 && <Button onClick={handleNextStep} disabled={(step === 1 && !selectedEquipmentId) || (step === 2 && !selectedService)}>Next</Button>}
          {step === 3 && <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Request</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
