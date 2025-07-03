
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  height: z.coerce.number().positive().optional().or(z.literal('')), // cm
  feet: z.coerce.number().positive().optional().or(z.literal('')),
  inches: z.coerce.number().min(0).max(11.99).optional().or(z.literal('')),
  weight: z.coerce.number().positive().optional().or(z.literal('')), // display value (kg or lbs)
  shoeSize: z.coerce.number().positive().optional().or(z.literal('')),
  age: z.coerce.number().positive().int().optional().or(z.literal('')),
  measurementSystem: z.enum(['metric', 'imperial']),
  shoeSizeSystem: z.enum(['us', 'uk', 'eu']),
  distanceUnit: z.enum(['km', 'miles']),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// --- Conversion Utilities ---

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const CM_TO_IN = 0.393701;
const IN_TO_CM = 1 / CM_TO_IN;

const convertShoeSize = (
  size: number, 
  fromSystem: 'us' | 'uk' | 'eu', 
  toSystem: 'us' | 'uk' | 'eu'
): number => {
    if (fromSystem === toSystem) return size;
    if (!size) return 0;

    let usSize: number;
    switch (fromSystem) {
        case 'uk': usSize = size + 1; break;
        case 'eu': usSize = size - 33; break;
        default: usSize = size; break;
    }

    let newSize: number;
    switch (toSystem) {
        case 'uk': newSize = usSize - 1; break;
        case 'eu': newSize = usSize + 33; break;
        default: newSize = usSize; break;
    }
    
    return Math.round(newSize * 2) / 2;
}


