// ...existing code...

export const getReviews = async (req, res) => {
  try {
    // ...existing code...
    res.json({ success: true, reviews: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
