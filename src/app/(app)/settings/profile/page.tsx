
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
import { useAuth, type UserProfile } from "@/hooks/use-auth"

// --- Zod Schema with Preprocessing ---
const emptyStringToUndefined = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
}, z.coerce.number().positive().optional());

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(30, "Name must not be longer than 30 characters.").optional().or(z.literal('')),
  height: emptyStringToUndefined,
  feet: emptyStringToUndefined,
  inches: emptyStringToUndefined.max(11.99),
  weight: emptyStringToUndefined,
  shoeSize: emptyStringToUndefined,
  age: emptyStringToUndefined,
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
  size: number | undefined, 
  fromSystem: 'us' | 'uk' | 'eu', 
  toSystem: 'us' | 'uk' | 'eu'
): number | undefined => {
    if (fromSystem === toSystem || !size) return size;

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

// --- Mapping Functions ---
const mapProfileToForm = (profile: UserProfile): ProfileFormValues => {
    const isImperial = profile.measurementSystem === 'imperial';
    let feet, inches, height, weight, shoeSize;

    if (isImperial) {
        if (profile.height) {
            const totalInches = profile.height * CM_TO_IN;
            feet = Math.floor(totalInches / 12);
            inches = parseFloat((totalInches % 12).toFixed(2));
        }
        if (profile.weight) {
            weight = parseFloat((profile.weight * KG_TO_LBS).toFixed(2));
        }
    } else {
        height = profile.height;
        weight = profile.weight;
    }

    if (profile.shoeSize) {
        shoeSize = convertShoeSize(profile.shoeSize, 'us', profile.shoeSizeSystem);
    }

    return {
        name: profile.displayName || '',
        age: profile.age,
        measurementSystem: profile.measurementSystem,
        shoeSizeSystem: profile.shoeSizeSystem,
        distanceUnit: profile.distanceUnit,
        shoeSize: shoeSize,
        height: height,
        feet: feet,
        inches: inches,
        weight: weight,
    };
};

const mapFormToProfile = (formData: ProfileFormValues): Omit<Partial<UserProfile>, 'uid' | 'email'> => {
    let height, weight, shoeSize;

    if (formData.measurementSystem === 'imperial') {
        if (formData.feet || formData.inches) {
            const totalInches = (formData.feet || 0) * 12 + (formData.inches || 0);
            height = totalInches > 0 ? totalInches * IN_TO_CM : undefined;
        }
        if (formData.weight) {
            weight = formData.weight * LBS_TO_KG;
        }
    } else {
        height = formData.height;
        weight = formData.weight;
    }

    if (formData.shoeSize) {
        shoeSize = convertShoeSize(formData.shoeSize, formData.shoeSizeSystem, 'us');
    }

    return {
        displayName: formData.name || null,
        age: formData.age,
        measurementSystem: formData.measurementSystem,
        shoeSizeSystem: formData.shoeSizeSystem,
        distanceUnit: formData.distanceUnit,
        height: height,
        weight: weight,
        shoeSize: shoeSize,
    };
};


export default function ProfilePage() {
  const { user, updateProfileInfo } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
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
        form.reset(mapProfileToForm(user));
        previousMeasurementSystem.current = user.measurementSystem;
        previousShoeSizeSystem.current = user.shoeSizeSystem;
    }
  }, [user, form]);

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'measurementSystem') {
        const newSystem = value.measurementSystem;
        const oldSystem = previousMeasurementSystem.current;
        if (newSystem === oldSystem) return;

        const { getValues, setValue } = form;
        
        const currentWeight = getValues('weight');
        if (currentWeight) {
          const newWeight = oldSystem === 'metric' 
            ? currentWeight * KG_TO_LBS
            : currentWeight * LBS_TO_KG;
          setValue('weight', parseFloat(newWeight.toFixed(2)));
        }

        if (newSystem === 'imperial') {
          const heightCm = getValues('height');
          if (heightCm) {
            const totalInches = heightCm * CM_TO_IN;
            setValue('feet', Math.floor(totalInches / 12));
            setValue('inches', parseFloat((totalInches % 12).toFixed(2)));
            setValue('height', undefined);
          }
        } else { // newSystem is 'metric'
          const feet = getValues('feet');
          const inches = getValues('inches');
          if (feet || inches) {
            const totalInches = (feet || 0) * 12 + (inches || 0);
            setValue('height', parseFloat((totalInches * IN_TO_CM).toFixed(2)));
            setValue('feet', undefined);
            setValue('inches', undefined);
          }
        }
        previousMeasurementSystem.current = newSystem;
      }

      if (name === 'shoeSizeSystem') {
        const newSystem = value.shoeSizeSystem;
        const oldSystem = previousShoeSizeSystem.current;
        if (newSystem === oldSystem || !oldSystem) return;

        const { getValues, setValue } = form;
        
        const currentShoeSize = getValues('shoeSize');
        if (currentShoeSize) {
          const newShoeSize = convertShoeSize(currentShoeSize, oldSystem, newSystem);
          setValue('shoeSize', newShoeSize);
        }
        previousShoeSizeSystem.current = newSystem;
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    const dataToSubmit = mapFormToProfile(data);
    try {
      await updateProfileInfo(dataToSubmit);
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
                          <Input type="number" step="any" placeholder="180" {...field} />
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
                              <Input type="number" step="any" placeholder="5" {...field} />
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
                              <Input type="number" step="any" placeholder="11" {...field} />
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
                        <Input type="number" step="any" placeholder={measurementSystem === 'metric' ? "75" : "165"} {...field} />
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
                          <Input type="number" step="any" placeholder="10.5" {...field} />
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
