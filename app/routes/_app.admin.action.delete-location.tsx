import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

export const loader = async ({ request }: LoaderArgs) => redirect("/admin");

export const action: ActionFunction = async ({ request }) => {
    const form = await request.formData();
    const id = form.get("id") || "";

    if (typeof id !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        await db.inventoryLocation.delete({
            where: { id },
        });

        return redirect("/admin/locations");
    } catch (err) {
        const error = err as Error;
        console.log(error.message);
        // return badRequest({ formError: error.message });
    }
};