export default function ProfilePage() {
  const { user, updateProfileInfo } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      height: '',
      feet: '',
      inches: '',
      weight: '',
      shoeSize: '',
      age: '',
      measurementSystem: 'metric',
      shoeSizeSystem: 'us',
      distanceUnit: 'km',
    },
    mode: "onChange",
  })
  
  const measurementSystem = form.watch('measurementSystem');
  const shoeSizeSystem = form.watch('shoeSizeSystem');
  const previousMeasurementSystem = React.useRef(measurementSystem);
  const previousShoeSizeSystem = React.useRef(shoeSizeSystem);


  React.useEffect(() => {
    if (user) {
      const isImperial = (user.measurementSystem || 'metric') === 'imperial';
      
      const heightInCm = user.height || '';
      const weightInKg = user.weight || '';
      
      let displayWeight: number | '' = typeof weightInKg === 'number' ? weightInKg : '';
      let displayFeet: number | '' = '';
      let displayInches: number | '' = '';
      
      if (isImperial) {
        if (typeof heightInCm === 'number' && heightInCm > 0) {
          const totalInches = heightInCm * CM_TO_IN;
          displayFeet = Math.floor(totalInches / 12);
          displayInches = parseFloat((totalInches % 12).toFixed(2));
        }
        if (typeof weightInKg === 'number' && weightInKg > 0) {
          displayWeight = parseFloat((weightInKg * KG_TO_LBS).toFixed(2));
        }
      }

      const baseUsShoeSize = user.shoeSize || '';
      const displayShoeSystem = user.shoeSizeSystem || 'us';
      let displayShoeSize: number | '' = '';
      if (typeof baseUsShoeSize === 'number' && baseUsShoeSize > 0) {
        displayShoeSize = convertShoeSize(baseUsShoeSize, 'us', displayShoeSystem);
      }

      form.reset({
        name: user.displayName || '',
        age: user.age || '',
        measurementSystem: user.measurementSystem || 'metric',
        shoeSizeSystem: user.shoeSizeSystem || 'us',
        distanceUnit: user.distanceUnit || 'km',
        shoeSize: displayShoeSize,
        height: heightInCm,
        feet: displayFeet,
        inches: displayInches,
        weight: displayWeight,
      });
      previousMeasurementSystem.current = user.measurementSystem || 'metric';
      previousShoeSizeSystem.current = user.shoeSizeSystem || 'us';
    }
  }, [user, form]);

  React.useEffect(() => {
    if (measurementSystem !== previousMeasurementSystem.current) {
        const { getValues, setValue } = form;
        
        const currentWeight = getValues('weight');
        if (typeof currentWeight === 'number' && currentWeight > 0) {
          const newWeight = previousMeasurementSystem.current === 'metric' 
            ? currentWeight * KG_TO_LBS
            : currentWeight * LBS_TO_KG;
          setValue('weight', parseFloat(newWeight.toFixed(2)));
        }

        if (measurementSystem === 'imperial') {
          const heightCm = getValues('height');
          if (typeof heightCm === 'number' && heightCm > 0) {
            const totalInches = heightCm * CM_TO_IN;
            setValue('feet', Math.floor(totalInches / 12));
            setValue('inches', parseFloat((totalInches % 12).toFixed(2)));
          }
        } else {
          const feet = getValues('feet');
          const inches = getValues('inches');
          if ((typeof feet === 'number' && feet > 0) || (typeof inches === 'number' && inches > 0)) {
            const totalInches = (feet || 0) * 12 + (inches || 0);
            setValue('height', parseFloat((totalInches * IN_TO_CM).toFixed(2)));
          }
        }
        previousMeasurementSystem.current = measurementSystem;
    }
  }, [measurementSystem, form]);

  React.useEffect(() => {
    if (shoeSizeSystem !== previousShoeSizeSystem.current) {
        const { getValues, setValue } = form;
        
        const currentShoeSize = getValues('shoeSize');
        if (typeof currentShoeSize === 'number' && currentShoeSize > 0) {
          const newShoeSize = convertShoeSize(currentShoeSize, previousShoeSizeSystem.current, shoeSizeSystem);
          setValue('shoeSize', newShoeSize);
        }
        previousShoeSizeSystem.current = shoeSizeSystem;
    }
  }, [shoeSizeSystem, form]);


  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);

    const dataToSubmit: Partial<UserProfile> & { shoeSize?: number } = {
      name: data.name,
      age: data.age,
      measurementSystem: data.measurementSystem,
      shoeSizeSystem: data.shoeSizeSystem,
      distanceUnit: data.distanceUnit,
    };
    
    if (data.measurementSystem === 'imperial') {
      if ((data.feet && data.feet > 0) || (data.inches && data.inches > 0)) {
        const totalInches = (Number(data.feet) || 0) * 12 + (Number(data.inches) || 0);
        dataToSubmit.height = totalInches * IN_TO_CM;
      }
      if (data.weight && data.weight > 0) {
        dataToSubmit.weight = Number(data.weight) * LBS_TO_KG;
      }
    } else {
      dataToSubmit.height = data.height;
      dataToSubmit.weight = data.weight;
    }

    if (data.shoeSize && data.shoeSize > 0) {
      dataToSubmit.shoeSize = convertShoeSize(Number(data.shoeSize), data.shoeSizeSystem, 'us');
    } else {
      dataToSubmit.shoeSize = data.shoeSize || undefined;
    }

    try {
      await updateProfileInfo({
          displayName: dataToSubmit.name,
          height: dataToSubmit.height || undefined,
          weight: dataToSubmit.weight || undefined,
          shoeSize: dataToSubmit.shoeSize,
          age: dataToSubmit.age || undefined,
          measurementSystem: dataToSubmit.measurementSystem,
          shoeSizeSystem: dataToSubmit.shoeSizeSystem,
          distanceUnit: dataToSubmit.distanceUnit,
      });
    } catch (error) {
      // Error is handled by the auth context's toast
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information &amp; Preferences</CardTitle>
              <CardDescription>
                Update your details here. This helps in providing more accurate wear simulations and personalized experiences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="measurementSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height &amp; Weight</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a measurement system" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="metric">Metric (cm, kg)</SelectItem>
                          <SelectItem value="imperial">Imperial (ft/in, lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {measurementSystem === 'metric' ? (
                   <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="180" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 ) : (
                  <div className="grid grid-cols-2 gap-2">
                     <FormField
                        control={form.control}
                        name="feet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (ft)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="5" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="inches"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>(in)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="11" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                 )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight ({measurementSystem === 'metric' ? 'kg' : 'lbs'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={measurementSystem === 'metric' ? "75" : "165"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="32" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="shoeSizeSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shoe Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shoe size system" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="us">US</SelectItem>
                            <SelectItem value="uk">UK</SelectItem>
                            <SelectItem value="eu">European</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shoeSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shoe Size ({shoeSizeSystem?.toUpperCase()})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distanceUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a distance unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="km">Kilometers (km)</SelectItem>
                            <SelectItem value="miles">Miles (mi)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
            </CardContent>
          </Card>
          <div className="flex justify-start">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Updating..." : "Update Profile"}
              </Button>
          </div>
        </form>
      </Form>
      <Card>
          <CardHeader>
            <CardTitle>Insurance</CardTitle>
            <CardDescription>
              Protect your equipment against theft and damage with one of our partners.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="#">Explore Insurance Partners</Link>
            </Button>
          </CardContent>
        </Card>
    </>
  )
}
