"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Send, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    const [importInfo, setImportInfo] = useState<{ method: 'ai' | 'parser'; fallbackReason: string | null; existingBike: any } | null>(null);

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
            const resp = await fetch('/api/bike-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(requestBody),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to extract text');
            }

            const responseBody = await resp.json();
            setStructuredResult(responseBody.result || null);
            setImportInfo({ method: responseBody.method, fallbackReason: responseBody.fallbackReason, existingBike: responseBody.existingBike });
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
                router.push(`/add-bike-model${window.location.search.includes('catalog=1') ? '?catalog=1' : ''}`);
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

                {structuredResult && importInfo && <ImportReview result={structuredResult} info={importInfo} />}

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

const CONFIDENCE_STYLE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    high: 'secondary', medium: 'outline', low: 'destructive',
};

/** What was read from the page, before it goes into the form. */
function ImportReview({ result, info }: { result: any; info: { method: 'ai' | 'parser'; fallbackReason: string | null; existingBike: any } }) {
    const parts: any[] = result.components || [];
    const matched = parts.filter((p) => p.catalogMatch).length;
    const uncertain = parts.filter((p) => p.confidence === 'low' || p.confidence === 'medium').length;

    return (
        <div className="space-y-4 border-t pt-4">
            {info.existingBike && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                    <strong>{info.existingBike.brand} {info.existingBike.model}{info.existingBike.model_year ? ` (${info.existingBike.model_year})` : ''}</strong>{' '}
                    is already in the bike catalog. Add it from <Link href="/equipment" className="underline">My Equipment → Add Equipment</Link> instead of creating a duplicate.
                </div>
            )}
            {info.method === 'parser' && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    <AlertTriangle className="mr-1 inline h-4 w-4" />
                    Read with the basic parser{info.fallbackReason ? ` (${info.fallbackReason})` : ''}. Expect gaps; check every part in the form.
                </div>
            )}
            <div>
                <p className="font-medium">
                    {[result.brand, result.model, result.modelYear].filter(Boolean).join(' ') || 'Unnamed bike'}
                    {result.type ? <span className="text-muted-foreground"> · {result.type}</span> : null}
                    {result.isEbike ? <span className="text-muted-foreground"> · e-bike</span> : null}
                </p>
                <p className="text-sm text-muted-foreground">
                    {parts.length} parts found · {matched} already in the parts catalog · {parts.length - matched} new
                    {uncertain > 0 ? ` · ${uncertain} to double-check` : ''}
                </p>
            </div>
            {result.warnings?.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {result.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Part</th>
                            <th className="py-2 pr-3 font-medium">Brand / series / model</th>
                            <th className="py-2 pr-3 font-medium">Details</th>
                            <th className="py-2 pr-3 font-medium">Catalog</th>
                            <th className="py-2 font-medium">Read</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((p, i) => (
                            <tr key={i} className="border-b last:border-0 align-top" title={p.sourceText ? `From the page: ${p.sourceText}` : undefined}>
                                <td className="py-2 pr-3 font-medium">{p.name}</td>
                                <td className="py-2 pr-3">{[p.brand, p.series, p.model].filter(Boolean).join(' · ') || '–'}</td>
                                <td className="py-2 pr-3 text-muted-foreground">{p.size || '–'}</td>
                                <td className="py-2 pr-3">
                                    {p.catalogMatch
                                        ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> {p.catalogMatch.kind === 'exact' ? 'In catalog' : 'Likely match'}</span>
                                        : <span className="inline-flex items-center gap-1 text-muted-foreground"><PlusCircle className="h-4 w-4" /> New</span>}
                                </td>
                                <td className="py-2">{p.confidence ? <Badge variant={CONFIDENCE_STYLE[p.confidence] ?? 'outline'}>{p.confidence === 'high' ? 'Clear' : p.confidence === 'medium' ? 'Check' : 'Unsure'}</Badge> : null}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">Hover a row to see the line it was read from. You can fix anything in the next step.</p>
        </div>
    );
}
