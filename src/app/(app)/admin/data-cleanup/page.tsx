
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { removeAllEmbeddingsAction } from './actions';


export default function DataCleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRemoveEmbeddings = async () => {
    setIsLoading(true);
    try {
      const result = await removeAllEmbeddingsAction();
      if (result.success) {
        toast({
          title: 'Cleanup Successful!',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Cleanup Failed',
          description: result.message,
        });
      }
    } catch (error: any) {
      console.error("Failed to run cleanup action:", error);
      toast({
        variant: 'destructive',
        title: 'Action Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Data Cleanup Tools</CardTitle>
        <CardDescription>
          Run powerful, one-off scripts to manage your database. Use with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border-destructive/50">
            <CardHeader>
                <div className="flex items-start gap-4">
                    <ShieldAlert className="h-8 w-8 text-destructive flex-shrink-0" />
                    <div>
                        <CardTitle>Remove All Vector Embeddings</CardTitle>
                        <CardDescription>
                           This action will iterate through every document in the `masterComponents` collection and permanently delete the `embedding` field.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {isLoading ? 'Processing...' : 'Remove All Embeddings'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is a destructive and irreversible action. It will remove the `embedding` field from all components. This is useful for cleaning up data but will require re-indexing later. Do you want to proceed?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveEmbeddings}>
                            Yes, delete all embeddings
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
