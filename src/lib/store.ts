import { db } from "./db";
import { istNow } from "./format";

/** Sellable stock = non-expired batches only, so expired products automatically become unavailable. */
export const sellableBatchWhere = () => ({ quantity: { gt: 0 }, expiryDate: { gt: istNow().date } });

export async function listProducts(opts: { category?: string; q?: string; system?: string } = {}) {
  const products = await db.product.findMany({
    where: {
      active: true,
      ...(opts.category ? { category: { slug: opts.category } } : {}),
      ...(opts.system ? { system: opts.system } : {}),
      ...(opts.q ? { OR: [{ name: { contains: opts.q } }, { brand: { contains: opts.q } }, { ingredients: { contains: opts.q } }, { description: { contains: opts.q } }] } : {}),
    },
    include: { batches: { where: sellableBatchWhere() }, category: true },
    orderBy: [{ ownBrand: "desc" }, { name: "asc" }],
  });
  return products.map((p) => ({ ...p, stock: p.batches.reduce((s, b) => s + b.quantity, 0) }));
}
