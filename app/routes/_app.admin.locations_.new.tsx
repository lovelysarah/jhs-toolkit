import { ActionFunction, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import {
    CreateUserActionData,
    ModifyLocationActionData,
    ModifyLocationFieldErrors,
} from "~/types/form";
import { FormAlert } from "~/components/FormAlert";
import { createUser } from "~/data/user";
import { validateUserCreationForm } from "~/helper/UserFormValidator";
import { useEffect, useState } from "react";
import { badRequest } from "~/utils/request.server";
import { db } from "~/utils/db.server";

import { nanoid } from "nanoid";

export const action: ActionFunction = async ({ request }) => {
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
        await db.inventoryLocation.create({
            data: {
                name,
                description,
                display_name: name,
                short_id: nanoid(10),
            },
        });

        return redirect("/admin/locations");
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

    return (
        <div>
            <h1 className="theme-text-h3 mb-2">Create a new location</h1>
            <Form
                className="flex flex-col gap-2"
                method="POST">
                <span className="theme-text-h4">Enter information</span>
                <NameInput
                    defaultName={action?.fields?.name}
                    condition={action?.fieldErrors?.name}
                />{" "}
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
                    Create location
                </button>
                <Link
                    to="/admin/locations"
                    className="btn btn-error btn-outline">
                    Cancel
                </Link>
            </Form>
        </div>
    );
}
