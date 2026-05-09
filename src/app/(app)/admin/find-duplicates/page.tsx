
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, SearchCheck, CheckCircle } from 'lucide-react';
import { findDuplicateMasterComponents, type DuplicateGroup } from '@/services/duplicates';
import { mergeDuplicateComponents, ignoreDuplicateGroup } from './actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type ActionStatus = {
  isLoading: boolean;
  groupId: string | null;
  action: 'merge' | 'ignore' | null;
};

export default function FindDuplicatesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>({ isLoading: false, groupId: null, action: null });
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [primarySelections, setPrimarySelections] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleFindDuplicates = async () => {
    setIsLoading(true);
    setDuplicateGroups([]);
    setPrimarySelections({});
    try {
      const duplicates = await findDuplicateMasterComponents();
      
      const initialSelections: { [key: string]: string } = {};
      duplicates.forEach(group => {
        initialSelections[group.key] = group.components[0].id;
      });
      setPrimarySelections(initialSelections);

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
  
  const handleSelectionChange = (groupKey: string, componentId: string) => {
    setPrimarySelections(prev => ({ ...prev, [groupKey]: componentId }));
  };

  const handleMerge = async (group: DuplicateGroup) => {
    const primaryId = primarySelections[group.key];
    if (!primaryId) {
        toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a primary component to merge into.' });
        return;
    }
    setActionStatus({ isLoading: true, groupId: group.key, action: 'merge' });
    const idsToMerge = group.components.map(c => c.id);
    const result = await mergeDuplicateComponents(primaryId, idsToMerge);
    if (result.success) {
      toast({ title: 'Merge Successful!', description: result.message });
      setDuplicateGroups(prev => prev.filter(g => g.key !== group.key));
    } else {
      toast({ variant: 'destructive', title: 'Merge Failed', description: result.message });
    }
    setActionStatus({ isLoading: false, groupId: null, action: null });
  };
  
  const handleIgnore = async (group: DuplicateGroup) => {
    setActionStatus({ isLoading: true, groupId: group.key, action: 'ignore' });
    const result = await ignoreDuplicateGroup(group.key);
     if (result.success) {
      toast({ title: 'Group Ignored', description: result.message });
      setDuplicateGroups(prev => prev.filter(g => g.key !== group.key));
    } else {
      toast({ variant: 'destructive', title: 'Action Failed', description: result.message });
    }
    setActionStatus({ isLoading: false, groupId: null, action: null });
  };


  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Find Duplicate Components</CardTitle>
        <CardDescription>
          Scan the `masterComponents` database to find items that might be duplicates based on name, brand, and series. This tool ignores items that do not have a brand/series.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleFindDuplicates} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}
          {isLoading ? 'Scanning...' : 'Scan for Duplicates'}
        </Button>

        {duplicateGroups.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Potential Duplicates ({duplicateGroups.length} groups)</h3>
             <Accordion type="multiple" className="w-full space-y-4">
               {duplicateGroups.map((group, index) => (
                  <AccordionItem value={`item-${index}`} key={group.key} className="border rounded-lg px-4">
                    <AccordionTrigger>
                      <div className="text-left">
                        <p className="font-semibold">{group.key.split('|').join(' - ')}</p>
                        <p className="text-sm text-muted-foreground">{group.components.length} components found</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <RadioGroup
                        value={primarySelections[group.key]}
                        onValueChange={(id) => handleSelectionChange(group.key, id)}
                        className="space-y-2 mb-4"
                      >
                        {group.components.map(component => (
                          <Label key={component.id} htmlFor={component.id} className="text-sm p-3 border rounded-md flex items-center gap-4 has-[:checked]:bg-muted">
                            <RadioGroupItem value={component.id} id={component.id} />
                            <div>
                                <p><strong>ID:</strong> {component.id}</p>
                                <p><strong>Model:</strong> {component.model || 'N/A'}, <strong>Size:</strong> {component.size || 'N/A'}</p>
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                       <div className="mt-4 flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleMerge(group)}
                            disabled={actionStatus.isLoading}
                          >
                            {actionStatus.isLoading && actionStatus.groupId === group.key && actionStatus.action === 'merge' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Merge into Selected
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleIgnore(group)}
                            disabled={actionStatus.isLoading}
                          >
                             {actionStatus.isLoading && actionStatus.groupId === group.key && actionStatus.action === 'ignore' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ignore (Not Duplicates)
                          </Button>
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
