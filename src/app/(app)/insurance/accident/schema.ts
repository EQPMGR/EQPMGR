import { z } from 'zod';

// Acci7 accident insurance lead: just enough for the partner to get in touch.
export const accidentLeadSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  address: z.string().trim().min(5, 'Please enter your address.').max(300),
  phone: z.string().trim().min(7, 'Please enter a phone number.').max(40),
  email: z.string().trim().email('Please enter a valid email.').max(200),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree so we can pass your details on.' }) }),
});

export type AccidentLeadValues = z.infer<typeof accidentLeadSchema>;
