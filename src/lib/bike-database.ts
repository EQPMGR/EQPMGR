
export interface BikeFromDB {
  brand: string;
  model: string;
  modelYear: number;
  type: 'Road Bike' | 'Mountain Bike';
  components: string[];
  imageUrl: string;
}

export const bikeDatabase: BikeFromDB[] = [
  {
    brand: 'Specialized',
    model: 'S-Works Tarmac SL7',
    modelYear: 2023,
    type: 'Road Bike',
    components: ['Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Accessories'],
    imageUrl: 'https://images.unsplash.com/photo-1571068299318-5d46422aa9f6?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Specialized',
    model: 'Stumpjumper Evo',
    modelYear: 2023,
    type: 'Mountain Bike',
    components: ['Drivetrain', 'Brakes', 'Wheelset', 'Suspension', 'Frameset', 'Accessories'],
    imageUrl: 'https://images.unsplash.com/photo-1620722359212-c54ac6459957?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Fuel EX 8 Gen 6',
    modelYear: 2022,
    type: 'Mountain Bike',
    components: ['Drivetrain', 'Brakes', 'Wheelset', 'Suspension', 'Frameset', 'Accessories'],
    imageUrl: 'https://images.unsplash.com/photo-1598466138885-9a8451193370?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Trek',
    model: 'Madone SLR 9',
    modelYear: 2023,
    type: 'Road Bike',
    components: ['Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Accessories'],
    imageUrl: 'https://images.unsplash.com/photo-1575585250431-29161a15a812?q=80&w=600&h=400&auto=format&fit=crop',
  },
  {
    brand: 'Cervelo',
    model: 'S5',
    modelYear: 2023,
    type: 'Road Bike',
    components: ['Drivetrain', 'Brakes', 'Wheelset', 'Frameset', 'Accessories'],
    imageUrl: 'https://images.unsplash.com/photo-1559345551-46835f8c38b2?q=80&w=600&h=400&auto=format&fit=crop'
  }
];
