import { redirect } from "@remix-run/node";
import { badRequest } from "~/utils/request.server";

import type { LoaderArgs } from "@remix-run/node";
import { db } from "~/utils/db.server";

export const loader = async () => redirect("/admin");

export const action = async ({ request }: LoaderArgs) => {
    const form = await request.formData();
    const id = form.get("id") || "";

    if (typeof id !== "string") {
        return badRequest({ formError: "Invalid form data" });
    }

    try {
        await db.user.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    } catch (err) {
        const error = err as Error;

        console.log(error.message);
    }

    return redirect("/admin/users");
};
