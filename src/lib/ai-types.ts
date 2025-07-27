

/**
 * @fileOverview Centralized type and schema definitions for AI flows.
 */
import { z } from 'zod';
import type { MasterComponent } from './types';

// === From extract-bike-details-from-url.ts ===

const ExtractedComponentSchema = z.object({
  name: z.string().describe('The name of the component (e.g., "Rear Derailleur", "Fork", "Bottom Bracket").'),
  brand: z.string().optional().describe('The brand of the component (e.g., "SRAM", "FOX").'),
  series: z.string().optional().describe('The product family or series name (e.g., "Dura-Ace", "Ultegra", "105", "XT", "Apex", "GX Eagle").'),
  model: z.string().optional().describe('The specific model or part number of the component (e.g., "RD-5701", "ST-5700L", "CS-4600").'),
  system: z.string().describe('The system the component belongs to. Must be one of: "Drivetrain", "Suspension", "Brakes", "Wheelset", "Frameset", "Cockpit", "E-Bike", or "Accessories".'),
  size: z.string().optional().describe('The default or single size of the component (e.g., "27.2mm", "172.5mm", "42cm").'),
  chainring1: z.string().optional().describe("For cranksets with multiple rings, the tooth count of the largest chainring."),
  chainring2: z.string().optional().describe("The tooth count of the second chainring."),
  chainring3: z.string().optional().describe("The tooth count of the third chainring."),
});


export const ExtractBikeDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from a bike's product webpage."),
});
export type ExtractBikeDetailsInput = z.infer<typeof ExtractBikeDetailsInputSchema>;

export const ExtractBikeDetailsOutputSchema = z.object({
  brand: z.string().optional().describe('The brand of the bike (e.g., "Specialized").'),
  model: z.string().optional().describe('The model name of the bike (e.g., "Tarmac SL7").'),
  modelYear: z.coerce.number().optional().describe('The model year of the bike (e.g., 2023).'),
  components: z.array(ExtractedComponentSchema).describe('An array of all the extracted bike components.'),
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

// === From extract-component-details.ts ===
const ExtractedSingleComponentSchema = z.object({
  name: z.string().describe('The name of the component (e.g., "Chainring", "Rear Derailleur"). Standardize "Seat Post" to "Seatpost".'),
  brand: z.string().optional().describe('The brand of the component (e.g., "SRAM", "Shimano").'),
  series: z.string().optional().describe('The product family or series name (e.g., "GX Eagle").'),
  model: z.string().optional().describe('The specific model or part number of the component (e.g., "XG-1275").'),
  system: z.string().describe('The system the component belongs to. Must be one of: "Drivetrain", "Suspension", "Brakes", "Wheelset", "Frameset", "Cockpit", "E-Bike", or "Accessories".'),
  chainring1: z.string().optional().describe("For chainrings, the tooth count (e.g., '44t')."),
  size: z.string().optional().describe("Size of the component, if applicable (e.g., '175mm' for cranks, '27.2mm' for seatposts)."),
});

export const ExtractComponentDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from the component's product webpage."),
  originalSystem: z.string().describe("The system of the component being replaced, to guide the AI.")
});
export type ExtractComponentDetailsInput = z.infer<typeof ExtractComponentDetailsInputSchema>;

export const ExtractComponentDetailsOutputSchema = ExtractedSingleComponentSchema;
export type ExtractComponentDetailsOutput = z.infer<typeof ExtractComponentDetailsOutputSchema>;
