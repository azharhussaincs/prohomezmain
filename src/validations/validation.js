import Joi from 'joi';

const productSchema = Joi.object({
    productName: Joi.string().required(),
    productPrice: Joi.number().required(),
    discountedPrice: Joi.number().optional(),
    productDescription: Joi.string().required(),
    selectedCategory: Joi.string().required(),
    selectedImages: Joi.array().items(Joi.string()).required(),
    productBeds: Joi.number().optional(),  // Optional by default
    productBaths: Joi.number().optional(),
    propertyArea: Joi.number().optional(),
}).custom((value, helpers) => {
    // Check if vendor's brand_type is 'Real Estate' and validate accordingly
    if (value.brandType === 'Real Estate') {
        if (value.productBeds == null || value.productBaths == null || value.propertyArea == null) {
            return helpers.message('Real Estate details (bed, bath, sqft) must be provided.');
        }
        // Additional validation if necessary
        if (value.productBeds <= 0 || value.productBaths <= 0 || value.propertyArea <= 0) {
            return helpers.message('Bed, bath, and sqft must be positive values.');
        }
    }
    return value;  // return the validated value
});

export const validateProduct = (productData) => productSchema.validate(productData);
