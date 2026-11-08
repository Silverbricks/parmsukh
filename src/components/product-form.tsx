import { ActionForm } from "./action-form";
import { Area, Field, Select } from "./ui";
import { saveProduct } from "@/app/actions/admin";

type P = {
  id: string; sku: string; name: string; brand: string; manufacturer: string; categoryId: string; system: string; description: string; ingredients: string;
  packSize: string; mrp: number; price: number; gstPercent: number; usage: string; warnings: string; regulatoryInfo: string;
  requiresPrescription: boolean; restricted: boolean; returnEligible: boolean; active: boolean; ownBrand: boolean;
};

export function ProductForm({ p, categories }: { p?: P; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveProduct} submit={p ? "Save product" : "Create product"}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Product name" name="name" required defaultValue={p?.name} />
        <Field label="SKU" name="sku" defaultValue={p?.sku} disabled={!!p} hint={p ? undefined : "Leave blank to auto-generate"} />
        <Select label="Category" name="categoryId" required options={categories.map((c) => [c.id, c.name] as [string, string])} defaultValue={p?.categoryId} />
        <Field label="Brand" name="brand" required defaultValue={p?.brand ?? "PARMSUKH"} />
        <Field label="Manufacturer" name="manufacturer" required defaultValue={p?.manufacturer} />
        <Select label="System" name="system" required options={["AYURVEDA", "HOMOEOPATHY", "HERBAL", "WELLNESS", "OTHER"]} defaultValue={p?.system} />
        <Field label="Pack size" name="packSize" required defaultValue={p?.packSize} />
        <Field label="MRP (₹)" name="mrp" type="number" required defaultValue={p?.mrp} />
        <Field label="Selling price (₹)" name="price" type="number" required defaultValue={p?.price} />
        <Field label="GST %" name="gstPercent" type="number" defaultValue={p?.gstPercent ?? 12} />
        <Field label="Regulatory classification / licence details" name="regulatoryInfo" defaultValue={p?.regulatoryInfo} className="md:col-span-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Area label="Description" name="description" defaultValue={p?.description} />
        <Area label="Ingredients" name="ingredients" defaultValue={p?.ingredients} />
        <Area label="Usage information" name="usage" defaultValue={p?.usage} />
        <Area label="Warnings & precautions" name="warnings" defaultValue={p?.warnings} />
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Visible in store</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="requiresPrescription" defaultChecked={p?.requiresPrescription} /> Prescription required</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="restricted" defaultChecked={p?.restricted} /> Restricted (no guest checkout)</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="returnEligible" defaultChecked={p?.returnEligible ?? true} /> Return eligible</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="ownBrand" defaultChecked={p?.ownBrand} /> PARMSUKH own brand</label>
      </div>
      <p className="text-xs text-charcoal-500">Product claims and advertising must comply with the Drugs & Magic Remedies (Objectionable Advertisements) Act and applicable AYUSH rules. Avoid cure claims.</p>
    </ActionForm>
  );
}
