
'use server';

import { getServerDb } from '@/backend';
import type { AddProviderFormValues } from './page';

const createProviderId = (name: string, city: string) => {
    return `${name}-${city}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export async function addServiceProviderAction({
    values,
}: {
    values: AddProviderFormValues;
}): Promise<{ success: boolean; message: string }> {

    const providerId = createProviderId(values.name, values.city);

    try {
        const db = await getServerDb();

        const docSnap = await db.getDoc('serviceProviders', providerId);
        if (docSnap.exists) {
            return {
                success: false,
                message: `A service provider with this name and city already exists (ID: ${providerId}).`,
            };
        }

        // For now, geohash is a placeholder. In a real app, we would use a geocoding API
        // to convert the address to lat/lng and then generate the geohash.
        const providerToSave = {
            ...values,
            geohash: 'c2b2q', // Placeholder for Vancouver
        };

        await db.setDoc('serviceProviders', providerId, providerToSave);

        return {
            success: true,
            message: `${values.name} has been added to the service provider directory.`,
        };

    } catch (error: any) {
        console.error("Failed to add service provider:", error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while saving the provider.',
        };
    }
}
