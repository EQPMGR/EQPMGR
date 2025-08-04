
'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function getAvailableBrands(): Promise<string[]> {
    try {
        const querySnapshot = await adminDb.collection("bikeModels").get();
        const brands = new Set<string>();
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.brand) {
                brands.add(data.brand);
            }
        });
        return Array.from(brands).sort();
    } catch (error) {
        console.error("Server Action: Error fetching brands", error);
        // Throw a more specific error to help with debugging on the client.
        throw new Error("Could not fetch bike brands from the server. This might be a database permission issue.");
    }
}
