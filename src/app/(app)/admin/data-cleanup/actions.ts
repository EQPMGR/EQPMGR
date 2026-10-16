
'use server';

import { verifyAdminToken } from '@/lib/server-auth';

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

/**
 * Iterates through all documents in the `master_components` table
 * and removes the `embedding` field if it exists.
 */
export async function removeAllEmbeddingsAction(idToken: string): Promise<{ success: boolean; message: string }> {
  try {
    await verifyAdminToken(idToken);
    const supabase = getSupabaseClient();
    let totalProcessed = 0;
    let totalUpdated = 0;
    let lastId: string | null = null;
    const pageSize = 500;

    while (true) {
        let query = supabase
          .from('master_components')
          .select('id, embedding')
          .order('id', { ascending: true })
          .limit(pageSize);

        if (lastId) {
            query = query.gt('id', lastId);
        }

        const { data: components, error } = await query;
        
        if (error) throw error;

        if (!components || components.length === 0) {
            break; // No more documents to process
        }

        // Find components that have embeddings to update
        const componentsToUpdate = components.filter(c => c.embedding !== null && c.embedding !== undefined);

        // Update embeddings to null (or delete the field)
        if (componentsToUpdate.length > 0) {
            const { error: updateError } = await supabase
              .from('master_components')
              .update({ embedding: null })
              .in('id', componentsToUpdate.map(c => c.id));

            if (updateError) throw updateError;
            totalUpdated += componentsToUpdate.length;
        }

        totalProcessed += components.length;
        lastId = components[components.length - 1].id;

        // Small delay to be respectful to backend API limits
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      success: true,
      message: `Operation complete. Scanned ${totalProcessed} documents and removed embeddings from ${totalUpdated}.`,
    };

  } catch (error: any) {
    console.error('Error removing embeddings:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during the cleanup process.',
    };
  }
}
