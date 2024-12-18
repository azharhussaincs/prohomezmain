import Joi from 'joi';

const productSchema = Joi.object({
    productName: Joi.string().required(),
    productPrice: Joi.number().required(),
    discountedPrice: Joi.number().optional(),
    productDescription: Joi.string().required(),
    selectedCategory: Joi.string().required(),
    selectedImages: Joi.array().items(Joi.string()).required(),
});

export const validateProduct = (productData) => productSchema.validate(productData);
