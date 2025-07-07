
'use client';

import { useState } from 'react';
import { extractBikeDetailsFromUrlContent } from '@/ai/flows/extract-bike-details-from-url';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getUrlTextContent } from './actions';


export default function ImportFromUrlPage() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractBikeDetailsOutput | null>(null);
    const { toast } = useToast();

    const handleExtract = async () => {
        if (!url) {
            toast({ variant: 'destructive', title: 'URL is required' });
            return;
        }
        setIsLoading(true);
        setExtractedData(null);
        try {
            const textContent = await getUrlTextContent(url);
            const result = await extractBikeDetailsFromUrlContent({ textContent });
            setExtractedData(result);
            toast({ title: 'Extraction Successful!', description: `Found ${result.components.length} components.` });
        } catch (error: any) {
            console.error('Extraction failed:', error);
            toast({
                variant: 'destructive',
                title: 'Extraction Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const encodedData = extractedData ? encodeURIComponent(JSON.stringify(extractedData)) : '';

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Model from URL</CardTitle>
                <CardDescription>
                    Let AI read a bike's specification page and extract its details to pre-fill the form.
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
                        <Button onClick={handleExtract} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                            <span className="ml-2">Extract</span>
                        </Button>
                    </div>
                </div>
                 {isLoading && (
                     <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p>AI is reading the page... this may take a moment.</p>
                     </div>
                 )}
                 {extractedData && (
                     <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-xl">Extraction Result</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Brand:</strong> {extractedData.brand}</p>
                            <p><strong>Model:</strong> {extractedData.model} ({extractedData.modelYear})</p>
                            <p><strong>Type:</strong> {extractedData.type}</p>
                            <p><strong>Components Found:</strong> {extractedData.components.length}</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild>
                                <Link href={`/admin/add-bike-model?data=${encodedData}`}>
                                    Proceed to Form <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                     </Card>
                 )}
                 <Alert>
                    <AlertTitle>How does this work?</AlertTitle>
                    <AlertDescription>
                        This tool fetches the text content from the URL you provide and sends it to an AI agent. The agent is instructed to find and structure the bike's specifications. Results may vary based on the website's format.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
}
