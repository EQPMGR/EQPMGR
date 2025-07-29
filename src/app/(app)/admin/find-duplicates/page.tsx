'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, SearchCheck, CheckCircle } from 'lucide-react';
import { findDuplicateMasterComponents, type DuplicateGroup } from '@/services/duplicates';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export default function FindDuplicatesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const { toast } = useToast();

  const handleFindDuplicates = async () => {
    setIsLoading(true);
    setDuplicateGroups([]);
    try {
      const duplicates = await findDuplicateMasterComponents();
      setDuplicateGroups(duplicates);
      if (duplicates.length === 0) {
        toast({
          title: 'No Duplicates Found!',
          description: 'The master component database looks clean.',
        });
      } else {
         toast({
          title: `Found ${duplicates.length} potential duplicate groups.`,
          description: 'Review the items below.',
        });
      }
    } catch (error: any) {
      console.error("Failed to find duplicates:", error);
      toast({
        variant: 'destructive',
        title: 'Error Finding Duplicates',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Find Duplicate Components</CardTitle>
        <CardDescription>
          Scan the `masterComponents` database to find items that might be duplicates based on name, brand, and series.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleFindDuplicates} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SearchCheck className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Scanning...' : 'Scan for Duplicates'}
        </Button>

        {duplicateGroups.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Potential Duplicates ({duplicateGroups.length} groups)</h3>
             <Accordion type="multiple" className="w-full space-y-4">
               {duplicateGroups.map((group, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border rounded-lg px-4">
                    <AccordionTrigger>
                      <div className="text-left">
                        <p className="font-semibold">{group.key.split('|').join(' - ')}</p>
                        <p className="text-sm text-muted-foreground">{group.components.length} components found</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {group.components.map(component => (
                          <li key={component.id} className="text-sm p-2 border-b">
                            <strong>ID:</strong> {component.id} <br/>
                            <strong>Model:</strong> {component.model || 'N/A'}, <strong>Size:</strong> {component.size || 'N/A'}
                          </li>
                        ))}
                      </ul>
                       <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="outline" disabled>Merge (soon)</Button>
                          <Button size="sm" variant="destructive" disabled>Delete (soon)</Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
               ))}
             </Accordion>
          </div>
        )}
         { !isLoading && duplicateGroups.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No duplicates found</h3>
                <p className="mt-1 text-sm text-gray-500">Run a scan to check the database.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
