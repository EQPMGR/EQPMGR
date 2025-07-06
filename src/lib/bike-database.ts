
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
    brand: 'Specialized',
    model: 'S-Works Tarmac SL7',
    modelYear: 2023,
    type: 'Road',
    components: [
      { name: 'Shifters', brand: 'SRAM', model: 'RED eTap AXS', system: 'Drivetrain' },
      { name: 'Rear Derailleur', brand: 'SRAM', model: 'RED eTap AXS', system: 'Drivetrain' },
      { name: 'Front Derailleur', brand: 'SRAM', model: 'RED eTap AXS', system: 'Drivetrain' },
      { name: 'Cassette', brand: 'SRAM', model: 'RED XG-1290', system: 'Drivetrain' },
      { name: 'Crankset', brand: 'SRAM', model: 'RED AXS Power Meter', system: 'Drivetrain' },
      { name: 'Chain', brand: 'SRAM', model: 'RED Flat-Top', system: 'Drivetrain' },
      { name: 'Brakes', brand: 'SRAM', model: 'RED eTap AXS HRD', system: 'Brakes' },
      { name: 'Wheels', brand: 'Roval', model: 'Rapide CLX', system: 'Wheelset' },
      { name: 'Tires', brand: 'Specialized', model: 'Turbo Cotton', system: 'Wheelset' },
      { name: 'Frame', brand: 'Specialized', model: 'Tarmac SL7 FACT 12r Carbon', system: 'Frameset' },
      { name: 'Saddle', brand: 'S-Works', model: 'Power with Mirror', system: 'Frameset' },
      { name: 'Stem', brand: 'Specialized', model: 'Tarmac Integrated Stem', system: 'Cockpit' },
      { name: 'Bottle Cage', brand: 'Specialized', model: 'Rib Cage II', system: 'Accessories' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1571068299318-5d46422aa9f6?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Specialized',
    model: 'Stumpjumper Evo',
    modelYear: 2023,
    type: 'Enduro',
    components: [
      { name: 'Shifter', brand: 'SRAM', model: 'Eagle AXS Controller', system: 'Drivetrain' },
      { name: 'Rear Derailleur', brand: 'SRAM', model: 'X01 Eagle AXS', system: 'Drivetrain' },
      { name: 'Cassette', brand: 'SRAM', model: 'XG-1295 Eagle', system: 'Drivetrain' },
      { name: 'Crankset', brand: 'SRAM', model: 'X01 Eagle', system: 'Drivetrain' },
      { name: 'Chain', brand: 'SRAM', model: 'X01 Eagle', system: 'Drivetrain' },
      { name: 'Brakes', brand: 'SRAM', model: 'Code RSC, 4-piston caliper', system: 'Brakes' },
      { name: 'Wheels', brand: 'Roval', model: 'Traverse Carbon 29', system: 'Wheelset' },
      { name: 'Tires', brand: 'Specialized', model: 'Butcher/Eliminator GRID TRAIL', system: 'Wheelset' },
      { name: 'Fork', brand: 'FOX', model: 'FLOAT 36 Factory', system: 'Suspension' },
      { name: 'Rear Shock', brand: 'FOX', model: 'FLOAT X Factory', system: 'Suspension' },
      { name: 'Frame', brand: 'Specialized', model: 'Stumpjumper Evo FACT 11m Carbon', system: 'Frameset' },
      { name: 'Dropper Post', brand: 'Bike Yoke', model: 'Revive Max', system: 'Frameset' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1620722359212-c54ac6459957?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Fuel EX 8 Gen 6',
    modelYear: 2022,
    type: 'All Mountain',
    components: [
        { name: 'Shifter', brand: 'Shimano', model: 'XT M8100', system: 'Drivetrain' },
        { name: 'Rear Derailleur', brand: 'Shimano', model: 'XT M8100', system: 'Drivetrain' },
        { name: 'Cassette', brand: 'Shimano', model: 'SLX M7100', system: 'Drivetrain' },
        { name: 'Crankset', brand: 'Shimano', model: 'Deore M6120', system: 'Drivetrain' },
        { name: 'Chain', brand: 'Shimano', model: 'Deore M6100', system: 'Drivetrain' },
        { name: 'Brakes', brand: 'SRAM', model: 'DB 8 4-piston hydraulic disc', system: 'Brakes' },
        { name: 'Wheels', brand: 'Bontrager', model: 'Line Comp 30', system: 'Wheelset' },
        { name: 'Tires', brand: 'Bontrager', model: 'XR5 Team Issue', system: 'Wheelset' },
        { name: 'Fork', brand: 'Fox', model: 'Rhythm 36', system: 'Suspension' },
        { name: 'Rear Shock', brand: 'Fox', model: 'Performance Float X', system: 'Suspension' },
        { name: 'Frame', brand: 'Trek', model: 'Alpha Platinum Aluminum', system: 'Frameset' },
        { name: 'Dropper Post', brand: 'TranzX', model: 'JD-YSP39', system: 'Frameset' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1598466138885-9a8451193370?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Madone SLR 9',
    modelYear: 2023,
    type: 'Road',
    components: [
        { name: 'Shifters', brand: 'Shimano', model: 'Dura-Ace Di2 R9270', system: 'Drivetrain' },
        { name: 'Derailleurs', brand: 'Shimano', model: 'Dura-Ace Di2 R9250', system: 'Drivetrain' },
        { name: 'Cassette', brand: 'Shimano', model: 'Dura-Ace R9200', system: 'Drivetrain' },
        { name: 'Crankset', brand: 'Shimano', model: 'Dura-Ace R9200 Power Meter', system: 'Drivetrain' },
        { name: 'Chain', brand: 'Shimano', model: 'XTR M9100', system: 'Drivetrain' },
        { name: 'Brakes', brand: 'Shimano', model: 'Dura-Ace R9270 hydraulic disc', system: 'Brakes' },
        { name: 'Wheels', brand: 'Bontrager', model: 'Aeolus RSL 51', system: 'Wheelset' },
        { name: 'Tires', brand: 'Bontrager', model: 'R4 320', system: 'Wheelset' },
        { name: 'Frame', brand: 'Trek', model: '800 Series OCLV Carbon', system: 'Frameset' },
        { name: 'Fork', brand: 'Trek', model: 'Madone KVF full carbon', system: 'Frameset' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1575585250431-29161a15a812?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Cervelo',
    model: 'S5',
    modelYear: 2023,
    type: 'Road',
    components: [
      { name: 'Shifters', brand: 'SRAM', model: 'RED eTap AXS', system: 'Drivetrain' },
      { name: 'Derailleurs', brand: 'SRAM', model: 'RED eTap AXS', system: 'Drivetrain' },
      { name: 'Cassette', brand: 'SRAM', model: 'RED XG-1290', system: 'Drivetrain' },
      { name: 'Crankset', brand: 'SRAM', model: 'RED AXS Power Meter', system: 'Drivetrain' },
      { name: 'Chain', brand: 'SRAM', model: 'RED Flat-Top', system: 'Drivetrain' },
      { name: 'Brakes', brand: 'SRAM', model: 'RED eTap AXS HRD', system: 'Brakes' },
      { name: 'Wheels', brand: 'Reserve', model: '52/63', system: 'Wheelset' },
      { name: 'Tires', brand: 'Vittoria', model: 'Corsa TLR G2.0', system: 'Wheelset' },
      { name: 'Frame', brand: 'Cervélo', model: 'All-Carbon S5', system: 'Frameset' },
      { name: 'Seatpost', brand: 'Cervélo', model: 'S5 Carbon', system: 'Frameset' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1559345551-46835f8c38b2?q=80&w=600&h=400&auto=format&fit=crop'
  },
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
  }
];
