import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useNavigation,
    useParams,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import clsx from "clsx";
import { Archive, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { FormAlert } from "~/components/FormAlert";
import { deleteTag, editTag } from "~/controller/tag";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { requireAdmin } from "~/utils/session.server";

import type { TagActionData } from "~/types/form";

export const loader = async ({ request, params }: LoaderArgs) => {
    invariant(params.inventoryId, "Something went wrong!");

    invariant(params.tagId, "Something went wrong!");

    const data = {
        tag: await db.tag.findFirstOrThrow({
            where: { id: params.tagId },
        }),
    };

    return json(data);
};

export const action: ActionFunction = async (args) => {
    await requireAdmin(args.request);

    switch (args.request.method) {
        case "POST":
            return await editTag(args);
        case "DELETE":
            return await deleteTag(args);
        default:
            return badRequest({
                formError: "Invalid request method",
            });
    }
};

export default function AdminManageEditLocationRoute() {
    const { tag } = useLoaderData<typeof loader>();
    const action = useActionData<TagActionData>();
    const { state } = useNavigation();
    const params = useParams();

    const submit = useSubmit();

    const [formSubmitted, setFormSubmitted] = useState(false);

    // Has the form been modified
    const [modified, setModified] = useState(false);

    // Error from the client side validation
    const [clientFormError, setClientFormError] = useState("");

    // Basic info
    const [name, setName] = useState(tag.name);
    const [description, setDescription] = useState(tag.description || "");

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
        if (name !== tag.name || description !== tag.description) {
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

        setName(action?.fields?.name || tag.name);
        setDescription(action?.fields?.description || tag.description || "");
    }, [tag]);

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
                    {tag.name}
                </h1>

                {state !== "loading" && (
                    <Form method="DELETE">
                        <input
                            type="hidden"
                            name="id"
                            value={tag.id}
                        />
                        <button className="flex gap-2 btn btn-ghost items-center text-error-content">
                            {state === "submitting" ? <Loader2 /> : <Archive />}
                            Archive
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
                        condition={"Tag updated successfully!"}
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
                        to={`/admin/items/${params.inventoryId}`}
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
