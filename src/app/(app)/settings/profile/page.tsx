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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { useAuth, type UserProfile } from "@/hooks/use-auth"

// --- Zod Schema with Preprocessing ---
const emptyStringToUndefined = z.preprocess(
  (val) => (String(val).trim() === "" ? undefined : val),
  z.any()
);

const optionalPositiveNumber = emptyStringToUndefined.pipe(
  z.coerce.number({ invalid_type_error: "Must be a number" }).positive().optional()
);

const inchesSchema = emptyStringToUndefined.pipe(
  z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .positive()
    .max(11.99, { message: "Inches must be less than 12." })
    .optional()
);

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(30, "Name must not be longer than 30 characters.").optional().or(z.literal('')),
  phone: z.string().optional(),
  height: optionalPositiveNumber,
  feet: optionalPositiveNumber,
  inches: inchesSchema,
  weight: optionalPositiveNumber,
  shoeSize: optionalPositiveNumber,
  age: optionalPositiveNumber,
  measurementSystem: z.enum(['metric', 'imperial']),
  shoeSizeSystem: z.enum(['us', 'uk', 'eu']),
  distanceUnit: z.enum(['km', 'miles']),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD']),
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
    if (fromSystem === toSystem || size === undefined) return size;

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
    
    // Convert height for display
    if (profile.height) {
        if (isImperial) {
            const totalInches = profile.height * CM_TO_IN;
            feet = Math.floor(totalInches / 12);
            inches = parseFloat((totalInches % 12).toFixed(2));
            height = undefined; // Don't set metric height
        } else {
            height = parseFloat(profile.height.toFixed(2));
            feet = undefined;
            inches = undefined;
        }
    }

    // Convert weight for display
    if (profile.weight) {
        weight = isImperial ? parseFloat((profile.weight * KG_TO_LBS).toFixed(2)) : parseFloat(profile.weight.toFixed(2));
    }

    // Convert shoe size for display
    if (profile.shoeSize) {
        shoeSize = convertShoeSize(profile.shoeSize, 'us', profile.shoeSizeSystem);
    }

    return {
        name: profile.displayName || '',
        phone: profile.phone || '',
        age: profile.age,
        measurementSystem: profile.measurementSystem,
        shoeSizeSystem: profile.shoeSizeSystem,
        distanceUnit: profile.distanceUnit,
        dateFormat: profile.dateFormat,
        shoeSize: shoeSize,
        height: height,
        feet: feet,
        inches: inches,
        weight: weight,
    };
};

const mapFormToProfile = (formData: ProfileFormValues): Omit<Partial<UserProfile>, 'uid' | 'email' | 'measurementSystem' | 'shoeSizeSystem' | 'distanceUnit'> => {
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
        phone: formData.phone,
        age: formData.age,
        height: height,
        weight: weight,
        shoeSize: shoeSize,
    };
};

export default function ProfilePage() {
  const { user, updateProfileInfo, updateUserPreferences } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      measurementSystem: 'imperial',
      shoeSizeSystem: 'us',
      distanceUnit: 'km',
      dateFormat: 'MM/DD/YYYY',
      name: '',
      phone: '',
      age: undefined,
      height: undefined,
      feet: undefined,
      inches: undefined,
      weight: undefined,
      shoeSize: undefined,
    },
    mode: "onChange",
  })
  
  const measurementSystem = form.watch('measurementSystem');
  const shoeSizeSystem = form.watch('shoeSizeSystem');

  React.useEffect(() => {
    if (user) {
        form.reset(mapProfileToForm(user));
    }
  }, [user, form]);


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
                Update your details here. Preferences save automatically. Click the button to save personal info.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                   <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
               <FormField
                control={form.control}
                name="measurementSystem"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Height &amp; Weight</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    updateUserPreferences({ measurementSystem: value as 'metric' | 'imperial' });
                                }}
                                value={field.value}
                                className="flex space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="metric" /></FormControl>
                                    <FormLabel className="font-normal">Metric (cm, kg)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="imperial" /></FormControl>
                                    <FormLabel className="font-normal">Imperial (ft/in, lbs)</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {measurementSystem === 'metric' ? (
                   <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="180" {...field} value={field.value ?? ''} />
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
                              <Input type="number" step="any" placeholder="5" {...field} value={field.value ?? ''} />
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
                              <Input type="number" step="any" placeholder="11" {...field} value={field.value ?? ''} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                 )}
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight ({measurementSystem === 'metric' ? 'kg' : 'lbs'})</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder={measurementSystem === 'metric' ? "75" : "165"} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="32" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <FormField
                  control={form.control}
                  name="shoeSizeSystem"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Shoe Size System</FormLabel>
                       <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    updateUserPreferences({ shoeSizeSystem: value as 'us' | 'uk' | 'eu' });
                                }}
                                value={field.value}
                                className="flex space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="us" /></FormControl>
                                    <FormLabel className="font-normal">US</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="uk" /></FormControl>
                                    <FormLabel className="font-normal">UK</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="eu" /></FormControl>
                                    <FormLabel className="font-normal">European</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
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
                        <Input type="number" step="0.5" placeholder="10.5" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
               <FormField
                  control={form.control}
                  name="distanceUnit"
                  render={({ field }) => (
                     <FormItem className="space-y-3">
                      <FormLabel>Distance Unit</FormLabel>
                       <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    updateUserPreferences({ distanceUnit: value as 'km' | 'miles' });
                                }}
                                value={field.value}
                                className="flex space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="km" /></FormControl>
                                    <FormLabel className="font-normal">Kilometers (km)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="miles" /></FormControl>
                                    <FormLabel className="font-normal">Miles (mi)</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateFormat"
                  render={({ field }) => (
                     <FormItem className="space-y-3">
                      <FormLabel>Date Format</FormLabel>
                       <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    updateUserPreferences({ dateFormat: value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD' });
                                }}
                                value={field.value}
                                className="flex flex-col space-y-2"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="MM/DD/YYYY" /></FormControl>
                                    <FormLabel className="font-normal">MM/DD/YYYY</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="DD/MM/YYYY" /></FormControl>
                                    <FormLabel className="font-normal">DD/MM/YYYY</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="YYYY/MM/DD" /></FormControl>
                                    <FormLabel className="font-normal">YYYY/MM/DD</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
    </>
  )
}
