import { json, redirect } from "@remix-run/node";
import {
    Form,
    Link,
    useActionData,
    useLoaderData,
    useParams,
} from "@remix-run/react";
import { FormAlert } from "~/components/FormAlert";
import { badRequest } from "~/utils/request.server";

import { nanoid } from "nanoid";

import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import type {
    ItemActionData,
    ItemFieldErrors,
    ModifyLocationActionData,
} from "~/types/form";
import { Package } from "lucide-react";
import { db } from "~/utils/db.server";
import { requireUser } from "~/utils/session.server";
import { ITEM_NOTE_MAX_LENGTH } from "~/constant";
import { useState } from "react";
import invariant from "tiny-invariant";
import {
    validateDescription,
    validateName,
    validateNote,
    validateQuantity,
    validateTag,
} from "~/helper/ItemFormValidators";

export const loader = async ({ request, params }: LoaderArgs) => {
    const inventoryId = params.inventoryId;
    const data = {
        tags: await db.tag.findMany({
            where: { inventory: { short_id: inventoryId } },
            orderBy: { name: "asc" },
        }),
    };

    return json(data);
};

export const action: ActionFunction = async ({ request, params }) => {
    const inventoryId = params.inventoryId;
    const userId = await requireUser(request);

    invariant(inventoryId, "Expected inventoryId to be defined");
    invariant(userId, "Expected userId to be defined");

    // Get the form data
    const form = await request.formData();
    const name = form.get("name");
    const description = form.get("description") || "";
    const note = form.get("note") || "";
    const quantity = Number(form.get("quantity")) || 0;
    const tag = form.get("tag") || "";

    console.log({ name, description, note, quantity, tag });
    if (
        typeof name !== "string" ||
        typeof description !== "string" ||
        typeof note !== "string" ||
        typeof quantity !== "number" ||
        typeof tag !== "string"
    ) {
        return badRequest<ItemActionData>({
            fieldErrors: null,
            fields: null,
            formError: "Invalid form data",
        });
    }

    const fields = { name, description };

    const fieldErrors: ItemFieldErrors = {
        name: validateName(name),
        description: validateDescription(description),
        note: validateNote(note),
        quantity: validateQuantity(quantity),
        tag: await validateTag(tag, inventoryId),
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

        await db.item.create({
            data: {
                short_id: nanoid(10),
                name,
                description,
                note,
                quantity,
                tag: { connect: { id: tag } },
                location: { connect: { short_id: inventoryId } },
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

export default function AdminCreateUserRoute() {
    const { tags } = useLoaderData<typeof loader>();
    const action = useActionData<ItemActionData>();
    const params = useParams();

    return (
        <div>
            <h1 className="theme-text-h3 mb-2 flex gap-2 items-center">
                <Package size={36} />
                Create a new item
            </h1>
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
                    to={`/admin/items/${params.inventoryId}`}
                    className="btn btn-error btn-outline">
                    Cancel
                </Link>
            </Form>
        </div>
    );
}
