import express from 'express';
// import admin controllers here when ready

const router = express.Router();

// Example admin route
router.get('/view/:id', (req, res) => {
  res.json({ success: true, message: 'Admin view route.' });
});
router.put('/update/:id', (req, res) => {
  res.json({ success: true, message: 'Admin update route.' });
});
router.delete('/delete/:id', (req, res) => {
  res.json({ success: true, message: 'Admin delete route.' });
});
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Admin route is working.' });
});

export default router;
