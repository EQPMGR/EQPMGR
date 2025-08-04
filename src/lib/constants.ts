export const BIKE_TYPES = ['Road', 'Track', 'Time Trial', 'Triathlon', 'Cyclocross', 'Gravel', 'Cross Country', 'All Mountain', 'Enduro', 'Dirt Jumper', 'Downhill', 'Hybrid', 'E-Bike (Road)', 'E-Bike (Mountain)', 'E-Bike (Hybrid)'] as const;
export type BikeType = (typeof BIKE_TYPES)[number];

export const MOUNTAIN_BIKE_TYPES: BikeType[] = ['Cross Country', 'All Mountain', 'Enduro', 'Downhill', 'Dirt Jumper', 'E-Bike (Mountain)'];

export const EBIKE_TYPES: BikeType[] = ['E-Bike (Road)', 'E-Bike (Mountain)', 'E-Bike (Hybrid)'];

export const DROP_BAR_BIKE_TYPES: BikeType[] = ['Road', 'Gravel', 'Cyclocross', 'Track', 'Time Trial', 'Triathlon', 'E-Bike (Road)'];

export const COMPONENT_SYSTEMS = ['Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Cockpit', 'Suspension', 'Accessories', 'E-Bike'] as const;
export type ComponentSystem = (typeof COMPONENT_SYSTEMS)[number];


export const BASE_COMPONENTS = [
    // Frameset
    { name: 'Frame', system: 'Frameset', brand: '', series: '', model: ''},
    // Drivetrain
    { name: 'Crankset', system: 'Drivetrain', brand: '', series: '', model: ''},
    { name: 'Bottom Bracket', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Front Derailleur', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Rear Derailleur', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Cassette', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Front Shifter', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Rear Shifter', system: 'Drivetrain', brand: '', series: '', model: '' },
    { name: 'Chain', system: 'Drivetrain', brand: '', series: '', model: '', links: '', tensioner: '' },
    { name: 'Battery', system: 'Drivetrain', brand: '', model: '' },
    { name: 'Charger', system: 'Drivetrain', brand: '', model: '' },
    // Brakes
    { name: 'Front Brake', system: 'Brakes', brand: '', series: '', model: '', pads: '' },
    { name: 'Rear Brake', system: 'Brakes', brand: '', series: '', model: '', pads: '' },
    { name: 'Front Rotor', system: 'Brakes', brand: '', series: '', model: '' },
    { name: 'Rear Rotor', system: 'Brakes', brand: '', series: '', model: '' },
    // Suspension
    { name: 'Fork', system: 'Suspension', brand: '', series: '', model: '' },
    { name: 'Rear Shock', system: 'Suspension', brand: '', series: '', model: '' },
    // Wheelset
    { name: 'Front Hub', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Rear Hub', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Front Rim', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Rear Rim', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Front Tire', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Rear Tire', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Front Skewer', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Rear Skewer', system: 'Wheelset', brand: '', series: '', model: '' },
    { name: 'Valves', system: 'Wheelset', brand: '', series: '', model: '' },
    // Cockpit
    { name: 'Handlebar', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Stem', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Seatpost', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Headset', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Saddle', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Grips', system: 'Cockpit', brand: '', series: '', model: '' },
    { name: 'Seatpost Clamp', system: 'Cockpit', brand: '', series: '', model: '' },
    // E-Bike
    { name: 'Motor', system: 'E-Bike', brand: '', model: '', power: '' },
    { name: 'Battery', system: 'E-Bike', brand: '', model: '', capacity: '' },
    { name: 'Display', system: 'E-Bike', brand: '', model: '' },
];
    
