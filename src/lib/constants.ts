export const BIKE_TYPES = ['Road', 'Track', 'Time Trial', 'Triathlon', 'Cyclocross', 'Gravel', 'Cross Country', 'All Mountain', 'Enduro', 'Dirt Jumper', 'Downhill', 'Hybrid', 'E-Bike (Road)', 'E-Bike (Mountain)', 'E-Bike (Hybrid)'] as const;
export type BikeType = (typeof BIKE_TYPES)[number];

export const MOUNTAIN_BIKE_TYPES: BikeType[] = ['Cross Country', 'All Mountain', 'Enduro', 'Downhill', 'Dirt Jumper', 'E-Bike (Mountain)'];

export const EBIKE_TYPES: BikeType[] = ['E-Bike (Road)', 'E-Bike (Mountain)', 'E-Bike (Hybrid)'];

export const DROP_BAR_BIKE_TYPES: BikeType[] = ['Road', 'Gravel', 'Cyclocross', 'Track', 'Time Trial', 'Triathlon', 'E-Bike (Road)'];

export const COMPONENT_SYSTEMS = ['Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Cockpit', 'Suspension', 'Accessories', 'E-Bike'] as const;
export type ComponentSystem = (typeof COMPONENT_SYSTEMS)[number];

    