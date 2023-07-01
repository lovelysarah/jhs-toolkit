import { db } from "~/utils/db.server";

export const getSingleItem = async (shortId: string) => {
    return await db.item.findFirst({ where: { short_id: shortId } });
};

export type SingleItemResult = Awaited<ReturnType<typeof getSingleItem>>;

export const getCollectionOfItems = async (ids: string[]) => {
    return await db.item.findMany({ where: { name: { in: ids } } });
};

export type CollectionOfItems = Awaited<
    ReturnType<typeof getCollectionOfItems>
>;
