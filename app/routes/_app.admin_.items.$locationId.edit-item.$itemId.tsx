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
import { Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { FormAlert } from "~/components/FormAlert";
import { ITEM_NOTE_MAX_LENGTH } from "~/constant";
import type {
    ItemActionData,
    ModifyLocationActionData,
    ModifyLocationFieldErrors,
} from "~/types/form";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";

export const loader = async ({ request, params }: LoaderArgs) => {
    invariant(params.locationId, "Something went wrong!");
    invariant(params.itemId, "Something went wrong!");

    const inventoryId = params.locationId;

    const data = {
        item: await db.item.findFirstOrThrow({
            where: { id: params.itemdId },
        }),
        tags: await db.tag.findMany({
            where: { inventory: { short_id: inventoryId } },
            orderBy: { name: "asc" },
        }),
    };

    return json(data);
};

export const action: ActionFunction = async ({ request, params }) => {
    console.log(params);
    invariant(params.locationId, "Expected location ID!");
    invariant(params.itemId, "Expected tag ID!");

    const location = await db.inventoryLocation.findFirst({
        where: { short_id: params.locationId },
    });

    const tag = await db.item.findFirst({
        where: { id: params.itemId },
    });

    if (!location || !tag) {
        throw new Error("Something went wrong, not found");
    }

    const form = await request.formData();
    const name = form.get("name") || tag.name;
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

    await db.tag.update({
        where: { id: params.tagId },
        data: {
            name,
            description,
        },
    });

    return json({ success: true }, { status: 201 });
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

type NoteInputProps = {
    defaultNote: string | undefined;
    condition: string | undefined;
    error: string | undefined;
};
const NoteInput = ({
    defaultNote,
    condition,
    error,
}: NoteInputProps): JSX.Element => {
    const [note, setNote] = useState("");
    const noteFieldRef = useRef<HTMLTextAreaElement>(null);

    // Focuses the note field when it is shown and puts the cursor at the end
    return (
        <>
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Add a note</span>
                    <span className="label-text-alt">
                        {note.length}/{ITEM_NOTE_MAX_LENGTH}
                    </span>
                </label>
                <textarea
                    ref={noteFieldRef}
                    className="textarea textarea-primary"
                    placeholder="Add a note.."
                    name="note"
                    value={note}
                    onChange={(e) => {
                        if (e.target.value.length <= ITEM_NOTE_MAX_LENGTH)
                            setNote(e.target.value);

                        if (error) error = undefined;
                    }}></textarea>
            </div>
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};
type QuantityInputProps = {
    defaultQuantity: number | undefined;
    condition: string | undefined;
};
const QuantityInput = ({
    defaultQuantity,
    condition,
}: QuantityInputProps): JSX.Element => {
    return (
        <>
            <input
                name="quantity"
                defaultValue={defaultQuantity}
                type="number"
                className="input input-bordered"
                placeholder="Quantity"
            />
            <FormAlert
                condition={condition}
                variant="warning"
            />
        </>
    );
};

export default function AdminManageEditLocationRoute() {
    const { item, tags } = useLoaderData<typeof loader>();
    const action = useActionData<ItemActionData>();
    const { state } = useNavigation();
    const params = useParams();

    const submit = useSubmit();

    const [formSubmitted, setFormSubmitted] = useState(false);

    // Has the form been modified
    const [modified, setModified] = useState(false);

    // Error from the client side validation
    const [clientFormError, setClientFormError] = useState("");

    // Basic info
    const [name, setName] = useState(item.name);
    const [description, setDescription] = useState(item.description || "");

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
        if (name !== item.name || description !== item.description) {
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

        setName(action?.fields?.name || item.name);
        setDescription(action?.fields?.description || item.description || "");
    }, [item]);

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
                    {item.name}
                </h1>

                {/* // BROKEN */}
                {state !== "loading" && (
                    <Form
                        method="DELETE"
                        action="/admin/action/delete-location">
                        <input
                            type="hidden"
                            name="id"
                            value={item.id}
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
                className="flex flex-col gap-2"
                method="POST">
                <span className="theme-text-h4">Item Infomation</span>
                <NameInput
                    defaultName={action?.fields?.name}
                    condition={action?.fieldErrors?.name}
                />{" "}
                <DescriptionInput
                    defaultDescription={action?.fields?.description}
                    condition={action?.fieldErrors?.description}
                />
                <NoteInput
                    defaultNote={action?.fields?.note}
                    condition={action?.fields?.note}
                    error={action?.fieldErrors?.note}
                />
                <span className="theme-text-h4">How many..? </span>
                <QuantityInput
                    defaultQuantity={action?.fields?.quantity}
                    condition={action?.fieldErrors?.quantity}
                />
                <select
                    name="tag"
                    defaultValue={action?.fields?.tag || "DEFAULT"}
                    className="select select-primary w-full">
                    <option
                        disabled
                        value="DEFAULT">
                        Select tag
                    </option>
                    {tags.map((tag) => (
                        <option
                            key={tag.id}
                            value={tag.id}>
                            {tag.name}
                        </option>
                    ))}
                </select>
                <FormAlert
                    condition={action?.fieldErrors?.tag}
                    variant="warning"
                />
                <FormAlert
                    condition={action?.formError}
                    variant="error"
                />
                <button
                    className="btn btn-primary"
                    type="submit">
                    Create item
                </button>
                <Link
                    to={`/admin/items/${params.locationId}`}
                    className="btn btn-error btn-outline">
                    Cancel
                </Link>
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
