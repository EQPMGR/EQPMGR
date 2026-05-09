"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function ImportTextPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();

    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [textContent, setTextContent] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [structuredResult, setStructuredResult] = useState<any | null>(null);

    async function handleExtract() {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in to use this feature.' });
            return;
        }

        setIsExtracting(true);

        try {
            const idToken = await user.getIdToken(true);
            const requestBody = {
                text: textContent,
                brand: brand || undefined,
                model: model || undefined,
                year: year ? Number(year) : undefined,
            };
            const resp = await fetch('/api/admin/import-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(requestBody),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to extract text');
            }

            const responseBody = await resp.json();
            setStructuredResult(responseBody.result || responseBody.parsed || null);
        } catch (error: any) {
            console.error('Import extract error:', error);
            toast({ variant: 'destructive', title: 'Extraction failed', description: error.message || 'Unknown error' });
        } finally {
            setIsExtracting(false);
        }
    }

    const handleContinueToForm = () => {
        if (structuredResult) {
            try {
                const dataToStore = {
                    rawText: textContent,
                    aiOutput: structuredResult,
                };
                sessionStorage.setItem('importedBikeData', JSON.stringify(dataToStore));
                router.push('/admin/add-bike-model');
            } catch (error) {
                console.error('Failed to save data to sessionStorage:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not pass data to the form. Please try again.' });
            }
        }
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Import Bike Specs from Text</CardTitle>
                <CardDescription>
                    Use the built-in text parser to extract bike component data. Paste the product page text below and review the structured result.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                                id="brand"
                                placeholder="e.g. Norco"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                disabled={isExtracting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">Model</Label>
                            <Input
                                id="model"
                                placeholder="e.g. Threshold Cross"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                disabled={isExtracting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                type="number"
                                placeholder="e.g. 2024"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                disabled={isExtracting}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        These fields help the parser when the spec sheet does not include the bike's make, model, or year.
                        Fill in any known values before extracting.
                    </p>
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
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={handleExtract} disabled={!textContent || isExtracting} className="self-start">
                                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                <span className="ml-2">Extract & Structure</span>
                            </Button>
                            {structuredResult && (
                                <Button variant="secondary" onClick={handleContinueToForm} className="self-start">
                                    <Send className="mr-2 h-4 w-4" />
                                    Continue to Form
                                </Button>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Extract & Structure is a work in progress. Please double-check all components before hitting Add Bike Model.
                        </p>
                        {structuredResult && (
                            <p className="text-sm text-foreground">Extraction complete — you can continue to the Add Bike Model form.</p>
                        )}
                    </div>
                </div>

                {isExtracting && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p>Parsing and structuring bike spec data...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
