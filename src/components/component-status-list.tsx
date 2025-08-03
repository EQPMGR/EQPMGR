import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Component } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/date-utils';

interface ComponentStatusListProps {
  components: Component[];
}

const getProgressColor = (wear: number) => {
  if (wear > 90) return 'bg-destructive';
  if (wear > 70) return 'bg-accent';
  return 'bg-primary';
};

export function ComponentStatusList({ components }: ComponentStatusListProps) {
  const { user } = useAuth();
  
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {components.map((component) => (
          <Tooltip key={component.userComponentId}>
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
              <p className="font-semibold">{component.brand} {component.model}</p>
              <p>{component.wearPercentage}% wear.</p>
              <p>Purchased: {formatDate(component.purchaseDate, user?.dateFormat)}</p>
              {component.lastServiceDate && <p>Last Service: {formatDate(component.lastServiceDate, user?.dateFormat)}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
