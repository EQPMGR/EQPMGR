
import { z } from 'zod';

const claimSchema = z.object({
  dateOfLoss: z.date(),
  typeOfClaim: z.enum(['theft', 'collision', 'liability']),
  payoutAmount: z.coerce.number().optional(),
});

export const insuranceFormSchema = z.object({
  // Eligibility Questions - all are now required
  competes: z.boolean({ required_error: 'Please answer this question.' }),
  hasIllness: z.boolean({ required_error: 'Please answer this question.' }),
  hasPolicyRefused: z.boolean({ required_error: 'Please answer this question.' }),
  unitsInCanada: z.boolean({ required_error: 'Please answer this question.' }).refine(val => val === true, { message: "Units must be kept in Canada." }),
  hasCanadianAddress: z.boolean({ required_error: 'Please answer this question.' }).refine(val => val === true, { message: "Must have a Canadian mailing address." }),
  hasPastClaims: z.boolean({ required_error: 'Please answer this question.' }),
  isBusinessUse: z.boolean({ required_error: 'Please answer this question.' }),
  isGasPowered: z.boolean({ required_error: 'Please answer this question.' }).refine(val => val === false, { message: "Gas powered units are not eligible." }),
  isElectricAssisted: z.boolean({ required_error: 'Please answer this question.' }),
  isOver500w: z.boolean({ required_error: 'Please answer this question.' }).refine(val => val === false, { message: "Units over 500w or 32km/hr are not eligible." }),
  isTravelOutside: z.boolean({ required_error: 'Please answer this question.' }),
  isTravelUsaLong: z.boolean({ required_error: 'Please answer this question.' }),
  isScooter: z.boolean({ required_error: 'Please answer this question.' }),
  isAgeOutOfRange: z.boolean({ required_error: 'Please answer this question.' }).refine(val => val === false, { message: "Operator age must be between 16 and 84." }),
  isNearThreat: z.boolean({ required_error: 'Please answer this question.' }),

  // Past Claims (conditional)
  claims: z.array(claimSchema).optional(),

  // Personal Information
  owner1FirstName: z.string().min(1, 'First name is required.'),
  owner1LastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Invalid email address.'),
  phone: z.string().min(10, 'A valid phone number is required.'),
  addressStreet: z.string().min(1, 'Street address is required.'),
  addressCity: z.string().min(1, 'City is required.'),
  addressProvince: z.string().min(1, 'Province is required.'),
  addressPostalCode: z.string().min(1, 'Postal code is required.'),

  // Unit Information
  unitType: z.string({ required_error: 'Please select a unit type.' }),
  unitYear: z.coerce.number().min(1980, 'Year must be after 1980.'),
  unitMake: z.string().min(1, 'Make is required.'),
  unitModel: z.string().min(1, 'Model is required.'),
  unitSerialNumber: z.string().optional(),
  unitUsageArea: z.string().min(1, 'Usage area is required.'),
  unitStorage: z.string().min(1, 'Storage information is required.'),
  unit: z.object({
    purchasePrice: z.coerce.number().min(0, 'Purchase price must be positive.')
  }),
  
  // Coverage Information
  effectiveDate: z.date({ required_error: 'Effective date is required.' }),
  liability: z.enum(['none', '1m'], { required_error: 'Liability coverage is required.' }),
  accidentBenefits: z.enum(['none', 'basic', 'enhanced'], { required_error: 'Accident benefits are required.' }),
  physicalDamage: z.enum(['none', 'all-perils'], { required_error: 'Physical damage coverage is required.' }),

  // Endorsements
  endorsements: z.object({
    businessUse: z.boolean().optional(),
    travel: z.boolean().optional(),
    competitiveEvents: z.boolean().optional(),
  }).optional(),
});

export type InsuranceFormValues = z.infer<typeof insuranceFormSchema>;
