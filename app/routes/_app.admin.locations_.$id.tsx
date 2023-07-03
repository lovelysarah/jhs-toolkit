import { ACCOUNT_TYPE } from "@prisma/client";
import {
    ActionFunction,
    LoaderArgs,
    LoaderFunction,
    json,
} from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useNavigation,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import clsx from "clsx";
import { AlertTriangle, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { UserInfo, getUserInfoById, modifyUser } from "~/data/user";
import { FormAlert } from "~/components/FormAlert";
import { validateUserUpdateForm } from "~/helper/UserFormValidator";
import {
    ModifyLocationActionData,
    CreateUserActionData,
    FORM_VALIDATION_RESULT_TYPE,
    ModifyLocationFieldErrors,
} from "~/types/form";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

export const loader = async ({ request, params }: LoaderArgs) => {
    invariant(params.id, "Something went wrong!");

    let location;
    try {
        location = await db.inventoryLocation.findFirst({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        items: true,
                        transactions: true,
                    },
                },
            },
        });
    } catch (err) {
        throw new Response("User not found", { status: 404 });
    }

    const data = {
        location,
    };

    return json(data);
};

export const action: ActionFunction = async ({ request, params }) => {
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

    console.log({ fields });
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
    console.log({ description });

    await db.inventoryLocation.update({
        where: { id: params.id },
        data: {
            name,
            description,
        },
    });

    return json({ success: true }, { status: 201 });
};

export default function AdminManageEditLocationRoute() {
    const { location } = useLoaderData<typeof loader>();
    const action = useActionData<ModifyLocationActionData>();
    const { state } = useNavigation();

    if (!location) {
        throw new Error("User not found");
    }

    const submit = useSubmit();

    const [formSubmitted, setFormSubmitted] = useState(false);

    // Has the form been modified
    const [modified, setModified] = useState(false);

    // Error from the client side validation
    const [clientFormError, setClientFormError] = useState("");

    // Basic info
    const [name, setName] = useState(location.name);
    const [description, setDescription] = useState(location.description || "");

    // Modal reference
    const confirmDelete = useRef<HTMLDialogElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Reset client form error
        setClientFormError("");
        setFormSubmitted(false);

        // Validata form data
        if (!name) return setClientFormError("Please fill in all the fields.");

        // Create form data
        const formData = new FormData();

        formData.append("name", name);
        formData.append("description", description);

        // Submit form data
        try {
            submit(formData, {
                method: "POST",
            });
            setFormSubmitted(true);
            setFirstUpdate(true);
            setModified(false);
        } catch (err) {
            const error = err as Error;
            setClientFormError(error.message);
            setFormSubmitted(false);
        }
    };

    // Check if the form has been modified
    useEffect(() => {
        if (name !== location.name || description !== location.description) {
            setModified(true);
        } else {
            setModified(false);
        }

        // This breaks success alert on password reset
        if (!firstUpdate) return;

        setFormSubmitted(false);
    }, [name, description]);

    const [firstUpdate, setFirstUpdate] = useState(false);

    // Reset the form if the user changes
    useEffect(() => {
        //Reset form

        if (!firstUpdate) {
            setFormSubmitted(false);
        }
        if (firstUpdate) setFirstUpdate(false);

        setName(action?.fields?.name || location.name);
        setDescription(
            action?.fields?.description || location.description || ""
        );
    }, [location]);

    const inputClasses = clsx("input input-bordered", {
        "input-disabled animate-pulse": state !== "idle",
    });

    const isLoading = state === "loading";
    const isSubmitting = state === "submitting";
    const isIdle = state === "idle";

    return (
        <div>
            <dialog
                id="confirm_delete_modal"
                className="modal"
                ref={confirmDelete}>
                <h2 className="theme-text-h1">TESINTG MODEL</h2>
            </dialog>
            <div className="flex justify-between">
                <h1
                    className={clsx("theme-text-h3 mb-2", {
                        "animate-pulse": isLoading,
                    })}>
                    {location.name}
                </h1>

                {/* // BROKEN */}
                {state !== "loading" && (
                    <Form
                        method="DELETE"
                        action="/admin/action/delete-location">
                        <input
                            type="hidden"
                            name="id"
                            value={location.id}
                        />
                        <button
                            onClick={() =>
                                confirmDelete.current &&
                                confirmDelete.current.showModal()
                            }
                            className="flex gap-2 btn btn-ghost text-error-content">
                            <Trash />
                            Delete
                        </button>
                    </Form>
                )}
            </div>
            <Form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2"
                method="POST">
                {clientFormError && (
                    <FormAlert
                        variant="warning"
                        condition={clientFormError}
                    />
                )}

                {formSubmitted && isIdle && !action?.fieldErrors && (
                    <FormAlert
                        condition={"Location updated successfully!"}
                        variant="success"
                    />
                )}

                <FormAlert
                    variant="error"
                    condition={action?.formError}
                />
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    type="text"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Name"
                />
                <FormAlert
                    variant="error"
                    condition={action?.fieldErrors?.name}
                />
                <input
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    type="text"
                    className={inputClasses}
                    disabled={isLoading || isSubmitting}
                    placeholder="Description"
                />
                <FormAlert
                    variant="error"
                    condition={action?.fieldErrors?.description}
                />
                {isIdle && (
                    <>
                        <button className="btn btn-ghost flex gap-2">
                            {location._count.items} Items
                        </button>
                        <button className="btn btn-ghost flex gap-2">
                            {location._count.transactions} Transactions
                        </button>
                    </>
                )}
                {isIdle && modified && (
                    <button
                        className={clsx("btn", {
                            "btn-primary": modified,
                        })}
                        type="submit">
                        {state !== "idle"
                            ? state === "loading"
                                ? "Loading..."
                                : "Submiting..."
                            : "Submit changes"}
                    </button>
                )}
                {isIdle && (
                    <Link
                        to="/admin/locations"
                        className="btn btn-error btn-outline text-error-content">
                        Close
                    </Link>
                )}
            </Form>
        </div>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    // when true, this is what used to go to `CatchBoundary`
    console.log(error);
    if (isRouteErrorResponse(error)) {
        return (
            <div className="p-8 bg-error text-error-content rounded-lg">
                <h1 className="theme-text-h3">Bad request!</h1>
                <p className="theme-text-h4 font-bold">
                    {error.status}{" "}
                    <span className="font-normal">{error.data}</span>
                </p>
            </div>
        );
    }

    // Don't forget to typecheck with your own logic.
    // Any value can be thrown, not just errors!
    let errorMessage = "Unknown error";
    // if (isDefinitelyAnError(error)) {
    // errorMessage = error.message;
    // }

    return (
        <div className="p-8 bg-error text-error-content">
            <h1 className="theme-text-h2">Uh oh ...</h1>
            <p>Something went wrong.</p>
            <pre>{errorMessage}</pre>
        </div>
    );
}
