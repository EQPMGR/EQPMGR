
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { getUrlTextContent } from './actions';
import { Textarea } from '@/components/ui/textarea';

export default function ImportFromUrlPage() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [textContent, setTextContent] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    const handleFetchText = async () => {
        if (!url.trim()) {
            toast({ variant: 'destructive', title: 'URL required', description: 'Please provide a URL.' });
            return;
        }

        setIsLoading(true);
        setTextContent('');
        
        try {
            const content = await getUrlTextContent(url.trim());
            
            if (!content) {
                 toast({ variant: 'destructive', title: 'No Content', description: 'Could not retrieve any text from the provided URL.' });
                 return;
            }

            setTextContent(content);
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

    const handleProceed = () => {
        if (!textContent.trim()) {
            toast({ variant: 'destructive', title: 'No Content', description: 'Please paste or fetch some text before proceeding.' });
            return;
        }
        sessionStorage.setItem('rawBikeData', textContent);
        router.push('/admin/component-cleaner');
    }
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Step 1: Get Component Text</CardTitle>
                <CardDescription>
                    Enter a URL to fetch specs automatically, or paste the text directly into the text area below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="url">Bike Specification URL (Optional)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="url"
                            placeholder="https://www.some-brand.com/bikes/model-x"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button onClick={handleFetchText} disabled={isLoading || !url.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Fetch</span>
                        </Button>
                    </div>
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="raw-text">Component Specification Text</Label>
                    <Textarea 
                        id="raw-text"
                        value={textContent} 
                        onChange={(e) => setTextContent(e.target.value)} 
                        rows={15} 
                        className="font-mono text-xs"
                        placeholder="Paste bike specifications here..."
                    />
                </div>
            </CardContent>
             <CardFooter className="flex-col items-stretch gap-4">
                <Button onClick={handleProceed} disabled={!textContent.trim()}>
                    Proceed to Component Cleaner
                </Button>
            </CardFooter>
        </Card>
    );
}
