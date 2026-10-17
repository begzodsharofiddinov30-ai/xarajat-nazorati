import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../validators/category.schema.js';

const router = Router();

router.get('/', listCategories);
router.post('/', validate({ body: categoryCreateSchema }), createCategory);
router.put('/:id', validate({ body: categoryUpdateSchema }), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
