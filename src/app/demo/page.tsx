
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DemoHomePage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>EQPMGR Demo</CardTitle>
                    <CardDescription>
                        This is a clickable, read-only demonstration of the EQPMGR application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">
                        Click the button below to explore the features using pre-loaded sample data.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/demo/equipment">
                            View Demo Equipment
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
