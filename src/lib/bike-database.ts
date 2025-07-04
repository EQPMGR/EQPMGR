
export interface BikeComponentFromDB {
  name: string;
  system: string;
}

export interface BikeFromDB {
  brand: string;
  model: string;
  modelYear: number;
  type: 'Road Bike' | 'Mountain Bike';
  components: BikeComponentFromDB[];
  imageUrl: string;
}

export const bikeDatabase: BikeFromDB[] = [
  {
    brand: 'Specialized',
    model: 'S-Works Tarmac SL7',
    modelYear: 2023,
    type: 'Road Bike',
    components: [
      { name: 'SRAM RED eTap AXS Shifters', system: 'Drivetrain' },
      { name: 'SRAM RED eTap AXS Derailleurs', system: 'Drivetrain' },
      { name: 'SRAM RED XG-1290 Cassette', system: 'Drivetrain' },
      { name: 'SRAM RED AXS Power Meter Crankset', system: 'Drivetrain' },
      { name: 'SRAM RED Flat-Top Chain', system: 'Drivetrain' },
      { name: 'SRAM RED eTap AXS HRD Brakes', system: 'Brakes' },
      { name: 'Roval Rapide CLX Wheels', system: 'Wheelset' },
      { name: 'Turbo Cotton Tires', system: 'Wheelset' },
      { name: 'Tarmac SL7 FACT 12r Carbon Frame', system: 'Frameset' },
      { name: 'S-Works Power with Mirror Saddle', system: 'Cockpit' },
      { name: 'Tarmac Integrated Stem', system: 'Cockpit' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1571068299318-5d46422aa9f6?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Specialized',
    model: 'Stumpjumper Evo',
    modelYear: 2023,
    type: 'Mountain Bike',
    components: [
      { name: 'SRAM Eagle AXS Controller', system: 'Drivetrain' },
      { name: 'SRAM X01 Eagle AXS Derailleur', system: 'Drivetrain' },
      { name: 'SRAM XG-1295 Eagle Cassette', system: 'Drivetrain' },
      { name: 'SRAM X01 Eagle Crankset', system: 'Drivetrain' },
      { name: 'SRAM X01 Eagle Chain', system: 'Drivetrain' },
      { name: 'SRAM Code RSC, 4-piston caliper', system: 'Brakes' },
      { name: 'Roval Traverse Carbon 29 Wheels', system: 'Wheelset' },
      { name: 'Butcher/Eliminator GRID TRAIL Tires', system: 'Wheelset' },
      { name: 'FOX FLOAT 36 Factory Fork', system: 'Suspension' },
      { name: 'FOX FLOAT X Factory Shock', system: 'Suspension' },
      { name: 'Stumpjumper Evo FACT 11m Carbon Frame', system: 'Frameset' },
      { name: 'Bike Yoke Revive Max Dropper Post', system: 'Cockpit' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1620722359212-c54ac6459957?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Fuel EX 8 Gen 6',
    modelYear: 2022,
    type: 'Mountain Bike',
    components: [
        { name: 'Shimano XT M8100 Shifter', system: 'Drivetrain' },
        { name: 'Shimano XT M8100 Derailleur', system: 'Drivetrain' },
        { name: 'Shimano SLX M7100 Cassette', system: 'Drivetrain' },
        { name: 'Shimano Deore M6120 Crankset', system: 'Drivetrain' },
        { name: 'Shimano Deore M6100 Chain', system: 'Drivetrain' },
        { name: 'SRAM DB 8 4-piston hydraulic disc', system: 'Brakes' },
        { name: 'Bontrager Line Comp 30 Wheels', system: 'Wheelset' },
        { name: 'Bontrager XR5 Team Issue Tires', system: 'Wheelset' },
        { name: 'Fox Rhythm 36 Fork', system: 'Suspension' },
        { name: 'Fox Performance Float X Shock', system: 'Suspension' },
        { name: 'Alpha Platinum Aluminum Frame', system: 'Frameset' },
        { name: 'TranzX JD-YSP39 Dropper Post', system: 'Cockpit' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1598466138885-9a8451193370?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Madone SLR 9',
    modelYear: 2023,
    type: 'Road Bike',
    components: [
        { name: 'Shimano Dura-Ace Di2 R9270 Shifters', system: 'Drivetrain' },
        { name: 'Shimano Dura-Ace Di2 R9250 Derailleurs', system: 'Drivetrain' },
        { name: 'Shimano Dura-Ace R9200 Cassette', system: 'Drivetrain' },
        { name: 'Shimano Dura-Ace R9200 Power Meter Crankset', system: 'Drivetrain' },
        { name: 'Shimano XTR M9100 Chain', system: 'Drivetrain' },
        { name: 'Shimano Dura-Ace R9270 hydraulic disc', system: 'Brakes' },
        { name: 'Bontrager Aeolus RSL 51 Wheels', system: 'Wheelset' },
        { name: 'Bontrager R4 320 Tires', system: 'Wheelset' },
        { name: '800 Series OCLV Carbon Frame', system: 'Frameset' },
        { name: 'Madone KVF full carbon', system: 'Frameset' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1575585250431-29161a15a812?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Cervelo',
    model: 'S5',
    modelYear: 2023,
    type: 'Road Bike',
    components: [
      { name: 'SRAM RED eTap AXS Shifters', system: 'Drivetrain' },
      { name: 'SRAM RED eTap AXS Derailleurs', system: 'Drivetrain' },
      { name: 'SRAM RED XG-1290 Cassette', system: 'Drivetrain' },
      { name: 'SRAM RED AXS Power Meter Crankset', system: 'Drivetrain' },
      { name: 'SRAM RED Flat-Top Chain', system: 'Drivetrain' },
      { name: 'SRAM RED eTap AXS HRD Brakes', system: 'Brakes' },
      { name: 'Reserve 52/63 Wheels', system: 'Wheelset' },
      { name: 'Vittoria Corsa TLR G2.0 Tires', system: 'Wheelset' },
      { name: 'Cervélo All-Carbon S5 Frame', system: 'Frameset' },
      { name: 'Cervélo S5 Carbon Seatpost', system: 'Cockpit' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1559345551-46835f8c38b2?q=80&w=600&h=400&auto=format&fit=crop'
  },
  {
    brand: 'Norco',
    model: 'Threshold C 105',
    modelYear: 2014,
    type: 'Road Bike',
    components: [
        { name: 'Threshold Cross 30T High-Mod Carbon', system: 'Frameset'},
        { name: 'Threshold Full Carbon Tapered w/PM-Disc', system: 'Frameset' },
        { name: 'Alex ATD490 Disc Rims', system: 'Wheelset' },
        { name: 'Clement Crusade PDX 700 x 33c Tires', system: 'Wheelset' },
        { name: 'Sram 306 Disc Hub - Front', system: 'Wheelset' },
        { name: 'Sram 306 Disc Hub - Rear', system: 'Wheelset' },
        { name: 'Stainless Steel Spokes', system: 'Wheelset' },
        { name: 'Shimano 105 ST-5700L Shifter', system: 'Drivetrain' },
        { name: 'Shimano 105 ST-5700R Shifter', system: 'Drivetrain' },
        { name: 'Shimano 105 FD-5700L Front Derailleur', system: 'Drivetrain' },
        { name: 'Shimano 105 RD-5701 Rear Derailleur', system: 'Drivetrain' },
        { name: 'Shimano CS-4600 12-28T 10 speed Cassette', system: 'Drivetrain' },
        { name: 'Sram S350 PF30 46/36 Crankset', system: 'Drivetrain' },
        { name: 'Sram PressFit30 Bottom Bracket', system: 'Drivetrain' },
        { name: 'Sram CN-PC1031 10speed Chain', system: 'Drivetrain' },
        { name: 'Norco Alloy 27.2mm Seat Post', system: 'Cockpit' },
        { name: 'Norco Cross Race Saddle', system: 'Cockpit' },
        { name: 'FSA No.42B/Cup Tapered Headset', system: 'Cockpit' },
        { name: 'Norco Stem', system: 'Cockpit' },
        { name: 'Norco Compact Handlebar', system: 'Cockpit' },
        { name: 'Norco Anti-Slip Grips', system: 'Cockpit' },
        { name: 'Hayes CX-5 Mechanical Disc Front Brake', system: 'Brakes' },
        { name: 'Hayes CX-5 Mechanical Disc Rear Brake', system: 'Brakes' },
        { name: 'Shimano 105 ST-5700 Brake Levers', system: 'Brakes' },
    ],
    imageUrl: 'https://placehold.co/600x400.png',
  }
];
