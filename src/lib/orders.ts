import { db } from "./db";

/** Cancels an order and returns allocated stock to the original batches. */
export async function cancelOrderAndRestock(orderId: string, userId: string | null, note: string) {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o || ["CANCELLED", "DISPATCHED", "DELIVERED", "RETURNED"].includes(o.status)) return;
    for (const i of o.items) {
      const b = i.batchNo ? await tx.productBatch.findUnique({ where: { productId_batchNo: { productId: i.productId, batchNo: i.batchNo } } }) : null;
      if (b) {
        await tx.productBatch.update({ where: { id: b.id }, data: { quantity: { increment: i.quantity } } });
        await tx.stockMovement.create({ data: { productId: i.productId, batchId: b.id, change: i.quantity, reason: "CANCELLED_ORDER", refId: o.id, userId } });
      }
    }
    await tx.order.update({
      where: { id: o.id },
      data: {
        status: "CANCELLED", paymentStatus: o.paymentStatus === "PAID" ? "REFUND_REQUESTED" : o.paymentStatus,
        events: { create: { status: "CANCELLED", note, userId } },
      },
    });
  });
}
