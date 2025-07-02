'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Camera, Loader2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CameraCapture } from "@/components/camera-capture"

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  height: z.coerce.number().positive().optional().or(z.literal('')),
  weight: z.coerce.number().positive().optional().or(z.literal('')),
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

const defaultPreferencesValues: PreferencesFormValues = {
  measurementSystem: 'metric',
  shoeSizeSystem: 'us',
  distanceUnit: 'km',
}

export default function ProfilePage() {
  const { toast } = useToast()
  const { user, updateProfileInfo, updateProfilePhoto } = useAuth();
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      height: '',
      weight: '',
      shoeSize: '',
      age: '',
    },
    mode: "onChange",
  })

  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.displayName || '',
        height: user.height || '',
        weight: user.weight || '',
        shoeSize: user.shoeSize || '',
        age: user.age || '',
      });
    }
  }, [user, profileForm]);

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: defaultPreferencesValues,
    mode: "onChange",
  })

  async function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmittingProfile(true);
    try {
      await updateProfileInfo({
          displayName: data.name,
          height: data.height || undefined,
          weight: data.weight || undefined,
          shoeSize: data.shoeSize || undefined,
          age: data.age || undefined,
      });
    } catch (error) {
      // Error is handled by the auth context's toast
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  function onPreferencesSubmit(data: PreferencesFormValues) {
    toast({
      title: "Preferences updated!",
      description: "Your preferences have been saved.",
    })
  }

  const handlePhotoUpdate = async (photoDataUrl: string) => {
    setIsUploadingPhoto(true);
    try {
        await updateProfilePhoto(photoDataUrl);
    } catch (error) {
        // Error is handled by the auth context's toast
    } finally {
        setIsUploadingPhoto(false);
    }
  };
  
  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

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
          <div className="flex flex-col items-center space-y-4 mb-8">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.photoURL || ''} alt="User avatar" key={user?.photoURL} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <CameraCapture onCapture={handlePhotoUpdate}>
              <Button type="button" variant="outline" disabled={isUploadingPhoto || isSubmittingProfile}>
                {isUploadingPhoto ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2" />
                )}
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
              </Button>
            </CameraCapture>
          </div>
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
                <FormField
                  control={profileForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="75" {...field} />
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
                      <FormLabel>Shoe Size (US)</FormLabel>
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

              <Button type="submit" disabled={isSubmittingProfile || isUploadingPhoto}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                name="distanceUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="submit">Update Preferences</Button>
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
