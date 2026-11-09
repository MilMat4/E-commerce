const express = require('express');
const { upload, validateImageContent } = require('../middleware/uploadMiddleware');
const {
  getProducts,
  getMyProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getProducts);
router.get('/mine', protect, authorize('seller', 'admin'), getMyProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('seller', 'admin'), upload.array('images', 5), validateImageContent, createProduct);
router.put('/:id', protect, authorize('seller', 'admin'), upload.array('images', 5), validateImageContent, updateProduct);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteProduct);

module.exports = router;
