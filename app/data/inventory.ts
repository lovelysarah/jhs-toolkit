import { db } from "~/utils/db.server";
import { nanoid } from "nanoid";
import { CHECKOUT_ERROR_MESSAGES, CREATE_TX_STATUS } from "~/types/inventory";

import type {
    Prisma,
    InventoryLocation,
    PrismaClient,
    Transaction,
    CHECKOUT_TYPE,
} from "@prisma/client";
import type { InfoFromUser } from "./user";
import type { ProcessedCart } from "~/utils/cart";
import type {
    CreateTxResult,
    TxFailure,
    TxResult,
    TxSuccess,
} from "~/types/inventory";

type TransactionInput = {
    tx: Omit<
        PrismaClient<
            Prisma.PrismaClientOptions,
            never,
            Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
        >,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use"
    >;
    linkId: string;
    inventory: Pick<InventoryLocation, "id" | "name">;
    type: CHECKOUT_TYPE;
    note: string;
    displayName: string;
    items: ProcessedCart["items"];
    itemCount: number;
    user: InfoFromUser;
};

const countQuantity = (items: ProcessedCart["items"]) =>
    items.reduce((acc, { quantity }) => acc + quantity, 0);

const createTransaction = async ({
    tx,
    linkId,
    inventory,
    type,
    note,
    displayName,
    items,
    itemCount,
    user,
}: TransactionInput) => {
    // Decrement items
    for (const { quantity, item } of items) {
        const previous = await tx.item.findFirstOrThrow({
            where: { id: item.id },
            select: { quantity: true, id: true },
        });

        if (previous.quantity - quantity < 0) throw new Error("NO_STOCK");

        await tx.item.update({
            where: { id: previous.id },
            data: { quantity: previous.quantity - quantity },
        });
    }

    // Create transaction record
    return await tx.transaction.create({
        data: {
            link_id: linkId,
            checkout_type: type,
            action_type: "CHECK_OUT",
            status: type === "PERMANENT" ? "COMPLETED" : "PENDING",
            note: note,

            guest_display_name: displayName ? displayName : null,

            by_guest: user.account_type === "GUEST",
            item_count: itemCount,
            items: items.map(({ quantity, item }) => ({
                name: item.name,
                quantity,
                id: item.id,
            })) as Prisma.JsonArray,

            inventory: {
                connect: { id: inventory.id },
            },
            user: {
                connect: { id: user.id },
            },
            created_at: new Date(),
        },
        select: { id: true, created_at: true },
    });
};

type CheckoutQueryInfo = {
    cart: {
        id: string;
        itemCount: number;
        permanentItems: ProcessedCart["items"];
        temporaryItems: ProcessedCart["items"];
    };
    inventory: Pick<InventoryLocation, "id" | "name">;
    displayName: string;
    note: string;
    user: InfoFromUser;
};

export const checkout = async ({
    inventory,
    displayName,
    note,
    user,
    cart,
}: CheckoutQueryInfo): Promise<TxResult<CreateTxResult>> => {
    const result = await db
        .$transaction(async (tx) => {
            const transactions = [] as Pick<Transaction, "id" | "created_at">[];
            const linkId = nanoid(10);
            const sharedData = {
                tx,
                linkId,
                inventory: inventory,
                displayName: displayName,
                note: note,
                user: user,
            };
            if (cart.permanentItems.length > 0) {
                const permanentTX = await createTransaction({
                    ...sharedData,
                    type: "PERMANENT",
                    itemCount: countQuantity(cart.permanentItems),
                    items: cart.permanentItems,
                    user: user,
                });
                transactions.push(permanentTX);
            }
            if (cart.temporaryItems.length > 0) {
                const temporatyTX = await createTransaction({
                    ...sharedData,
                    type: "TEMPORARY",
                    itemCount: countQuantity(cart.temporaryItems),
                    items: cart.temporaryItems,
                    user: user,
                });
                transactions.push(temporatyTX);
            }
            // Update user's cart
            await tx.cart.delete({
                where: { id: cart.id },
            });

            return {
                type: CREATE_TX_STATUS.SUCCESS,
                data: { transactions },
                message: `Successfully created ${
                    transactions.length
                } transaction${transactions.length > 1 ? "s" : ""}`,
            } satisfies TxSuccess<CreateTxResult>;
        })
        .catch((e) => {
            const error = e as Error;
            let message = CHECKOUT_ERROR_MESSAGES.SERVER_ERROR;
            console.log(error);
            if (error.message === "NO_STOCK")
                message = CHECKOUT_ERROR_MESSAGES.NO_STOCK;

            return {
                type: CREATE_TX_STATUS.FAILURE,
                message,
            } satisfies TxFailure;
        });

    return result;
};
