
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { insuranceFormSchema, type InsuranceFormValues } from './schema';
import { submitInsuranceApplication } from './actions';
import { useAuth } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';


const yesNoQuestions = [
    { id: 'competes', label: 'Do you compete in competitive events?' },
    { id: 'hasIllness', label: 'Does the operator suffer from any illness, medical condition, or mental or physical disability which might affect the safe operation of a bicycle?' },
    { id: 'hasPolicyRefused', label: 'Have you ever had a recreational vehicle policy refused, restricted or cancelled?' },
    { id: 'unitsInCanada', label: 'Are your units kept in Canada?' },
    { id: 'hasCanadianAddress', label: 'Do you have a Canadian mailing address?' },
    { id: 'hasPastClaims', label: 'Have you had any bike thefts or claims in the past 3 years?' },
    { id: 'isBusinessUse', label: 'Will any of the units added on this application be used for business use?' },
    { id: 'isGasPowered', label: 'Are any of the units to be insured under this policy gas powered?' },
    { id: 'isElectricAssisted', label: 'Will any unit(s) on this policy be Electric Assisted?' },
    { id: 'isOver500w', label: 'If electric assisted, will any unit(s) be over 500 watts and/or over 32km maximum speed?' },
    { id: 'isTravelOutside', label: 'Will you be traveling with the unit to be insured, outside of Canada and the USA?' },
    { id: 'isTravelUsaLong', label: 'Will you be traveling with the unit to be insured, to the USA for longer than 6 months?' },
    { id: 'isScooter', label: 'Will any of the units added on this application be a Scooter or Low Speed Motorcycle?' },
    { id: 'isAgeOutOfRange', label: 'Are any operators younger than 16 or older than 84 years?' },
    { id: 'isNearThreat', label: 'Are any of the units to be insured located within 25 km of an imminent threat of damage (e.g., fire, flood, earthquake aftershocks, etc.)?' },
];

export default function InsurancePage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<InsuranceFormValues>({
        resolver: zodResolver(insuranceFormSchema),
        defaultValues: {
            owner1FirstName: user?.displayName?.split(' ')[0] || '',
            owner1LastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
            email: user?.email || '',
            phone: user?.phone || '',
        },
    });

    const hasPastClaims = form.watch('hasPastClaims');

    async function onSubmit(values: InsuranceFormValues) {
        setIsSubmitting(true);
        try {
            const result = await submitInsuranceApplication(values);
            if (result.success) {
                toast({
                    title: 'Application Submitted!',
                    description: "Your insurance application has been sent. We'll be in touch shortly.",
                });
                form.reset();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Submission Failed',
                    description: result.message,
                });
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'An Error Occurred',
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline">Pedal Power Insurance</h1>
                <p className="text-muted-foreground mt-2">Application for coverage through Oasis Insurance.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Eligibility Questions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {yesNoQuestions.map(({ id, label }) => (
                                <FormField
                                    key={id}
                                    control={form.control}
                                    name={id as keyof InsuranceFormValues}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4">
                                            <FormLabel>{label}</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={(val) => field.onChange(val === 'true')}
                                                    value={field.value === undefined ? undefined : String(field.value)}
                                                    className="flex space-x-4 mt-2 sm:mt-0"
                                                >
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel>Yes</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel>No</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                             {hasPastClaims && (
                                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                    <h4 className="font-semibold">Claim Details</h4>
                                     <FormField control={form.control} name="claims.0.dateOfLoss" render={({ field }) => (<FormItem><FormLabel>Date of Loss</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal bg-background", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="claims.0.typeOfClaim" render={({ field }) => (<FormItem><FormLabel>Type of Claim</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="theft" /></FormControl><FormLabel className="font-normal">Theft</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="collision" /></FormControl><FormLabel className="font-normal">Collision</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="liability" /></FormControl><FormLabel className="font-normal">Liability</FormLabel></FormItem></RadioGroup><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="claims.0.payoutAmount" render={({ field }) => (<FormItem><FormLabel>Payout Amount ($)</FormLabel><FormControl><Input type="number" {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="owner1FirstName" render={({ field }) => (<FormItem><FormLabel>Owner #1 First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="owner1LastName" render={({ field }) => (<FormItem><FormLabel>Owner #1 Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="addressStreet" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="addressCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="addressProvince" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="addressPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Unit Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="unitType" render={({ field }) => ( <FormItem><FormLabel>Unit Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="bicycle">Bicycle</SelectItem><SelectItem value="ebike">E-Bike</SelectItem><SelectItem value="scooter">Scooter</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="unitYear" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="unit.purchasePrice" render={({ field }) => (<FormItem><FormLabel>Purchase Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="unitMake" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="unitModel" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="unitSerialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="unitUsageArea" render={({ field }) => (<FormItem><FormLabel>Where is the normal area of use?</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="unitStorage" render={({ field }) => (<FormItem><FormLabel>Where is the unit stored and what precautions are taken?</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Coverage Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField control={form.control} name="effectiveDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Proposed Effective Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name="liability" render={({ field }) => ( <FormItem><FormLabel>Third Party Liability</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="1m">$1,000,000</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name="accidentBenefits" render={({ field }) => ( <FormItem><FormLabel>Accident Benefits</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="enhanced">Enhanced</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                             <FormField control={form.control} name="physicalDamage" render={({ field }) => ( <FormItem><FormLabel>Physical Damage</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="all-perils">All Perils</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Endorsements</CardTitle></CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="endorsements"
                                render={() => (
                                    <FormItem className="space-y-3">
                                        <FormField control={form.control} name="endorsements.businessUse" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Business Use</FormLabel></div></FormItem>)}/>
                                        <FormField control={form.control} name="endorsements.travel" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Travel Outside of Canada or the U.S.</FormLabel></div></FormItem>)}/>
                                        <FormField control={form.control} name="endorsements.competitiveEvents" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Competitive Event Extension</FormLabel></div></FormItem>)}/>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Application
                    </Button>
                </form>
            </Form>
        </div>
    );
}
