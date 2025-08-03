
'use client';
import {
  Card,
  CardContent,
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
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/date-utils';

interface MaintenanceLogProps {
  log: MaintenanceLogType[];
  onAddLog: (log: Omit<MaintenanceLogType, 'id'>) => void;
}

export function MaintenanceLog({ log, onAddLog }: MaintenanceLogProps) {
  const { user } = useAuth();
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
      <CardHeader>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Maintenance Log</CardTitle>
            <AddMaintenanceLogDialog onAddLog={onAddLog}>
                <Button size="sm" className="gap-1 w-full sm:w-auto">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Log
                </Button>
            </AddMaintenanceLogDialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.length > 0 ? (
              log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {formatDate(entry.date, user?.dateFormat)}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
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
