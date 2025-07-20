// ...existing code...

export const getOrders = async (req, res) => {
  try {
    // Example: fetch country/city/country code data
    // ...existing code...
    res.json({ success: true, orders: [{ id: 101, item: 'Herbal Tea' }], countries, cities, countryCodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
