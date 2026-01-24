export const SHIPMENT_STATUS = {
  PENDING: 'pending',
  LABEL_CREATED: 'label_created',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
  CANCELLED: 'cancelled'
};

export const COURIER_PROVIDERS = {
  INDIA_POST: 'india_post',
  SPEED_POST: 'speed_post',
  DELHIVERY: 'delhivery',
  BLUEDART: 'bluedart',
  DTDC: 'dtdc',
  FEDEX: 'fedex'
};

// Map India Post statuses to our internal statuses
export const INDIA_POST_STATUS_MAP = {
  'Item Booked': SHIPMENT_STATUS.LABEL_CREATED,
  'Item Bagged': SHIPMENT_STATUS.PICKED_UP,
  'In Transit': SHIPMENT_STATUS.IN_TRANSIT,
  'Reached at Hub': SHIPMENT_STATUS.IN_TRANSIT,
  'Dispatched': SHIPMENT_STATUS.IN_TRANSIT,
  'Out for Delivery': SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  'Item Delivered': SHIPMENT_STATUS.DELIVERED,
  'Delivery Attempted': SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  'Refused': SHIPMENT_STATUS.FAILED,
  'Return to Sender': SHIPMENT_STATUS.RETURNED,
  'Lost': SHIPMENT_STATUS.FAILED,
  'Damaged': SHIPMENT_STATUS.FAILED
};
