import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import {
    validateDescription,
    validateName,
    validateNote,
    validateQuantity,
    validateTag,
} from "~/helper/ItemFormValidators";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

import type { ItemActionData, ItemFieldErrors } from "~/types/form";
import type { ControllerArgs } from "~/types/controller";

/**
 * Soft deletes an item from the database.
 * @route DELETE /admin/items/$inventoryId/edit-item/$itemId
 * @access Private
 */
export const deleteItem = async ({ request, params }: ControllerArgs) => {
    const form = await request.formData();

    const inventoryId = params.inventoryId;
    const id = form.get("id");

    if (typeof id !== "string" || typeof inventoryId !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        // Delete all cart items linked to this item
        await db.cartItem.deleteMany({
            where: { item_id: id },
        });

        // Soft delete item data
        await db.item.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return redirect(`/admin/items/${inventoryId}`);
    } catch (e) {
        return badRequest({ formError: "Server error" });
    }
};

/**
 * Updates an item in the database.
 * @route POST /admin/items/$inventoryId/edit-item/$itemId
 * @access Private
 */
export const editItem = async ({ request, params }: ControllerArgs) => {
    const inventoryId = params.inventoryId;

    invariant(inventoryId, "Expected inventory ID!");
    invariant(params.itemId, "Expected tag ID!");

    const location = await db.inventoryLocation.findFirst({
        where: { short_id: inventoryId },
    });

    const itemCurrent = await db.item.findFirst({
        where: {
            AND: [
                { id: params.itemId },
                { location: { short_id: inventoryId } },
            ],
        },
        include: { tag: true },
    });

    if (!location || !itemCurrent) {
        throw new Error("Something went wrong, not found");
    }

    const form = await request.formData();
    const name = form.get("name") || itemCurrent.name;
    const description = form.get("description");
    const note = form.get("note");
    const quantity = Number(form.get("quantity")) || 0;
    const tag = form.get("tag") || itemCurrent.tag.id;

    if (
        typeof name !== "string" ||
        typeof description !== "string" ||
        typeof note !== "string" ||
        typeof quantity !== "number" ||
        typeof tag !== "string"
    ) {
        return badRequest<ItemActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Invalid form data",
        });
    }

    const fields = { name, description, note, quantity, tag };

    const fieldErrors: ItemFieldErrors = {
        name: validateName(name),
        description: validateDescription(description),
        note: validateNote(note),
        quantity: validateQuantity(quantity),
        tag: await validateTag(tag, inventoryId),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<ItemActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    try {
        await db.item.update({
            where: {
                id: params.itemId,
            },
            data: {
                name,
                description,
                note,
                quantity,
                tag: { connect: { id: tag } },
            },
        });

        return redirect(`/admin/items/${inventoryId}`, { status: 201 });
    } catch (err) {
        return badRequest<ItemActionData>({
            formError: "Server error",
            fieldErrors,
            fields,
        });
    }
};
