

/**
 * @fileOverview Centralized type and schema definitions for AI flows.
 */
import { z } from 'zod';
import type { MasterComponent } from './types';


// === Schemas for two-stage bike spec extraction ===

// Stage 1: Rough extraction
export const RoughComponentSchema = z.object({
  name: z.string().describe("The best-guess name of the component from the raw text (e.g., 'Rear Derailleur', 'Fork')."),
  description: z.string().describe("The full line or block of text associated with this component."),
});

export const ExtractBikeDetailsInputSchema = z.object({
  textContent: z.string().describe("The raw text content from a bike's product webpage."),
});
export type ExtractBikeDetailsInput = z.infer<typeof ExtractBikeDetailsInputSchema>;


export const ExtractBikeDetailsOutputSchema = z.object({
  brand: z.string().optional().describe('The brand of the bike (e.g., "Specialized").'),
  model: z.string().optional().describe('The model name of the bike (e.g., "Tarmac SL7").'),
  modelYear: z.coerce.number().optional().describe('The model year of the bike (e.g., 2023).'),
  components: z.array(RoughComponentSchema).describe('An array of all identified bike components with their raw descriptions.'),
});


// Stage 2: Detailed cleaning/refining
export const UnstructuredComponentSchema = z.object({
  name: z.string().describe("The best-guess name of the component from the raw text."),
  description: z.string().describe("The full line or block of text associated with this component."),
});

export const CleanComponentListInputSchema = z.object({
  components: z.array(UnstructuredComponentSchema),
});

export const StructuredComponentSchema = z.object({
  name: z.string().describe("The official name of the component (e.g., 'Rear Derailleur')."),
  brand: z.string().optional().describe("The brand of the component (e.g., 'SRAM')."),
  series: z.string().optional().describe("The product family name (e.g., 'GX Eagle')."),
  model: z.string().optional().describe("The specific part number (e.g., 'RD-M8100-SGS')."),
  system: z.string().describe("The system it belongs to: 'Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Cockpit', 'Suspension', 'E-Bike', or 'Accessories'."),
  size: z.string().optional().describe("The primary size if available (e.g., '175mm')."),
  sizeVariants: z.string().optional().describe('A JSON string mapping frame sizes to component sizes. E.g., \'{"S": "40cm", "M": "42cm"}\'.'),
  chainring1: z.string().optional().describe("Tooth count for the first chainring (e.g., '42t')."),
  chainring2: z.string().optional().describe("Tooth count for the second chainring."),
  chainring3: z.string().optional().describe("Tooth count for the third chainring."),
});

export const CleanComponentListOutputSchema = z.object({
  components: z.array(StructuredComponentSchema),
});
export type CleanComponentListOutput = z.infer<typeof CleanComponentListOutputSchema>;


// Final combined output for the form
export type ExtractBikeDetailsOutput = {
    brand?: string;
    model?: string;
    modelYear?: number;
    components: z.infer<typeof StructuredComponentSchema>[];
}


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
