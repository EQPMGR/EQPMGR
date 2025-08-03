
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getAvailableBrands(): Promise<string[]> {
    try {
        const querySnapshot = await getDocs(collection(db, "bikeModels"));
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
        // Re-throw the error to be handled by the calling component
        throw new Error("Could not fetch bike brands from the server.");
    }
}
