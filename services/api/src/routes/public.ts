import { Router } from 'express';
import { db } from '../lib/db';

export const publicRouter = Router();

publicRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const products = await db.query('products', {
      filters: [
        { field: 'slug', op: '==', value: req.params.slug },
        { field: 'status', op: '==', value: 'active' },
      ],
      limit: 1,
    });
    if (!products.length) return res.status(404).json({ error: { message: 'Product not found' } });
    res.json(products[0]);
  } catch (err) {
    next(err);
  }
});
