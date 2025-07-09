
export interface BikeComponentFromDB {
  name: string; // e.g. "Rear Derailleur"
  brand: string;
  model: string;
  system: string;
}

export interface BikeFromDB {
  brand: string;
  model: string;
  modelYear: number;
  type: string; // Using a generic string to accommodate more specific types
  components: BikeComponentFromDB[];
  imageUrl: string;
}

export const bikeDatabase: BikeFromDB[] = [
  {
    brand: 'Norco',
    model: 'Threshold C 105',
    modelYear: 2014,
    type: 'Cyclocross',
    components: [
        { name: 'Frame', brand: 'Norco', model: 'Threshold Cross 30T High-Mod Carbon', system: 'Frameset'},
        { name: 'Fork', brand: 'Norco', model: 'Threshold Full Carbon Tapered w/PM-Disc', system: 'Frameset' },
        { name: 'Rims', brand: 'Alex', model: 'ATD490 Disc', system: 'Wheelset' },
        { name: 'Tires', brand: 'Clement', model: 'Crusade PDX 700 x 33c', system: 'Wheelset' },
        { name: 'Front Hub', brand: 'Sram', model: '306 Disc Hub', system: 'Wheelset' },
        { name: 'Rear Hub', brand: 'Sram', model: '306 Disc Hub', system: 'Wheelset' },
        { name: 'Spokes', brand: 'Stainless Steel', model: 'Black w/Brass Nipples', system: 'Wheelset' },
        { name: 'Front Shifter', brand: 'Shimano', model: '105 ST-5700L', system: 'Drivetrain' },
        { name: 'Rear Shifter', brand: 'Shimano', model: '105 ST-5700R', system: 'Drivetrain' },
        { name: 'Front Derailleur', brand: 'Shimano', model: '105 FD-5700L', system: 'Drivetrain' },
        { name: 'Rear Derailleur', brand: 'Shimano', model: '105 RD-5701', system: 'Drivetrain' },
        { name: 'Cassette', brand: 'Shimano', model: 'CS-4600 12-28T 10 speed', system: 'Drivetrain' },
        { name: 'Crankset', brand: 'Sram', model: 'S350 PF30 46/36', system: 'Drivetrain' },
        { name: 'Bottom Bracket', brand: 'Sram', model: 'PressFit30', system: 'Drivetrain' },
        { name: 'Chain', brand: 'Sram', model: 'CN-PC1031 10speed', system: 'Drivetrain' },
        { name: 'Seat Post', brand: 'Norco', model: 'Alloy 27.2mm', system: 'Frameset' },
        { name: 'Saddle', brand: 'Norco', model: 'Cross Race', system: 'Frameset' },
        { name: 'Headset', brand: 'FSA', model: 'No.42B/Cup Tapered', system: 'Frameset' },
        { name: 'Stem', brand: 'Norco', model: 'N/A', system: 'Cockpit' },
        { name: 'Handlebar', brand: 'Norco', model: 'Compact', system: 'Cockpit' },
        { name: 'Grips', brand: 'Norco', model: 'Anti-Slip Tape', system: 'Cockpit' },
        { name: 'Front Brake', brand: 'Hayes', model: 'CX-5 Mechanical Disc w/160mm rotor', system: 'Brakes' },
        { name: 'Rear Brake', brand: 'Hayes', model: 'CX-5 Mechanical Disc w/140mm rotor', system: 'Brakes' },
        { name: 'Brake Levers', brand: 'Shimano', model: '105 ST-5700', system: 'Brakes' },
    ],
    imageUrl: 'https://placehold.co/600x400.png',
  },
];
