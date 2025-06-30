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

interface MaintenanceLogProps {
  log: MaintenanceLogType[];
}

export function MaintenanceLog({ log }: MaintenanceLogProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Maintenance Log</CardTitle>
          <CardDescription>
            A history of all service and repairs.
          </CardDescription>
        </div>
        <Button size="sm" className="ml-auto gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          Add Log
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
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
                  <TableCell className="text-right">
                    ${entry.cost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
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
