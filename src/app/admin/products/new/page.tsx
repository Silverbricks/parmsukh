import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/product-form";

export default async function NewProduct() {
  await requirePermission("products:manage");
  const categories = await db.category.findMany({ orderBy: { sort: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Add product" sub="Add stock batches after creating the product – products without a valid batch are shown as out of stock." />
      <div className="card"><ProductForm categories={categories} /></div>
    </div>
  );
}
