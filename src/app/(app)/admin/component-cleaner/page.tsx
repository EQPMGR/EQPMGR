
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, PartyPopper, Info } from 'lucide-react';
import { extractBikeDetailsFromUrlContent } from '@/ai/flows/extract-bike-details-from-url';
import { cleanComponentListFlow } from '@/ai/flows/clean-component-list';
import type { ExtractBikeDetailsOutput } from '@/lib/ai-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ComponentCleanerPage() {
    const [rawText, setRawText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [extractedJson, setExtractedJson] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const storedData = sessionStorage.getItem('rawBikeData');
        if (storedData) {
            setRawText(storedData);
        }
    }, []);

    const handleCleanAndStructure = async () => {
        if (!rawText.trim()) {
            toast({ variant: 'destructive', title: 'No text to process' });
            return;
        }
        setIsLoading(true);
        setIsDone(false);
        setExtractedJson('');
        try {
            // Step 1: Perform the initial rough extraction
            setStatusMessage('Step 1: Performing initial component extraction...');
            const roughResult = await extractBikeDetailsFromUrlContent({ textContent: rawText });

            if (!roughResult || !roughResult.components || roughResult.components.length === 0) {
                 throw new Error("Initial extraction failed to find any components.");
            }
            
            // Step 2: Clean the extracted component list
            setStatusMessage(`Step 2: Cleaning and structuring ${roughResult.components.length} components... (This may take a minute)`);
            const finalResult = await cleanComponentListFlow({ components: roughResult.components });

            // Combine the results into the final format expected by the form
            const finalOutput: ExtractBikeDetailsOutput = {
                brand: roughResult.brand,
                model: roughResult.model,
                modelYear: roughResult.modelYear,
                components: finalResult.components,
            };

            const resultJson = JSON.stringify(finalOutput, null, 2);
            setExtractedJson(resultJson);
            
            // Store the final structured data in sessionStorage
            sessionStorage.setItem('importedBikeData', resultJson);

            toast({ title: 'Success!', description: 'Components have been structured.' });
            setIsDone(true);
        } catch (error: any) {
            console.error('Structuring failed:', error);
            toast({ variant: 'destructive', title: 'Structuring Failed', description: error.message });
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    };
    
    const handleProceed = () => {
        // Data is already in session storage from the extraction step.
        router.push('/admin/add-bike-model');
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Step 2: Clean and Structure Components</CardTitle>
                <CardDescription>
                    The raw text from the URL is below. Use the AI to clean it up and extract the structured component data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="raw-text">Raw Specification Text</Label>
                    <Textarea
                        id="raw-text"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={10}
                        className="font-mono text-xs"
                    />
                </div>
                 {isLoading && statusMessage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p>{statusMessage}</p>
                    </div>
                )}
                {extractedJson && (
                    <div className="space-y-2">
                        <Label htmlFor="json-output">AI Extracted JSON</Label>
                        <Textarea
                            id="json-output"
                            readOnly
                            value={extractedJson}
                            rows={15}
                            className="font-mono text-xs bg-muted/50"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
                {!isDone ? (
                    <Button onClick={handleCleanAndStructure} disabled={isLoading || !rawText.trim()}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Processing...' : 'Clean and Structure with AI'}
                    </Button>
                ) : (
                    <div className="p-4 border rounded-lg text-center bg-green-50 dark:bg-green-950">
                        <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <h3 className="font-semibold">Extraction Complete!</h3>
                        <p className="text-sm text-muted-foreground mb-4">The data has been saved and is ready to be loaded into the form.</p>
                        <Button onClick={handleProceed}>
                            Proceed to Form
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
