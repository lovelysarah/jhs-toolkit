import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
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
import {
    validateDescription,
    validateName,
    validateNote,
    validateQuantity,
    validateTag,
} from "~/helper/ItemFormValidators";
import type {
    ItemActionData,
    ItemFieldErrors,
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
            where: {
                AND: [
                    { id: params.itemId },
                    { location: { short_id: inventoryId } },
                ],
            },
            include: { tag: true },
        }),
        tags: await db.tag.findMany({
            where: { inventory: { short_id: inventoryId } },
            orderBy: { name: "asc" },
        }),
    };

    return json(data);
};

const inputClasses = (state: "idle" | "loading" | "submitting") =>
    clsx("input input-bordered", {
        "input-disabled animate-pulse": state !== "idle",
    });

export const action: ActionFunction = async ({ request, params }) => {
    console.log(params);

    const inventoryId = params.locationId;
    invariant(inventoryId, "Expected inventory ID!");
    invariant(params.itemId, "Expected tag ID!");

    const location = await db.inventoryLocation.findFirst({
        where: { short_id: params.locationId },
    });

    const itemCurrent = await db.item.findFirst({
        where: {
            AND: [
                { id: params.itemId },
                { location: { short_id: inventoryId } },
            ],
        },
        include: { tag: true },
    });

    if (!location || !itemCurrent) {
        throw new Error("Something went wrong, not found");
    }

    const form = await request.formData();
    const name = form.get("name") || itemCurrent.name;
    const description = form.get("description");
    const note = form.get("note");
    const quantity = Number(form.get("quantity")) || 0;
    const tag = form.get("tag") || itemCurrent.tag.id;

    console.log({ name, description, note, quantity, tag });

    if (
        typeof name !== "string" ||
        typeof description !== "string" ||
        typeof note !== "string" ||
        typeof quantity !== "number" ||
        typeof tag !== "string"
    ) {
        return badRequest<ModifyLocationActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Invalid form data",
        });
    }

    const fields = { name, description, note, quantity, tag };

    const fieldErrors: ItemFieldErrors = {
        name: validateName(name),
        description: validateDescription(description),
        note: validateNote(note),
        quantity: validateQuantity(quantity),
        tag: await validateTag(tag, inventoryId),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<ItemActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    console.log("VALID");

    console.log({ quantity });
    try {
        await db.item.update({
            where: {
                id: params.itemId,
            },
            data: {
                name,
                description,
                note,
                quantity,
                tag: { connect: { id: tag } },
            },
        });

        return redirect(`/admin/items/${inventoryId}`, { status: 201 });
    } catch (err) {
        console.log(err);
        return badRequest<ItemActionData>({
            formError: "Server error",
            fieldErrors,
            fields,
        });
    }
};
type NameInputProps = {
    defaultName: string | undefined;
    condition: string | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};
