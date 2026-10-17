import { Router } from 'express';
import { createPhone, deletePhone, listPhones, updatePhone } from '../controllers/phone.controller.js';
import { validate } from '../middleware/validate.js';
import { phoneBodySchema, phoneListQuerySchema } from '../validators/phone.schema.js';

const router = Router();

router.get('/', validate({ query: phoneListQuerySchema }), listPhones);
router.post('/', validate({ body: phoneBodySchema }), createPhone);
router.put('/:id', validate({ body: phoneBodySchema }), updatePhone);
router.delete('/:id', deletePhone);

export default router;
