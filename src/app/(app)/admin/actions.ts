
'use server';

import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BASE_COMPONENTS } from '@/lib/constants';

const createComponentId = (component: any) => {
    const idString = [component.brand, component.name, component.model]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};


export async function seedMasterComponents() {
    const batch = writeBatch(db);
    const masterComponentsRef = collection(db, 'masterComponents');
    let count = 0;

    for (const component of BASE_COMPONENTS) {
        // Skip components with only a name (e.g., "Grips") as they are too generic
        // to be useful as a master component without more detail.
        if (!component.brand && !component.series && !component.model) {
            const masterId = createComponentId(component);
             if (masterId) {
                const docRef = doc(masterComponentsRef, masterId);
                batch.set(docRef, component, { merge: true });
                count++;
            }
        }
    }

    if (count === 0) {
        return { success: true, message: "No new base components to seed." }
    }

    await batch.commit();

    return { success: true, message: `Successfully seeded ${count} base components.` };
}
