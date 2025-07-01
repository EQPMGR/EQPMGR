'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import type { MaintenanceLog as MaintenanceLogType } from '@/lib/types';
import { AddMaintenanceLogDialog } from './add-maintenance-log-dialog';
import { Badge } from './ui/badge';

interface MaintenanceLogProps {
  log: MaintenanceLogType[];
  onAddLog: (log: Omit<MaintenanceLogType, 'id'>) => void;
}

export function MaintenanceLog({ log, onAddLog }: MaintenanceLogProps) {
  const getBadgeVariant = (logType: MaintenanceLogType['logType']): 'secondary' | 'default' | 'outline' => {
    switch (logType) {
        case 'repair': return 'secondary';
        case 'modification': return 'default';
        case 'service':
        default:
            return 'outline';
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Maintenance Log</CardTitle>
          <CardDescription>
            A history of all service and repairs.
          </CardDescription>
        </div>
        <AddMaintenanceLogDialog onAddLog={onAddLog}>
          <Button size="sm" className="ml-auto gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            Add Log
          </Button>
        </AddMaintenanceLogDialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.length > 0 ? (
              log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(entry.logType)} className="capitalize">{entry.logType}</Badge>
                  </TableCell>
                  <TableCell>{entry.serviceProvider || (entry.serviceType === 'diy' ? 'DIY' : 'N/A')}</TableCell>
                  <TableCell className="text-right">
                    ${entry.cost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No maintenance logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
