
'use server';

import { adminDb, getAdminAuth } from '@/lib/firebase-admin';
import type { AddBikeModelFormValues } from './page';
import type { MasterComponent } from '@/lib/types';
import { z } from 'zod';
import { cookies } from 'next/headers';

const createComponentId = (component: Partial<z.infer<any>>) => {
    const idString = [component.brand, component.name, component.model]
        .filter(Boolean)
        .join('-');
    
    if (!idString) return null;

    return idString
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const createBikeModelId = (bike: AddBikeModelFormValues) => {
    return `${bike.brand}-${bike.model}-${bike.modelYear}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

interface TrainingData {
    rawText: string;
    aiOutput: any; // Using `any` for simplicity as we don't need to validate the AI output shape here
    userCorrectedOutput: AddBikeModelFormValues;
}


export async function saveBikeModelAction({
    values,
    importedTrainingData,
}: {
    values: AddBikeModelFormValues;
    importedTrainingData: Omit<TrainingData, 'userCorrectedOutput'> | null;
}): Promise<{ success: boolean; message: string }> {

    try {
        const session = cookies().get('__session')?.value;
        if (!session) {
            throw new Error('User not authenticated.');
        }
        
        const decodedIdToken = await getAdminAuth().verifySessionCookie(session, true);
        if (decodedIdToken.email !== 'sagelovestheforest@gmail.com') {
             throw new Error('Permission Denied: You are not authorized to perform this action.');
        }

        const batch = adminDb.batch();

        // --- 1. Process and save master components ---
        const componentReferences: string[] = [];
        for (const originalComponent of values.components) {
            const componentToSave: { [key: string]: any } = {};
            Object.keys(originalComponent).forEach((key: any) => {
                const typedKey = key as keyof typeof originalComponent;
                const value = originalComponent[typedKey];
                if (value !== undefined && value !== null && value !== '' && key !== 'id') {
                    componentToSave[key] = value;
                }
            });
            
            // Don't save empty shells of components
            if (Object.keys(componentToSave).length <= 2) continue;
            if (!componentToSave.brand && !componentToSave.series && !componentToSave.model) continue;

            const componentId = createComponentId(componentToSave as Partial<MasterComponent>);
            if (!componentId) continue;
            
            const masterComponentRef = adminDb.collection('masterComponents').doc(componentId);
            batch.set(masterComponentRef, componentToSave, { merge: true });
            componentReferences.push(`masterComponents/${componentId}`);
        }
        
        // --- 2. Process and save the main bike model ---
        const bikeModelId = createBikeModelId(values);
        const bikeModelDocRef = adminDb.collection('bikeModels').doc(bikeModelId);
        
        const { components, ...bikeModelData } = values;

        const bikeModelToSave: { [key: string]: any } = {};
        Object.keys(bikeModelData).forEach((key: any) => {
            const typedKey = key as keyof typeof bikeModelData;
            const value = bikeModelData[typedKey];
            if (value !== undefined && value !== null && value !== '') {
                bikeModelToSave[key] = value;
            }
        });
        
        batch.set(bikeModelDocRef, {
            ...bikeModelToSave,
            components: componentReferences,
            imageUrl: `https://placehold.co/600x400.png`
        });
        
        // --- 3. Process and save training data if it exists ---
        if (importedTrainingData) {
            const trainingDocRef = adminDb.collection('trainingData').doc();

            // Clean the 'userCorrectedOutput' to remove undefined/null/empty values
            const cleanedValues: { [key: string]: any } = {};
             Object.keys(values).forEach((key: any) => {
                const typedKey = key as keyof AddBikeModelFormValues;
                const value = values[typedKey];
                 if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        cleanedValues[typedKey] = value.map(item => {
                            const cleanedItem: { [key: string]: any } = {};
                            Object.keys(item).forEach(itemKey => {
                                const itemValue = item[itemKey as keyof typeof item];
                                if (itemValue !== undefined && itemValue !== null && itemValue !== '') {
                                    cleanedItem[itemKey] = itemValue;
                                }
                            });
                            return cleanedItem;
                        }).filter(item => Object.keys(item).length > 2); // Only include components with actual data
                    } else {
                       cleanedValues[typedKey] = value;
                    }
                }
            });

            const trainingData: TrainingData = {
                ...importedTrainingData,
                userCorrectedOutput: cleanedValues as AddBikeModelFormValues,
            };
            batch.set(trainingDocRef, trainingData);
        }

        // --- 4. Commit all writes to the database ---
        await batch.commit();

        return {
            success: true,
            message: `${values.brand} ${values.model} (${values.modelYear}) has been added to the database.`
        };

    } catch (error: any) {
        console.error("Failed to save bike model via server action:", error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred while saving the bike model.'
        };
    }
}
