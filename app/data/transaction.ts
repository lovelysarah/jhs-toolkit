import type { Prisma } from "@prisma/client";
import { isTxItem } from "~/types/tx";
import { db } from "~/utils/db.server";

// Returns details about a specific transaction
export const getTransactionDetails = async (transactionId: string) => {
    return await db.transaction.findFirstOrThrow({
        where: { id: transactionId },
        include: { inventory: true, user: true },
    });
};
export type TransactionDetails = Awaited<
    ReturnType<typeof getTransactionDetails>
>;

// Returns a list of transactions
export const getTransactionsFromRange = async <
    T extends Prisma.TransactionFindManyArgs
>(
    options: T
) => {
    return await db.transaction.findMany({
        ...options,
        select: {
            id: true,
            by_guest: true,
            status: true,
            action_type: true,
            item_count: true,
            resolved_at: true,
            created_at: true,
            checkout_type: true,
            guest_display_name: true,
            inventory: { select: { name: true } },
            user: { select: { name: true } },
        },
    });
};
export type MultipleTransactions = Awaited<
    ReturnType<typeof getTransactionsFromRange>
>;

export const resolveTransactions = async (ids: string[]) => {
    // TODO: Pass the data as args.
    const txs = await db.transaction.findMany({
        where: {
            id: { in: ids },
        },
        select: {
            items: true,
            id: true,
        },
    });

    return await db.$transaction(async (tx) => {
        for (const { items } of txs) {
            for (const item of items) {
                if (!isTxItem(item)) throw new Error("Invalid item type");

                await tx.item.update({
                    where: { id: item.id },
                    data: {
                        quantity: { increment: item.quantity },
                    },
                });

                console.log(`Incremented ${item.name} by ${item.quantity}`);
            }
        }

        await tx.transaction.updateMany({
            where: { id: { in: ids } },
            data: {
                status: "COMPLETED",
                resolved_at: new Date(),
            },
        });

        return await db.transaction.findMany({
            where: { id: { in: ids } },
            select: { id: true, status: true, resolved_at: true },
        });
    });
};

export const getPendingTransactions = async () => {
    return await db.transaction.findMany({
        where: { status: "PENDING" },
        orderBy: { created_at: "desc" },
        select: {
            id: true,
            by_guest: true,
            status: true,
            action_type: true,
            item_count: true,
            resolved_at: true,
            created_at: true,
            checkout_type: true,
            guest_display_name: true,
            inventory: { select: { name: true } },
            user: { select: { name: true } },
        },
    });
};

export type PendingTransactions = Awaited<
    ReturnType<typeof getPendingTransactions>
>;
