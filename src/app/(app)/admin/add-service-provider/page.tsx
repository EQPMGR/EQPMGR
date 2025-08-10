
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2, Building, Wrench, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { addServiceProviderAction } from './actions';

const services = [
  { id: 'bike-fitting', label: 'Bike Fitting' },
  { id: 'repairs', label: 'Repairs' },
] as const;

const addProviderSchema = z.object({
  name: z.string().min(2, { message: 'Provider name is required.' }),
  services: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one service.',
  }),
  address: z.string().min(3, { message: 'Address is required.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  province: z.string().min(2, { message: 'Province/State is required.' }),
  postalCode: z.string().min(5, { message: 'Postal/Zip Code is required.' }),
  country: z.string().min(2, { message: 'Country is required.' }),
  phone: z.string().optional(),
  website: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

export type AddProviderFormValues = z.infer<typeof addProviderSchema>;

export default function AddServiceProviderPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddProviderFormValues>({
        resolver: zodResolver(addProviderSchema),
        defaultValues: {
            name: '',
            services: [],
            address: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'Canada',
            phone: '',
            website: '',
        },
    });

    async function onSubmit(values: AddProviderFormValues) {
        setIsSubmitting(true);
        try {
            const result = await addServiceProviderAction({ values });
            if (result.success) {
                toast({
                    title: 'Provider Added!',
                    description: result.message,
                });
                form.reset();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: result.message,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Add New Service Provider</CardTitle>
                        <CardDescription>Fill out the form to add a new partner to the directory.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Provider Name</FormLabel><FormControl><Input placeholder="e.g., Vancouver Bike Fit Physio" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <FormField
                            control={form.control}
                            name="services"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Services Offered</FormLabel>
                                    <FormDescription>
                                    Select the services this provider offers.
                                    </FormDescription>
                                </div>
                                {services.map((item) => (
                                    <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="services"
                                    render={({ field }) => {
                                        return (
                                        <FormItem
                                            key={item.id}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(item.id)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), item.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== item.id
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                            {item.label}
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

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold">Location</h4>
                            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main Street" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Vancouver" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="province" render={({ field }) => (<FormItem><FormLabel>Province / State</FormLabel><FormControl><Input placeholder="BC" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal / Zip Code</FormLabel><FormControl><Input placeholder="V5T 3N4" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="Canada" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>

                         <div className="space-y-4 pt-4 border-t">
                             <h4 className="font-semibold">Contact Info</h4>
                             <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="(604) 555-1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://www.example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>


                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" asChild>
                            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back to Admin</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Building className="mr-2 h-4 w-4" />
                            Save Provider
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
