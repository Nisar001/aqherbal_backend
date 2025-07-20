// ...existing code...

export const getCategories = async (req, res) => {
  try {
    // ...existing code...
    res.json({ success: true, categories: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
