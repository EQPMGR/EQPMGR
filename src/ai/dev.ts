
'use server';
import 'dotenv/config';

import '@/ai/flows/generate-maintenance-schedule.ts';
import '@/ai/flows/simulate-wear.ts';
import '@/ai/flows/extract-bike-details-from-url.ts';
import '@/ai/flows/extract-component-details.ts';
import '@/ai/flows/index-components.ts';
import '@/ai/flows/clean-component-list.ts';
