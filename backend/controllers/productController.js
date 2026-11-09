const fs = require('fs/promises');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { isValidObjectId, escapeRegex } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const removeUploadedFiles = async (files = []) => {
  const results = await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
  results.filter((result) => result.status === 'rejected').forEach((result) => {
    if (result.reason.code !== 'ENOENT') console.error('Could not remove uploaded image:', result.reason);
  });
};

const removeStoredImages = async (imagePaths = []) => {
  const uploadDirectory = path.join(__dirname, '../uploads/products');
  const results = await Promise.allSettled(
    imagePaths.map((imagePath) => fs.unlink(path.join(uploadDirectory, path.basename(imagePath))))
  );
  results.filter((result) => result.status === 'rejected').forEach((result) => {
    if (result.reason.code !== 'ENOENT') console.error('Could not remove old product image:', result.reason);
  });
};

const getProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      page = '1',
      limit = '20',
    } = req.query;
    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1
      || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    }
    if (category && !isValidObjectId(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }
    if (category && !(await Category.exists({ _id: category, status: 'active' }))) {
      return res.status(400).json({ success: false, message: 'Select an existing active category.' });
    }
    if (minPrice !== undefined && (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)) {
      return res.status(400).json({ success: false, message: 'minPrice must be a non-negative number.' });
    }
    if (maxPrice !== undefined && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)) {
      return res.status(400).json({ success: false, message: 'maxPrice must be a non-negative number.' });
    }
    if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({ success: false, message: 'minPrice cannot be greater than maxPrice.' });
    }

    const activeCategoryIds = await Category.distinct('_id', { status: 'active' });
    const filter = { status: 'active', category: { $in: activeCategoryIds } };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: escapeRegex(String(search).slice(0, 100)), $options: 'i' };
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    const sortOptions = {
      'price-low': { price: 1 },
      'price-high': { price: -1 },
      newest: { createdAt: -1 },
    };
    if (sort && !sortOptions[sort]) {
      return res.status(400).json({ success: false, message: 'sort must be price-low, price-high, or newest.' });
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('seller', 'name')
        .sort(sortOptions[sort] || sortOptions.newest)
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      products,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch products.');
  }
};

const getMyProducts = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { seller: req.user._id };
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'name')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch your products.');
  }
};

const getProductById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const product = await Product.findOne({ _id: req.params.id, status: 'active' })
      .populate({ path: 'category', match: { status: 'active' }, select: 'name slug' })
      .populate('seller', 'name');

    if (!product || !product.category) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch product.');
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock = 0, category } = req.body || {};
    if (typeof name !== 'string' || !name.trim()
      || typeof description !== 'string' || !description.trim()
      || price === undefined || price === '' || !category) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required.',
      });
    }
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!Number.isFinite(numericPrice) || numericPrice < 0
      || !Number.isSafeInteger(numericStock) || numericStock < 0) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: 'Price must be non-negative and stock must be a non-negative whole number.' });
    }
    if (!isValidObjectId(category)) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }
    if (req.user.role === 'seller' && (!req.user.isApprovedSeller || req.user.status !== 'active')) {
      await removeUploadedFiles(req.files);
      return res.status(403).json({ success: false, message: 'Your seller account must be approved before creating products.' });
    }

    const categoryExists = await Category.findOne({ _id: category, status: 'active' });
    if (!categoryExists) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: 'Select an existing active category.' });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      stock: numericStock,
      category,
      seller: req.user._id,
      images: (req.files || []).map((file) => `/uploads/products/${file.filename}`),
    });

    return res.status(201).json({ success: true, message: 'Product created successfully.', product });
  } catch (error) {
    await removeUploadedFiles(req.files);
    return sendControllerError(res, error, 'Product creation failed.');
  }
};

const updateProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      await removeUploadedFiles(req.files);
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      await removeUploadedFiles(req.files);
      return res.status(403).json({ success: false, message: 'You can only update your own products.' });
    }
    if (req.user.role === 'seller' && (!req.user.isApprovedSeller || req.user.status !== 'active')) {
      await removeUploadedFiles(req.files);
      return res.status(403).json({ success: false, message: 'Your seller account must be approved to manage products.' });
    }

    const body = req.body || {};
    const allowedFields = ['name', 'description', 'price', 'stock', 'status'];
    for (const field of allowedFields) {
      if (body[field] === undefined) continue;
      if (field === 'name' || field === 'description') {
        if (typeof body[field] !== 'string' || !body[field].trim()) {
          await removeUploadedFiles(req.files);
          return res.status(400).json({ success: false, message: `${field} cannot be empty.` });
        }
        product[field] = body[field].trim();
      } else if (field === 'price') {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          await removeUploadedFiles(req.files);
          return res.status(400).json({ success: false, message: 'Price must be a non-negative number.' });
        }
        product.price = value;
      } else if (field === 'stock') {
        const value = Number(body[field]);
        if (!Number.isSafeInteger(value) || value < 0) {
          await removeUploadedFiles(req.files);
          return res.status(400).json({ success: false, message: 'Stock must be a non-negative whole number.' });
        }
        product.stock = value;
      } else if (!['active', 'inactive', 'draft'].includes(body[field])) {
        await removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: 'Status must be active, inactive, or draft.' });
      } else {
        product.status = body[field];
      }
    }

    if (body.category !== undefined) {
      if (!isValidObjectId(body.category)
        || !(await Category.exists({ _id: body.category, status: 'active' }))) {
        await removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: 'Select an existing active category.' });
      }
      product.category = body.category;
    }

    const oldImages = product.images;
    if (req.files && req.files.length > 0) {
      product.images = req.files.map((file) => `/uploads/products/${file.filename}`);
    }
    await product.save();
    if (req.files && req.files.length > 0) await removeStoredImages(oldImages);

    return res.status(200).json({ success: true, message: 'Product updated successfully.', product });
  } catch (error) {
    await removeUploadedFiles(req.files);
    return sendControllerError(res, error, 'Product update failed.');
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only deactivate your own products.' });
    }
    if (req.user.role === 'seller' && (!req.user.isApprovedSeller || req.user.status !== 'active')) {
      return res.status(403).json({ success: false, message: 'Your seller account must be approved to manage products.' });
    }

    // Deactivation preserves product details referenced by historical orders.
    product.status = 'inactive';
    await product.save();
    return res.status(200).json({ success: true, message: 'Product deactivated successfully.' });
  } catch (error) {
    return sendControllerError(res, error, 'Product deactivation failed.');
  }
};

module.exports = {
  getProducts,
  getMyProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
