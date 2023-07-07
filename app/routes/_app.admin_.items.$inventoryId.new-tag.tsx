import { redirect } from "@remix-run/node";
import { Form, Link, useActionData, useParams } from "@remix-run/react";
import { FormAlert } from "~/components/FormAlert";
import { badRequest } from "~/utils/request.server";

import type { ActionFunction } from "@remix-run/node";
import type {
    ModifyLocationActionData,
    ModifyLocationFieldErrors,
} from "~/types/form";
import { Tag } from "lucide-react";
import { db } from "~/utils/db.server";
import { requireAdmin } from "~/utils/session.server";

export const action: ActionFunction = async ({ request, params }) => {
    const inventoryId = params.inventoryId;
    const admin = await requireAdmin(request);
    // Get the form data
    const form = await request.formData();
    const name = form.get("name");
    const description = form.get("description") || "";

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

    console.log("IS valid");

    try {
        // throw new Error("test");

        await db.tag.create({
            data: {
                name: name,
                description: description,
                created_at: new Date(),
                inventory: { connect: { short_id: inventoryId } },
                created_by: { connect: { id: admin.id } },
            },
        });

        return redirect(`/admin/items/${inventoryId}`);
    } catch (err) {
        console.log(err);
        return badRequest<ModifyLocationActionData>({
            fields,
            fieldErrors,
            formError: "Server error",
        });
    }
};

type NameInputProps = {
    defaultName: string | undefined;
    condition: string | undefined;
};
const NameInput = ({ defaultName, condition }: NameInputProps): JSX.Element => {
    return (
        <>
            <input
                name="name"
                defaultValue={defaultName}
                type="text"
                className="input input-bordered"
                placeholder="Name"
            />
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};
type DescriptionInputProps = {
    defaultDescription: string | undefined;
    condition: string | undefined;
};
const DescriptionInput = ({
    defaultDescription,
    condition,
}: DescriptionInputProps): JSX.Element => {
    return (
        <>
            <input
                name="description"
                defaultValue={defaultDescription}
                type="text"
                className="input input-bordered"
                placeholder="Description"
            />
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};

export default function AdminCreateUserRoute() {
    const action = useActionData<ModifyLocationActionData>();
    const params = useParams();

    return (
        <div>
            <h1 className="theme-text-h3 mb-2 flex gap-2 items-center">
                <Tag size={36} />
                Create a new tag
            </h1>
            <Form
                className="flex flex-col gap-2"
                method="POST">
                <span className="theme-text-h4">Name of the tag</span>
                <NameInput
                    defaultName={action?.fields?.name}
                    condition={action?.fieldErrors?.name}
                />{" "}
                <span className="theme-text-h4">Items that... </span>
                <DescriptionInput
                    defaultDescription={action?.fields?.description}
                    condition={action?.fieldErrors?.description}
                />
                <FormAlert
                    condition={action?.formError}
                    variant="error"
                />
                <button
                    className="btn btn-primary"
                    type="submit">
                    Create Tag
                </button>
                <Link
                    to={`/admin/items/${params.inventoryId}`}
                    className="btn btn-error btn-outline">
                    Cancel
                </Link>
            </Form>
        </div>
    );
}
