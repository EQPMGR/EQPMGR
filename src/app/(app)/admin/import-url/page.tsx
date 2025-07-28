
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Link, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getUrlTextContent } from './actions';
import { Textarea } from '@/components/ui/textarea';

export default function ImportFromUrlPage() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [extractedText, setExtractedText] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const handleFetchText = async () => {
        if (!url.trim()) {
            toast({ variant: 'destructive', title: 'URL required', description: 'Please provide a URL.' });
            return;
        }

        setIsLoading(true);
        setExtractedText(null);
        
        try {
            const content = await getUrlTextContent(url.trim());
            
            if (!content) {
                 toast({ variant: 'destructive', title: 'No Content', description: 'Could not retrieve any text from the provided URL.' });
                 return;
            }

            setExtractedText(content);
            sessionStorage.setItem('rawBikeData', content);
            toast({ title: 'Content Fetched!', description: 'You can now proceed to the component cleaner.' });

        } catch (error: any) {
            console.error('Extraction failed:', error);
            toast({
                variant: 'destructive',
                title: 'Fetch Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Step 1: Fetch Text from URL</CardTitle>
                <CardDescription>
                    Enter a URL for a bike's specification page to fetch its text content.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="url">Bike Specification URL</Label>
                    <div className="flex gap-2">
                        <Input
                            id="url"
                            placeholder="https://www.some-brand.com/bikes/model-x"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button onClick={handleFetchText} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Fetch Text</span>
                        </Button>
                    </div>
                </div>

                 {extractedText && (
                     <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-xl">Fetched Content</CardTitle>
                            <CardDescription>Review the raw text below. You will clean and structure this on the next page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           <Textarea readOnly value={extractedText} rows={10} className="font-mono text-xs" />
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => router.push('/admin/component-cleaner')}>
                                Proceed to Component Cleaner
                            </Button>
                        </CardFooter>
                     </Card>
                 )}
            </CardContent>
        </Card>
    );
}
