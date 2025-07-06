export const BIKE_TYPES = ['Road', 'Track', 'Time Trial', 'Triathlon', 'Cyclocross', 'Gravel', 'Cross Country', 'All Mountain', 'Enduro', 'Dirt Jumper', 'Downhill', 'Hybrid'] as const;
export type BikeType = (typeof BIKE_TYPES)[number];

export const MOUNTAIN_BIKE_TYPES: BikeType[] = ['Cross Country', 'All Mountain', 'Enduro', 'Downhill', 'Dirt Jumper'];
