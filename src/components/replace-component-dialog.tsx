'use client';

import { useState } from 'react';
import { Bot, Loader2, Replace } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUrlTextContent } from '@/app/(app)/admin/import-url/actions';
import { extractComponentDetails } from '@/ai/flows/extract-component-details';
import type { ExtractComponentDetailsOutput } from '@/ai/flows/extract-component-details';
import { replaceUserComponentAction } from '@/app/(app)/equipment/[id]/actions';
import type { Component } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';

interface ReplaceComponentDialogProps {
  userId?: string;
  equipmentId: string;
  componentToReplace: Component;
  onSuccess: () => void;
}

export function ReplaceComponentDialog({
  userId,
  equipmentId,
  componentToReplace,
  onSuccess,
}: ReplaceComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractComponentDetailsOutput | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state on close
      setUrl('');
      setTextContent('');
      setIsLoading(false);
      setIsReplacing(false);
      setExtractedData(null);
    }
  };

  const handleExtract = async () => {
    setIsLoading(true);
    setExtractedData(null);

    try {
      let contentToProcess = '';
      if (textContent.trim()) {
        contentToProcess = textContent.trim();
      } else if (url.trim()) {
        contentToProcess = await getUrlTextContent(url.trim());
      } else {
        toast({
          variant: 'destructive',
          title: 'Input required',
          description: 'Please provide a URL or paste text content.',
        });
        setIsLoading(false);
        return;
      }

      if (!contentToProcess) {
        toast({
          variant: 'destructive',
          title: 'No Content',
          description: 'Could not retrieve any text from the provided source. Try pasting text.',
        });
        setIsLoading(false);
        return;
      }

      const result = await extractComponentDetails({ textContent: contentToProcess, originalSystem: componentToReplace.system });
      setExtractedData(result);
      toast({ title: 'Extraction Successful!' });
    } catch (error: any) {
      console.error('Extraction failed:', error);
      toast({ variant: 'destructive', title: 'Extraction Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmReplacement = async () => {
    if (!userId || !extractedData) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or component data is missing.' });
      return;
    }
    setIsReplacing(true);
    try {
      await replaceUserComponentAction({
          userId,
          equipmentId,
          userComponentIdToReplace: componentToReplace.userComponentId,
          newComponentData: extractedData
      });
      toast({ title: 'Component Replaced!', description: `${componentToReplace.name} has been replaced with ${extractedData.name}.` });
      onSuccess(); // Callback to re-fetch data on the parent page
      handleOpenChange(false);
    } catch (error: any) {
       console.error('Replacement failed:', error);
       toast({ variant: 'destructive', title: 'Replacement Failed', description: error.message });
    } finally {
        setIsReplacing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Replace className="mr-2 h-4 w-4" />
          Replace Part
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace: {componentToReplace.name}</DialogTitle>
          <DialogDescription>
            Use AI to extract info for the new component from a URL or text.
          </DialogDescription>
        </DialogHeader>

        {!extractedData ? (
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                    <Label htmlFor="url">New Component URL</Label>
                    <Input
                        id="url"
                        placeholder="https://www.some-store.com/parts/new-part"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                
                <div className="flex items-center space-x-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="text-content">Paste Raw Text</Label>
                    <Textarea
                        id="text-content"
                        placeholder="Paste the component's specs here..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        disabled={isLoading}
                        rows={6}
                    />
                </div>
            </div>
        ) : (
            <div className="space-y-2 py-4">
                <h4 className="font-semibold">Confirm Extracted Data</h4>
                <div className="p-3 border rounded-md bg-muted/50">
                    <pre className="whitespace-pre-wrap font-mono text-xs max-h-60 overflow-auto">{JSON.stringify(extractedData, null, 2)}</pre>
                </div>
                 <p className="text-sm text-muted-foreground pt-2">Does this look correct? If so, confirm to finalize the replacement.</p>
            </div>
        )}
        

        <DialogFooter>
          {!extractedData ? (
             <Button onClick={handleExtract} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                <span className="ml-2">Extract Details</span>
            </Button>
          ) : (
            <>
                <Button variant="outline" onClick={() => setExtractedData(null)} disabled={isReplacing}>
                    Back
                </Button>
                <Button onClick={handleConfirmReplacement} disabled={isReplacing}>
                    {isReplacing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirm Replacement
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