const NameInput = ({
    defaultName,
    condition,
    onChange,
}: NameInputProps): JSX.Element => {
    const { state } = useNavigation();
    return (
        <>
            <input
                name="name"
                defaultValue={defaultName}
                onChange={onChange}
                type="text"
                className={inputClasses(state)}
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
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};
const DescriptionInput = ({
    onChange,
    defaultDescription,
    condition,
}: DescriptionInputProps): JSX.Element => {
    const { state } = useNavigation();
    return (
        <>
            <input
                name="description"
                defaultValue={defaultDescription}
                type="text"
                onChange={onChange}
                className={inputClasses(state)}
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
    noteLength: number;
    defaultNote: string | undefined;
    condition: string | undefined;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};
const NoteInput = ({
    noteLength,
    defaultNote,
    condition,
    onChange,
}: NoteInputProps): JSX.Element => {
    const { state } = useNavigation();
    return (
        <>
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Add a note</span>
                    <span className="label-text-alt">
                        {noteLength}/{ITEM_NOTE_MAX_LENGTH}
                    </span>
                </label>
                <textarea
                    disabled={state !== "idle"}
                    className="textarea textarea-primary"
                    placeholder="Add a note.."
                    name="note"
                    value={defaultNote}
                    onChange={onChange}></textarea>
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
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    condition: string | undefined;
};
const QuantityInput = ({
    defaultQuantity,
    onChange,
    condition,
}: QuantityInputProps): JSX.Element => {
    const { state } = useNavigation();
    return (
        <>
            <input
                onChange={onChange}
                name="quantity"
                defaultValue={defaultQuantity}
                type="number"
                className={inputClasses(state)}
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

    if (!item) throw new Error("Item not found");

    const [formSubmitted, setFormSubmitted] = useState(false);

    // Has the form been modified
    const [modified, setModified] = useState(false);

    // Basic info
    const [name, setName] = useState(item.name);
    const [description, setDescription] = useState(item.description || "");
    const [note, setNote] = useState(item.note || "");
    const [quantity, setQuantity] = useState(item.quantity || 0);
    const [tag, setTag] = useState(item.tag.id);

    const [clientFormError, setClientFormError] = useState("");

    // Modal reference
    const confirmDelete = useRef<HTMLDialogElement>(null);
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Reset client form error
        setClientFormError("");
        setFormSubmitted(false);

        // Client side validation

        // Create form data
        const formData = new FormData();

        formData.append("name", name);
        formData.append("description", description);
        formData.append("note", note);
        formData.append("quantity", quantity.toString());
        formData.append("tag", tag);

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
        console.log("MODIFIED RAN");
        if (
            name !== item.name ||
            description !== item.description ||
            note !== item.note ||
            quantity !== item.quantity ||
            tag !== item.tag.id
        ) {
            setModified(true);
        } else {
            setModified(false);
        }

        if (!firstUpdate) return;

        setFormSubmitted(false);
    }, [name, description, note, quantity, tag]);

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
        setNote(action?.fields?.note || item.note || "");
        setQuantity(action?.fields?.quantity || item.quantity || 0);
        setTag(action?.fields?.tag || item.tag.id);
    }, [item]);

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
                {state === "idle" && (
                    <Form
                        method="DELETE"
                        action={`/admin/items/${params.locationId}/delete-item`}>
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
                onSubmit={handleSubmit}
                method="POST">
                <span className="theme-text-h4">Item Infomation</span>
                {formSubmitted && isIdle && !action?.fieldErrors && (
                    <FormAlert
                        condition={"Item updated successfully!"}
                        variant="success"
                    />
                )}
                <NameInput
                    onChange={(e) => setName(e.target.value)}
                    defaultName={name || action?.fields?.name}
                    condition={action?.fieldErrors?.name}
                />{" "}
                <DescriptionInput
                    onChange={(e) => {
                        setDescription(e.target.value);
                    }}
                    defaultDescription={
                        description || action?.fields?.description
                    }
                    condition={action?.fieldErrors?.description}
                />
                <NoteInput
                    defaultNote={note || action?.fields?.note}
                    noteLength={note.length}
                    condition={action?.fields?.note}
                    onChange={(e) => {
                        if (e.target.value.length <= ITEM_NOTE_MAX_LENGTH)
                            setNote(e.target.value);

                        if (action?.fieldErrors?.note)
                            action.fieldErrors.note = undefined;
                    }}
                />
                <span className="theme-text-h4">How many..? </span>
                <QuantityInput
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    defaultQuantity={quantity || action?.fields?.quantity}
                    condition={action?.fieldErrors?.quantity}
                />
                <select
                    disabled={state !== "idle"}
                    name="tag"
                    onChange={(e) => setTag(e.target.value)}
                    defaultValue={action?.fields?.tag || tag || "DEFAULT"}
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
                {isIdle && modified && (
                    <button
                        className="btn btn-primary"
                        disabled={state !== "idle"}
                        type="submit">
                        {state !== "idle" ? "Modifying..." : "Modify Item"}
                    </button>
                )}
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
