const saleModel = require("../models/sale-model");
const productModel = require("../models/product-model");

async function getDiscountForProduct(productId) {
    const product = await productModel.findById(productId);
    if (!product) return null;

    const now = new Date();

    const activeSales = await saleModel.find({
        startDate: { $lte: now },
        endDate: { $gte: now }
    });


    const applicable = activeSales.filter(s =>
        s.productIds.map(id => id.toString()).includes(productId.toString())
    );

    if (applicable.length === 0) return {
        finalPrice: product.price,
        percent: 0,
        name: null,
        endDate: null
    };

    // Step 3: pick the highest percentage sale
    const bestSale = applicable.reduce((max, current) =>
        current.percentage > max.percentage ? current : max
    );

    const percent = bestSale.percentage;
    const finalPrice = product.price - (product.price * percent / 100);

    return {
        finalPrice,
        percent,
        name: bestSale.title,
        endDate: bestSale.endDate
    };
}

module.exports = { getDiscountForProduct };
