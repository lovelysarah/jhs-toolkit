import { json, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

import type { ControllerArgs } from "~/types/controller";
import type {
    ModifyLocationActionData,
    ModifyLocationFieldErrors,
} from "~/types/form";

export const deleteInventoryLocation = async ({
    request,
    params,
}: ControllerArgs) => {
    const form = await request.formData();
    const id = form.get("id") || "";

    if (typeof id !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        await db.$transaction(async (tx) => {
            // Find all tags in this location
            const tags = await tx.tag.findMany({
                where: {
                    AND: [
                        {
                            inventory: { id },
                            deleted_at: { isSet: false },
                        },
                    ],
                },
            });
            const tagsIds = tags.map((tag) => tag.id);

            // Find all items in this location
            const items = await tx.item.findMany({
                where: {
                    AND: [
                        {
                            location: { id },
                            deleted_at: { isSet: false },
                        },
                    ],
                },
                select: { id: true },
            });
            const itemsIds = items.map((item) => item.id);

            // Hard delete all carts which cascades to cart items
            await tx.cart.deleteMany({
                where: {
                    inventory: { id },
                },
            });

            // Soft delete tag data
            await tx.tag.updateMany({
                where: { id: { in: tagsIds } },
                data: {
                    deleted_at: new Date(),
                },
            });

            // Soft delete item data
            await tx.item.updateMany({
                where: { id: { in: itemsIds } },
                data: {
                    deleted_at: new Date(),
                },
            });

            await tx.inventoryLocation.update({
                where: { id },
                data: {
                    deleted_at: new Date(),
                },
            });
        });

        return redirect("/admin/locations");
    } catch (err) {
        const error = err as Error;
        console.log(error.message);
        return badRequest({ formError: error.message });
    }
};

export const editInventoryLocation = async ({
    request,
    params,
}: ControllerArgs) => {
    invariant(params.id, "Expected user ID!");

    const location = await db.inventoryLocation.findFirst({
        where: { id: params.id },
    });

    if (!location) {
        throw new Error("Something went wrong, not found");
    }

    const form = await request.formData();
    const name = form.get("name") || location.name;
    const description = form.get("description");

    console.log({ description });
    if (typeof name !== "string" || typeof description !== "string") {
        return badRequest<ModifyLocationActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Invalid form data",
        });
    }

    const fields = { name, description };

    const validateName = (name: string) => {
        if (name.length < 5) return "Name must be at least 5 characters long";
    };

    const validateDescription = (description: string) => {
        console.log(description.length);
        if (description.length > 100)
            return "Description must be less than 100 characters long";
    };

    const fieldErrors: ModifyLocationFieldErrors = {
        name: validateName(name),
        description: validateDescription(description),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<ModifyLocationActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    await db.inventoryLocation.update({
        where: { id: params.id },
        data: {
            name,
            description,
        },
    });

    return json({ success: true }, { status: 201 });
};
