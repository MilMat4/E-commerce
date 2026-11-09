const getOverallOrderStatus = (items) => {
  if (!items.length) return 'pending';
  const statuses = new Set(items.map((item) => item.fulfillmentStatus));
  if (statuses.size === 1) return items[0].fulfillmentStatus;
  return 'partially_fulfilled';
};

module.exports = { getOverallOrderStatus };
