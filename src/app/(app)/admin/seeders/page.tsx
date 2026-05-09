'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Database, AlertCircle } from 'lucide-react';
import { AdminSeeder } from '../seeder';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SeedersPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Seeders
          </CardTitle>
          <CardDescription>
            Populate the database with master component data and reference information.
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The component-specific seeders (Shimano, SRAM, Headsets, etc.) require their respective data files to be created.
          Start with the Base Components seeder below, then you can add components manually via the "Add New Bike Model" tool.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Core Component Library</h3>
        <div className="grid grid-cols-1 gap-4">
          <AdminSeeder />
        </div>
      </div>

      <div className="mt-8 pt-4 border-t">
        <h3 className="text-lg font-semibold mb-4">Available Premium Seeders</h3>
        <p className="text-sm text-gray-600 mb-4">
          These seeders require specific component data files. They were used in the Firebase version and can be re-enabled once their data sources are added:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 ml-4">
          <li>• Shimano Components</li>
          <li>• SRAM Components</li>
          <li>• Campagnolo Components</li>
          <li>• Headsets</li>
          <li>• Brake Rotors</li>
          <li>• Tires</li>
          <li>• Saddles</li>
          <li>• Seatposts</li>
          <li>• Handlebars</li>
          <li>• Pedals</li>
          <li>• Suspension Forks</li>
          <li>• Rear Shocks</li>
          <li>• Dropper Posts</li>
          <li>• Shoes</li>
          <li>• Bottom Brackets</li>
        </ul>
      </div>
    </div>
  );
}

