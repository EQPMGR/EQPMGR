'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-maintenance-schedule.ts';
import '@/ai/flows/simulate-wear.ts';
import '@/ai/flows/get-bike-model-details.ts';
import '@/ai/flows/extract-bike-details-from-url.ts';
