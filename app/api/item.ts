import { db } from "~/utils/db.server";

export const getAllItems = async () => {
    return await db.item.findMany({
        orderBy: { category: "asc" },
    });
};

export type AllItemsResult = Awaited<ReturnType<typeof getAllItems>>;

export const getSingleItem = async (shortId: string) => {
    return await db.item.findFirst({ where: { shortId } });
};

export type SingleItemResult = Awaited<ReturnType<typeof getSingleItem>>;
