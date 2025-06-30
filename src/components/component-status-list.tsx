import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Component } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ComponentStatusListProps {
  components: Component[];
}

const getProgressColor = (wear: number) => {
  if (wear > 90) return 'bg-destructive';
  if (wear > 70) return 'bg-primary'; // Orange from our theme
  return 'bg-green-500';
};

export function ComponentStatusList({ components }: ComponentStatusListProps) {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {components.map((component) => (
          <Tooltip key={component.id}>
            <TooltipTrigger className="w-full text-left">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{component.name}</p>
                <p className="text-sm text-muted-foreground">{component.wearPercentage}%</p>
              </div>
              <Progress
                value={component.wearPercentage}
                className="h-2"
                indicatorClassName={getProgressColor(component.wearPercentage)}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{component.name} wear is at {component.wearPercentage}%.</p>
              <p>Purchased: {new Date(component.purchaseDate).toLocaleDateString()}</p>
              {component.lastServiceDate && <p>Last Service: {new Date(component.lastServiceDate).toLocaleDateString()}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
