
'use client';

import { useState } from 'react';
import { Bot, Loader2, Sparkles, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/use-toast';
import { extractBikeDetailsFromUrlContent, type ExtractBikeDetailsOutput } from '@/ai/flows/extract-bike-details-from-url';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ImportTextPage() {
    const [textContent, setTextContent] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [structuredResult, setStructuredResult] = useState<ExtractBikeDetailsOutput | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    
    const handleExtract = async () => {
        if (!textContent) {
            toast({ variant: 'destructive', title: 'Pasted content is required' });
            return;
        }
        setIsExtracting(true);
        setStructuredResult(null);
        
        try {
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
    
    const handleContinueToForm = () => {
        if (structuredResult) {
            try {
                // Store all relevant data for the form and for training data collection
                const dataToStore = {
                    rawText: textContent,
                    aiOutput: structuredResult,
                };
                sessionStorage.setItem('importedBikeData', JSON.stringify(dataToStore));
                router.push('/admin/add-bike-model');
            } catch (error) {
                console.error('Failed to save data to sessionStorage:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not pass data to the form. Please try again.',
                });
            }
        }
    };


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Specs from Text</CardTitle>
                <CardDescription>
                    Use AI to extract and structure bike component data. Copy the text from a bike's webpage and paste it below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="textContent">Pasted Webpage Text</Label>
                    <div className="flex flex-col gap-2">
                        <Textarea
                            id="textContent"
                            placeholder="Paste the full text content from the bike's product page here..."
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            disabled={isExtracting}
                            rows={15}
                        />
                        <Button onClick={handleExtract} disabled={!textContent || isExtracting} className="self-start">
                           {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                           <span className="ml-2">Extract & Structure</span>
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
                <CardFooter className="flex-col items-start gap-4">
                     <div className="w-full space-y-2">
                        <h3 className="font-semibold">Review Extracted Data:</h3>
                        <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-[50vh]">
                            {JSON.stringify(structuredResult, null, 2)}
                        </pre>
                    </div>
                    <Button onClick={handleContinueToForm} className="self-end">
                        <Send className="mr-2 h-4 w-4" />
                        Continue to Form
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
