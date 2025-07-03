
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
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const preferencesFormSchema = z.object({
  measurementSystem: z.enum(['metric', 'imperial']),
  shoeSizeSystem: z.enum(['us', 'uk', 'eu']),
  distanceUnit: z.enum(['km', 'miles']),
})

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>

// --- Conversion Utilities ---

// Weight & Height
const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const CM_TO_IN = 0.393701;
const IN_TO_CM = 1 / CM_TO_IN;

// Shoe Size (approximations)
const convertShoeSize = (
  size: number, 
  fromSystem: 'us' | 'uk' | 'eu', 
  toSystem: 'us' | 'uk' | 'eu'
): number => {
    if (fromSystem === toSystem) return size;

    // First, convert fromSystem to US standard
    let usSize: number;
    switch (fromSystem) {
        case 'uk': usSize = size + 1; break;
        case 'eu': usSize = size - 33; break;
        default: usSize = size; break;
    }

    // Then, convert from US to toSystem
    let newSize: number;
    switch (toSystem) {
        case 'uk': newSize = usSize - 1; break;
        case 'eu': newSize = usSize + 33; break;
        default: newSize = usSize; break;
    }
    
    // Round to nearest 0.5
    return Math.round(newSize * 2) / 2;
}


export default function ProfilePage() {
  const { user, updateProfileInfo } = useAuth()
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false)
  const [isSubmittingPreferences, setIsSubmittingPreferences] = React.useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      height: '',
      feet: '',
      inches: '',
      weight: '',
      shoeSize: '',
      age: '',
    },
    mode: "onChange",
  })

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      measurementSystem: 'metric',
      shoeSizeSystem: 'us',
      distanceUnit: 'km',
    },
    mode: "onChange",
  })
  
  const measurementSystem = preferencesForm.watch('measurementSystem');
  const shoeSizeSystem = preferencesForm.watch('shoeSizeSystem');

  React.useEffect(() => {
    if (user) {
      preferencesForm.reset({
        measurementSystem: user.measurementSystem || 'metric',
        shoeSizeSystem: user.shoeSizeSystem || 'us',
        distanceUnit: user.distanceUnit || 'km',
      });
      
      const isImperial = user.measurementSystem === 'imperial';
      
      // Height and Weight
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

      // Shoe Size
      const baseUsShoeSize = user.shoeSize || '';
      const displayShoeSystem = user.shoeSizeSystem || 'us';
      let displayShoeSize: number | '' = '';
      if (typeof baseUsShoeSize === 'number' && baseUsShoeSize > 0) {
        displayShoeSize = convertShoeSize(baseUsShoeSize, 'us', displayShoeSystem);
      }

      profileForm.reset({
        name: user.displayName || '',
        age: user.age || '',
        shoeSize: displayShoeSize,
        height: heightInCm, // Always store base cm
        feet: displayFeet,
        inches: displayInches,
        weight: displayWeight, // Display value
      });
    }
  }, [user, profileForm, preferencesForm]);

  const handleMeasurementSystemChange = (newSystem: 'metric' | 'imperial') => {
    const { getValues, setValue } = profileForm;
    const oldSystem = newSystem === 'metric' ? 'imperial' : 'metric';
    
    const currentWeight = getValues('weight');
    if (typeof currentWeight === 'number' && currentWeight > 0) {
      const newWeight = oldSystem === 'metric' 
        ? currentWeight * KG_TO_LBS // from kg to lbs
        : currentWeight * LBS_TO_KG; // from lbs to kg
      setValue('weight', parseFloat(newWeight.toFixed(2)));
    }

    if (newSystem === 'imperial') {
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
  };

  const handleShoeSizeSystemChange = (newSystem: 'us' | 'uk' | 'eu') => {
    const oldSystem = preferencesForm.getValues('shoeSizeSystem');
    const { getValues, setValue } = profileForm;
    
    const currentShoeSize = getValues('shoeSize');
    if (typeof currentShoeSize === 'number' && currentShoeSize > 0) {
      const newShoeSize = convertShoeSize(currentShoeSize, oldSystem, newSystem);
      setValue('shoeSize', newShoeSize);
    }
  };


  async function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmittingProfile(true);

    const dataToSubmit: Partial<ProfileFormValues> & { shoeSize?: number } = {
      name: data.name,
      age: data.age,
    };
    
    // Always convert data to metric for storage
    if (measurementSystem === 'imperial') {
      if ((data.feet && data.feet > 0) || (data.inches && data.inches > 0)) {
        const totalInches = (data.feet || 0) * 12 + (data.inches || 0);
        dataToSubmit.height = totalInches * IN_TO_CM;
      }
      if (data.weight && data.weight > 0) {
        dataToSubmit.weight = data.weight * LBS_TO_KG;
      }
    } else {
      dataToSubmit.height = data.height;
      dataToSubmit.weight = data.weight;
    }

    // Always convert shoe size to US for storage
    const displayShoeSystem = preferencesForm.getValues('shoeSizeSystem');
    if (data.shoeSize && data.shoeSize > 0) {
      dataToSubmit.shoeSize = convertShoeSize(data.shoeSize, displayShoeSystem, 'us');
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
      });
    } catch (error) {
      // Error is handled by the auth context's toast
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  async function onPreferencesSubmit(data: PreferencesFormValues) {
    setIsSubmittingPreferences(true);
    try {
        await updateProfileInfo(data);
    } catch (error) {
        // Error is handled by the auth context's toast, no need to do anything here.
    } finally {
        setIsSubmittingPreferences(false);
    }
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details here. This helps in providing more accurate wear simulations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
              <FormField
                control={profileForm.control}
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
              <div className="grid grid-cols-2 gap-4">
                 {measurementSystem === 'metric' ? (
                   <FormField
                    control={profileForm.control}
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
                        control={profileForm.control}
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
                        control={profileForm.control}
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
                <FormField
                  control={profileForm.control}
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
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
                <FormField
                  control={profileForm.control}
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

              <Button type="submit" disabled={isSubmittingProfile || isSubmittingPreferences}>
                {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmittingProfile ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Set your preferred units for measurement and distance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...preferencesForm}>
            <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-8">
              <FormField
                control={preferencesForm.control}
                name="measurementSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height &amp; Weight</FormLabel>
                    <Select 
                      onValueChange={(value: 'metric' | 'imperial') => {
                        handleMeasurementSystemChange(value);
                        field.onChange(value);
                      }} 
                      value={field.value}
                    >
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
              <FormField
                control={preferencesForm.control}
                name="shoeSizeSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shoe Size</FormLabel>
                    <Select
                      onValueChange={(value: 'us' | 'uk' | 'eu') => {
                        handleShoeSizeSystemChange(value);
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
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
                control={preferencesForm.control}
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
              <Button type="submit" disabled={isSubmittingProfile || isSubmittingPreferences}>
                {isSubmittingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmittingPreferences ? "Updating..." : "Update Preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
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
