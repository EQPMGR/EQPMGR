
'use client';

import { useState } from 'react';
import { cleanComponentList } from '@/ai/flows/clean-component-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function ComponentCleanerPage() {
    const [rawText, setRawText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [structuredData, setStructuredData] = useState<string>('');
    const { toast } = useToast();

    const handleCleanList = async () => {
        if (!rawText.trim()) {
            toast({ variant: 'destructive', title: 'Input required', description: 'Please paste the list of components.' });
            return;
        }

        setIsLoading(true);
        setStructuredData('');
        
        try {
            const result = await cleanComponentList(rawText.trim());
            setStructuredData(result.structuredData);
            toast({ title: 'Cleaning Successful!', description: 'The component list has been structured.' });
        } catch (error: any) {
            console.error('Cleaning failed:', error);
            toast({
                variant: 'destructive',
                title: 'Cleaning Failed',
                description: error.message || 'An unexpected error occurred while cleaning the list.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>AI Component Cleaner</CardTitle>
                <CardDescription>
                    Paste a raw, semi-structured list of components. The AI will attempt to parse it into a clean, structured format based on the examples it has been trained on.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div className="grid gap-2">
                    <Label htmlFor="raw-text">Raw Component List</Label>
                    <Textarea
                        id="raw-text"
                        placeholder="Paste your component list here..."
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        disabled={isLoading}
                        rows={15}
                    />
                </div>

                <Button onClick={handleCleanList} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    <span className="ml-2">Clean List</span>
                </Button>

                 {structuredData && (
                     <div className="grid gap-2">
                        <Label htmlFor="structured-data">Structured Data (CSV Format)</Label>
                        <Textarea
                            id="structured-data"
                            readOnly
                            value={structuredData}
                            rows={20}
                            className="font-mono text-xs"
                        />
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
