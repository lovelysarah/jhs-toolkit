import {
    ITEM_DESCRIPTION_MAX_LENGTH,
    ITEM_MAX_QUANTITY,
    ITEM_NOTE_MAX_LENGTH,
} from "~/constant";
import { db } from "~/utils/db.server";

export const validateName = (name: string) => {
    if (name.length < 5) return "Name must be at least 5 characters long";
};

export const validateDescription = (description: string) => {
    console.log(description.length);
    if (description.length > ITEM_DESCRIPTION_MAX_LENGTH)
        return `Description must be less than ${ITEM_DESCRIPTION_MAX_LENGTH} characters long`;
};
export const validateNote = (note: string) => {
    if (note.length > ITEM_NOTE_MAX_LENGTH)
        return `Note must be less than ${ITEM_NOTE_MAX_LENGTH} characters long`;
};
export const validateQuantity = (quantity: number) => {
    if (quantity < 0) return "Quantity must be a positive integer";
    if (quantity > ITEM_MAX_QUANTITY)
        return `Quantity must be no greater than ${ITEM_MAX_QUANTITY}`;
};
export const validateTag = async (tag: string, inventoryId: string) => {
    const ids = await db.tag.findMany({
        where: { inventory: { short_id: inventoryId } },
        select: { id: true },
    });
    const validTags = ids.map((tag) => tag.id);

    if (!validTags.includes(tag)) return "Invalid tag";
};
