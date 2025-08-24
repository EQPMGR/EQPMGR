
'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { PlusCircle, BookOpen } from 'lucide-react';
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
  const getBadgeVariant = (logType?: MaintenanceLogType['logType']): 'secondary' | 'default' | 'outline' => {
    switch (logType) {
        case 'repair': return 'secondary';
        case 'modification': return 'default';
        case 'service':
        default:
            return 'outline';
    }
  }

  // Sort logs by date, most recent first for both views
  const sortedLog = [...log].sort((a, b) => b.date.getTime() - a.date.getTime());
  const limitedLog = sortedLog.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Maintenance Log</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 flex-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            View Full Log
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Full Maintenance Log</DialogTitle>
                        </DialogHeader>
                         <div className="max-h-[60vh] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLog.length > 0 ? (
                                        sortedLog.map((entry) => (
                                            <TableRow key={entry.id}>
                                            <TableCell>{formatDate(entry.date, user?.dateFormat)}</TableCell>
                                            <TableCell><Badge variant={getBadgeVariant(entry.logType)} className="capitalize">{entry.logType || 'service'}</Badge></TableCell>
                                            <TableCell>
                                                <p className="font-medium">{entry.description || entry.notes}</p>
                                                <p className="text-xs text-muted-foreground">{entry.serviceType === 'diy' ? 'DIY' : (entry.serviceProvider || 'Shop')}</p>
                                            </TableCell>
                                            <TableCell className="text-right">${(entry.cost || 0).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                        No maintenance logged yet.
                                        </TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
                <AddMaintenanceLogDialog onAddLog={onAddLog}>
                    <Button size="sm" className="gap-1 flex-1">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Log
                    </Button>
                </AddMaintenanceLogDialog>
            </div>
        </div>
        <CardDescription>A summary of the most recent maintenance events.</CardDescription>
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
            {limitedLog.length > 0 ? (
              limitedLog.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {formatDate(entry.date, user?.dateFormat)}
                  </TableCell>
                  <TableCell>{entry.description || entry.notes}</TableCell>
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
