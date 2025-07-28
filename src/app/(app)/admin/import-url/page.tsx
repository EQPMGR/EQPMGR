
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractBikeDetailsFromUrlContent } from '@/ai/flows/extract-bike-details-from-url';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getUrlTextContent } from './actions';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function ImportFromUrlPage() {
    const [url, setUrl] = useState('');
    const [textContent, setTextContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractBikeDetailsOutput | null>(null);
    const { toast } = useToast();
    const router = useRouter();

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
                toast({ variant: 'destructive', title: 'Input required', description: 'Please provide a URL or paste text content.' });
                setIsLoading(false);
                return;
            }

            if (!contentToProcess) {
                 toast({ variant: 'destructive', title: 'No Content', description: 'Could not retrieve any text from the provided source. Try pasting the text directly.' });
                 setIsLoading(false);
                 return;
            }

            const result = await extractBikeDetailsFromUrlContent({ 
                textContent: contentToProcess,
            });

            setExtractedData(result);
            // Save initial AI output for RLHF data collection
            sessionStorage.setItem('aiInitialExtraction', JSON.stringify({
                prompt: contentToProcess,
                completion: result,
            }));
            // Save data to pre-fill the form
            sessionStorage.setItem('importedBikeData', JSON.stringify(result));
            toast({ title: 'Extraction Successful!' });

        } catch (error: any) {
            console.error('Extraction failed:', error);
            let description = error.message || 'An unexpected error occurred.';
            if (error.message && (error.message.includes('API_KEY_SERVICE_BLOCKED') || error.message.includes('SERVICE_DISABLED'))) {
                description = "The AI service is blocked. Please ensure the 'Generative Language API' is enabled for your project AND added to your API key's restrictions in the Google Cloud Console.";
            }
             if (error.message && error.message.includes('vector index')) {
                description = "Could not connect to the vector database. Please ensure your Firestore vector index is created and active.";
            }
            toast({
                variant: 'destructive',
                title: 'Extraction Failed',
                description: description,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceed = () => {
        router.push('/admin/add-bike-model');
    };
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Model from URL or Text</CardTitle>
                <CardDescription>
                    Let AI read a bike's specification page and extract its details to pre-fill the form. It will use the existing component database to improve accuracy.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="url">Bike Specification URL</Label>
                    <Input
                        id="url"
                        placeholder="https://www.some-brand.com/bikes/model-x"
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
                        placeholder="Paste the bike's specs here..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        disabled={isLoading}
                        rows={8}
                    />
                </div>

                <div className="pt-2">
                    <Button onClick={handleExtract} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        <span className="ml-2">Extract Details</span>
                    </Button>
                </div>

                 {isLoading && (
                     <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p>AI is reading the provided content... this may take a moment.</p>
                     </div>
                 )}
                 {extractedData && (
                     <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-xl">Extraction Result</CardTitle>
                            <CardDescription>Review the extracted data below. You can make corrections on the next screen.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           <pre className="whitespace-pre-wrap font-mono text-xs bg-slate-950 p-4 rounded-md text-white max-h-64 overflow-auto">{JSON.stringify(extractedData, null, 2)}</pre>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleProceed}>
                                Proceed to Form
                            </Button>
                        </CardFooter>
                     </Card>
                 )}
                 <Alert>
                    <AlertTitle>How does this work?</AlertTitle>
                    <AlertDescription>
                        Provide a URL or paste raw text. The AI will read the content and attempt to structure the bike's specs. Pasting text is often more reliable than using a URL, as some websites block automated fetching.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
