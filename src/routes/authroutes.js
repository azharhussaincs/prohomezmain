import express from 'express';
import { checkStoreId, checkEmail, loginVendor, registerVendor } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/register', registerVendor);
router.post('/login', loginVendor);
router.get('/check-store-id/:storeId', checkStoreId);
router.get('/check-email/:email', checkEmail);

export default router;
