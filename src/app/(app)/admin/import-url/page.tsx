
'use client';

import { useState } from 'react';
import { Bot, Loader2, Sparkles, Wand } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUrlTextContent } from './actions';
import { extractBikeDetailsFromUrlContent, type ExtractBikeDetailsOutput } from '@/ai/flows/extract-bike-details-from-url';
import { cleanComponentListFlow } from '@/ai/flows/clean-component-list';
import type { RoughComponentSchema } from '@/lib/ai-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

type BikeImportResult = Omit<ExtractBikeDetailsOutput, 'components'> & {
    components: z.infer<typeof RoughComponentSchema>[];
};


export default function ImportUrlPage() {
    const [url, setUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [rawExtract, setRawExtract] = useState<BikeImportResult | null>(null);
    const [cleanedResult, setCleanedResult] = useState<any | null>(null);
    const { toast } = useToast();
    
    const handleExtract = async () => {
        if (!url) {
            toast({ variant: 'destructive', title: 'URL is required' });
            return;
        }
        setIsExtracting(true);
        setRawExtract(null);
        setCleanedResult(null);
        
        try {
            const textContent = await getUrlTextContent(url);
            if (!textContent) {
                 toast({ variant: 'destructive', title: 'Could not fetch content from URL.' });
                 setIsExtracting(false);
                 return;
            }
            
            const extractedData = await extractBikeDetailsFromUrlContent({ textContent });
            setRawExtract(extractedData as BikeImportResult);
            toast({ title: 'Initial extraction successful!' });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Extraction Failed', description: error.message });
        } finally {
            setIsExtracting(false);
        }
    }

    const handleClean = async () => {
        if (!rawExtract) return;
        setIsCleaning(true);
        setCleanedResult(null);

        try {
            const result = await cleanComponentListFlow({ components: rawExtract.components });
            const finalResult = {
                brand: rawExtract.brand,
                model: rawExtract.model,
                modelYear: rawExtract.modelYear,
                components: result.components
            };
            setCleanedResult(finalResult);
             toast({ title: 'Data cleaned successfully!' });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Cleaning Failed', description: error.message });
        } finally {
            setIsCleaning(false);
        }
    }


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Specs from URL</CardTitle>
                <CardDescription>
                    Use AI to extract and structure bike component data from a webpage.
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
                            disabled={isExtracting || isCleaning}
                        />
                        <Button onClick={handleExtract} disabled={!url || isExtracting || isCleaning}>
                           {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                           <span className="ml-2 hidden sm:inline">Extract</span>
                        </Button>
                    </div>
                </div>

                {rawExtract && (
                    <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Initial Extraction Complete</AlertTitle>
                        <AlertDescription>
                           <p>Found {rawExtract.components.length} potential components. Now, clean the data to structure it.</p>
                           <Button 
                                size="sm" 
                                className="mt-4" 
                                onClick={handleClean} 
                                disabled={isCleaning}
                            >
                               {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand className="h-4 w-4" />}
                                <span className="ml-2">Clean Data</span>
                           </Button>
                        </AlertDescription>
                    </Alert>
                )}

                 {isCleaning && (
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p>AI is now structuring and cleaning each component... this may take some time.</p>
                     </div>
                 )}
            </CardContent>
            
            {cleanedResult && (
                <CardFooter>
                    <div className="w-full space-y-2">
                        <h3 className="font-semibold">Final Structured Data:</h3>
                        <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                            {JSON.stringify(cleanedResult, null, 2)}
                        </pre>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

