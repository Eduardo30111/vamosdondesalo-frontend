export const WS_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  JOIN_ROOM: 'join_room',
} as const;

export const WS_ROOMS = {
  KITCHEN: 'kitchen',
  POS: 'pos',
  ORDER_PREFIX: 'order:',
} as const;

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: ['PAID'],
  PAID: [],
};
