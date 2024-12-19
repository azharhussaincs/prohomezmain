import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadImages, getAllImages, createProduct, getProducts } from '../controllers/controllers.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/uploadImages', upload.array('image', 10), uploadImages);

router.get('/images', getAllImages);

router.post('/createproduct', createProduct);

router.get('/products', getProducts);

export default router;