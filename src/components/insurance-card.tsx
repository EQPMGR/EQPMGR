
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { InsuranceQuoteButton } from "./insurance-quote-button";

export function InsuranceCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Bicycle Insurance</CardTitle>
                <CardDescription>
                    Protect your ride with comprehensive coverage from our partners. Check if service is available in your area.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <InsuranceQuoteButton />
            </CardContent>
        </Card>
    )
}
