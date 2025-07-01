
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/logo";
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

type LoginFormValues = z.infer<typeof loginSchema>
type SignUpFormValues = z.infer<typeof signupSchema>

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.87 1.62-4.42 0-7.92-3.6-7.92-8s3.5-8 7.92-8c2.3 0 3.87.87 4.75 1.72l2.28-2.28C18.43 1.95 15.82 0 12.48 0 5.88 0 .04 5.88.04 12.5s5.84 12.5 12.44 12.5c3.23 0 5.43-1.08 7.18-2.82 1.9-1.88 2.54-4.52 2.54-6.82 0-.66-.05-1.32-.15-1.98z"/>
    </svg>
  )
}

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onLoginSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await signInWithEmailPassword(data.email, data.password)
      // router push is handled by useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'An unexpected error occurred.',
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onSignupSubmit(data: SignUpFormValues) {
    setIsSubmitting(true);
    try {
      await signUpWithEmailPassword(data.email, data.password);
      toast({
        title: 'Account Created!',
        description: "You have successfully signed up.",
      })
      // router push is handled by useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred.',
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading || user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Skeleton className="h-[320px] w-[160px] rounded-lg" />
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md mx-auto p-4">
        <div className="flex justify-center mb-6">
           <Logo className="h-[320px] w-[160px]" />
        </div>
        <Tabs defaultValue="sign-in" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="create-account">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="m@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                      </Button>
                    </form>
                  </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
                  <GoogleIcon className="mr-2 h-4 w-4 fill-current" />
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="create-account">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
                <CardDescription>
                  Enter your email below to create your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="m@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                         {isSubmitting ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </form>
                  </Form>
                   <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or sign up with
                        </span>
                    </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
                        <GoogleIcon className="mr-2 h-4 w-4 fill-current" />
                        Continue with Google
                    </Button>
                  <div className="mt-4 text-center text-sm">
                    By clicking continue, you agree to our{' '}
                    <span className="underline">Terms of Service</span> and{' '}
                    <span className="underline">Privacy Policy</span>.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
