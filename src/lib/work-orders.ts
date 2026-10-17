// Work order statuses shared with the shop app (EQPMGRshop src/lib/types.ts).
// The shop moves an order through these; the rider sees the current one.
export const WORK_ORDER_STATUSES = [
  'New',
  'Customer Contacted',
  'Appointment Booked',
  'Bike in Shop',
  'Awaiting Parts',
  'Awaiting Service',
  'In Service',
  'Testing',
  'Bike Ready',
  'Completed',
  'Cancelled',
] as const;

/** Statuses after which the order is closed and the shop can no longer change parts. */
export const CLOSED_WORK_ORDER_STATUSES = ['Completed', 'Cancelled', 'cancelled'];

export function isWorkOrderOpen(status: string | null | undefined): boolean {
  return !CLOSED_WORK_ORDER_STATUSES.includes(status ?? '');
}
