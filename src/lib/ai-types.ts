/**
 * @fileOverview Centralized type and schema definitions for AI flows.
 */
import { z } from 'zod';

// === From extract-bike-details-from-url.ts ===

const ExtractedComponentSchema = z.object({
  name: z.string().describe('The name of the component (e.g., "Rear Derailleur", "Fork").'),
  brand: z.string().describe('The brand of the component (e.g., "SRAM", "FOX").'),
  model: z.string().describe('The model of the component (e.g., "RED eTap AXS", "FLOAT 36 Factory").'),
  system: z.string().describe('The system the component belongs to (e.g., "Drivetrain", "Suspension", "Brakes", "Wheelset", "Frameset", "Cockpit", "Accessories").'),
});

export const ExtractBikeDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from a bike's product webpage."),
});
export type ExtractBikeDetailsInput = z.infer<typeof ExtractBikeDetailsInputSchema>;

export const ExtractBikeDetailsOutputSchema = z.object({
  brand: z.string().describe('The brand of the bike.'),
  model: z.string().describe('The model of the bike.'),
  modelYear: z.coerce.number().describe('The model year of the bike.'),
  type: z.string().describe('The type of bike (e.g., "Road", "Enduro", "Gravel").'),
  components: z.array(ExtractedComponentSchema).describe('A list of all extracted components.'),
});
export type ExtractBikeDetailsOutput = z.infer<typeof ExtractBikeDetailsOutputSchema>;


// === From generate-maintenance-schedule.ts ===

export const GenerateMaintenanceScheduleInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment (e.g., road bike, mountain bike).'),
  wearAndTearData: z.string().describe('JSON string of wear and tear data for each component.'),
  manufacturerGuidelines: z.string().describe('JSON string of manufacturer guidelines for maintenance.'),
});
export type GenerateMaintenanceScheduleInput = z.infer<typeof GenerateMaintenanceScheduleInputSchema>;

export const GenerateMaintenanceScheduleOutputSchema = z.object({
  maintenanceSchedule: z.string().describe('JSON string of the generated maintenance schedule.'),
});
export type GenerateMaintenanceScheduleOutput = z.infer<typeof GenerateMaintenanceScheduleOutputSchema>;


// === From get-bike-model-details.ts ===

export const BikeModelDetailsInputSchema = z.object({
  brand: z.string().describe('The brand of the bike.'),
  model: z.string().describe('The model of the bike.'),
  modelYear: z.coerce.number().describe('The model year of the bike.'),
});
export type BikeModelDetailsInput = z.infer<typeof BikeModelDetailsInputSchema>;

export const BikeModelDetailsOutputSchema = z.object({
  details: z.string().describe('A detailed, paragraph-style overview of the bike, its purpose, and its components.'),
});
export type BikeModelDetailsOutput = z.infer<typeof BikeModelDetailsOutputSchema>;


// === From simulate-wear.ts ===

export const SimulateWearInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment being used (e.g., running shoes, bicycle).'),
  workoutType: z.string().describe('The type of workout performed (e.g., running, cycling).'),
  distance: z.number().describe('The distance covered during the workout in kilometers.'),
  duration: z.number().describe('The duration of the workout in minutes.'),
  intensity: z.string().describe('The intensity of the workout (e.g., low, medium, high).'),
  environmentalConditions: z
    .string()
    .describe('The environmental conditions during the workout (e.g., sunny, rainy, muddy).'),
});
export type SimulateWearInput = z.infer<typeof SimulateWearInputSchema>;

export const SimulateWearOutputSchema = z.object({
  wearPercentage: z
    .number()
    .describe('The estimated percentage of wear and tear on the equipment after the workout.'),
  componentWear: z
    .record(z.string(), z.number())
    .describe('A breakdown of wear and tear on individual components of the equipment.'),
  recommendations: z.array(z.string()).describe('Recommendations for maintenance or replacement based on the wear.'),
});
export type SimulateWearOutput = z.infer<typeof SimulateWearOutputSchema>;
