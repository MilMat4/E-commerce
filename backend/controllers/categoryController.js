const Category = require('../models/Category');
const Product = require('../models/Product');
const { isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const getCategories = async (req, res) => {
  try {
    const filter = req.path === '/all' ? {} : { status: 'active' };
    const categories = await Category.find(filter).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch categories.');
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description = '' } = req.body || {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }
    if (typeof description !== 'string') {
      return res.status(400).json({ success: false, message: 'Category description must be text.' });
    }

    const normalizedName = name.trim();
    const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Category name must contain letters or numbers.' });
    }

    const category = await Category.create({
      name: normalizedName,
      slug,
      description: typeof description === 'string' ? description.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Category creation failed.');
  }
};

const updateCategory = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    const { name, description, status } = req.body || {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Category name cannot be empty.' });
      }
      const normalizedName = name.trim();
      const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!slug) {
        return res.status(400).json({ success: false, message: 'Category name must contain letters or numbers.' });
      }
      category.name = normalizedName;
      category.slug = slug;
    }
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ success: false, message: 'Description must be text.' });
      }
      category.description = description.trim();
    }
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
      }
      category.status = status;
    }
    if (!name && description === undefined && status === undefined) {
      return res.status(400).json({ success: false, message: 'Provide a category field to update.' });
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Category update failed.');
  }
};

const deleteCategory = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    if (await Product.exists({ category: category._id })) {
      return res.status(409).json({
        success: false,
        message: 'This category is used by products. Deactivate it instead of deleting it.',
      });
    }

    await category.deleteOne();
    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    return sendControllerError(res, error, 'Category deletion failed.');
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
