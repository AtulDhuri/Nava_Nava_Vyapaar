const { AppDataSource } = require("../config/database");
const { Product } = require("../models/Product");

const productRepo = () => AppDataSource.getRepository(Product);

const addProduct = async (req, res) => {
  try {
    const { productCode, name, category, price, uom, gstRate } = req.body;
    if (!productCode || !name || !price || !uom || gstRate === undefined)
      return res.status(400).json({ message: "productCode, name, price, uom and gstRate are required" });

    const product = productRepo().create({ productCode, name, category, price, uom, gstRate });
    await productRepo().save(product);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = productRepo().createQueryBuilder("product");
    if (search)
      query.where("product.name ILIKE :search OR product.productCode ILIKE :search", {
        search: `%${search}%`,
      });
    res.json(await query.getMany());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await productRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!product) return res.status(404).json({ message: "Product not found" });

    productRepo().merge(product, req.body);
    await productRepo().save(product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await productRepo().findOneBy({ id: parseInt(req.params.id) });
    if (!product) return res.status(404).json({ message: "Product not found" });

    await productRepo().remove(product);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addProduct, getProducts, updateProduct, deleteProduct };
