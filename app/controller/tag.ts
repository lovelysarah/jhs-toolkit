import { json, redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import invariant from "tiny-invariant";

import type { ControllerArgs } from "~/types/controller";
import type { TagActionData, TagFieldErrors, TagFields } from "~/types/form";

/**
 * Soft deletes a tag from the database.
 * NOTE: This also soft deletes all items with this tag.
 * @route DELETE /admin/items/$inventoryId/edit-tag/$tagId
 * @access Private
 */
export const deleteTag = async ({ request, params }: ControllerArgs) => {
    const form = await request.formData();

    const inventoryId = params.inventoryId;
    const id = form.get("id") || "";

    if (typeof id !== "string" || typeof inventoryId !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        await db.$transaction(async (tx) => {
            // Find all items with this tag
            const items = await tx.item.findMany({
                where: {
                    AND: [{ deleted_at: { isSet: false } }, { tag_id: id }],
                },
            });

            const itemsIds = items.map((item) => item.id);

            // Hard delete all cart items linked to these items
            await tx.cartItem.deleteMany({
                where: { AND: [{ item_id: { in: itemsIds } }] },
            });

            // Soft delete item data
            await tx.item.updateMany({
                where: { id: { in: itemsIds } },
                data: {
                    deleted_at: new Date(),
                },
            });

            await tx.tag.update({
                where: { id },
                data: { deleted_at: new Date() },
            });
        });

        return redirect(`/admin/items/${inventoryId}`);
    } catch (err) {
        const error = err as Error;

        return badRequest({ formError: error.message });
    }
};

/**
 * Edits a tag in the database.
 * @route POST /admin/items/$inventoryId/edit-tag/$tagId
 * @access Private
 **/

export const editTag = async ({ request, params }: ControllerArgs) => {
    invariant(params.inventoryId, "Expected location ID!");
    invariant(params.tagId, "Expected tag ID!");

    const location = await db.inventoryLocation.findFirst({
        where: { short_id: params.inventoryId },
    });

    const tag = await db.tag.findFirst({
        where: { id: params.tagId },
    });

    if (!location || !tag) {
        throw new Error("Something went wrong, not found");
    }

    const form = await request.formData();
    const name = form.get("name") || tag.name;
    const description = form.get("description");

    if (typeof name !== "string" || typeof description !== "string") {
        return badRequest<TagActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Invalid form data",
        });
    }

    const fields: TagFields = { name, description };

    const validateName = (name: string) => {
        if (name.length < 5) return "Name must be at least 5 characters long";
    };

    const validateDescription = (description: string) => {
        if (description.length > 100)
            return "Description must be less than 100 characters long";
    };

    const fieldErrors: TagFieldErrors = {
        name: validateName(name),
        description: validateDescription(description),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<TagActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    await db.tag.update({
        where: { id: params.tagId },
        data: {
            name,
            description,
        },
    });

    return json({ success: true }, { status: 201 });
};
