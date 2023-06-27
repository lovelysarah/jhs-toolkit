import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

export const loader = async ({ request }: LoaderArgs) => redirect("/admin");

export const action: ActionFunction = async ({ request, params }) => {
    const inventoryId = params.inventoryId;

    invariant(inventoryId, "inventoryId should be defined");

    const form = await request.formData();
    const id = form.get("id") || "";

    if (typeof id !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        await db.item.delete({
            where: { id },
        });

        return redirect(`/admin/items/${inventoryId}`);
    } catch (err) {
        const error = err as Error;
        console.log(error.message);
        // return badRequest({ formError: error.message });
    }
};
