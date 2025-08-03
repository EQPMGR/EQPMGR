
'use client';

import { useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUrlTextContent } from './actions';
import { extractBikeDetailsFromUrlContent, type ExtractBikeDetailsOutput } from '@/ai/flows/extract-bike-details-from-url';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ImportUrlPage() {
    const [url, setUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [structuredResult, setStructuredResult] = useState<ExtractBikeDetailsOutput | null>(null);
    const { toast } = useToast();
    
    const handleExtract = async () => {
        if (!url) {
            toast({ variant: 'destructive', title: 'URL is required' });
            return;
        }
        setIsExtracting(true);
        setStructuredResult(null);
        
        try {
            toast({ title: 'Fetching page content...' });
            const textContent = await getUrlTextContent(url);
            if (!textContent) {
                 toast({ variant: 'destructive', title: 'Could not fetch content from URL.' });
                 setIsExtracting(false);
                 return;
            }
            
            toast({ title: 'AI is extracting components...', description: 'This may take a moment.' });
            const extractedData = await extractBikeDetailsFromUrlContent({ textContent });

            setStructuredResult(extractedData);
            toast({ title: 'Extraction Complete!', description: `Found ${extractedData.components.length} components.` });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Extraction Failed', description: error.message });
        } finally {
            setIsExtracting(false);
        }
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Specs from URL</CardTitle>
                <CardDescription>
                    Use AI to extract and structure bike component data from a webpage. This is a single-step process.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="url">Bike Webpage URL</Label>
                    <div className="flex gap-2">
                        <Input
                            id="url"
                            placeholder="https://www.bikemanufacturer.com/..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isExtracting}
                        />
                        <Button onClick={handleExtract} disabled={!url || isExtracting}>
                           {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                           <span className="ml-2 hidden sm:inline">Extract & Structure</span>
                        </Button>
                    </div>
                </div>

                 {isExtracting && (
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p>AI is now extracting and structuring components... this may take some time.</p>
                     </div>
                 )}
            </CardContent>
            
            {structuredResult && (
                <CardFooter>
                    <div className="w-full space-y-2">
                        <h3 className="font-semibold">Final Structured Data:</h3>
                        <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-[70vh]">
                            {JSON.stringify(structuredResult, null, 2)}
                        </pre>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
