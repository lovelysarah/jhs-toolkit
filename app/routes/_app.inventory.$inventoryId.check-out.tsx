import { json } from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useNavigation,
    useParams,
    useRevalidator,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";
import invariant from "tiny-invariant";

import { getInfoFromUserById, getUserInfoById } from "~/data/user";
import {
    calculateInventoryAndCartQuantities,
    isProcessedStockWithCart,
} from "~/utils/cart";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId } from "~/utils/session.server";

import { FormAlert } from "~/components/FormAlert";

import { AlertTriangle, Clock, Info } from "lucide-react";
import { checkout } from "~/data/inventory";
import {
    validateDisplayName,
    validateNote,
} from "~/helper/TransactionFormValidators";

import type { TxActionData, TxFieldErrors, TxFields } from "~/types/form";
import type {
    ActionFunction,
    LoaderArgs,
    TypedResponse,
} from "@remix-run/node";
import { CREATE_TX_STATUS } from "~/types/inventory";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";

const TRANSACTION_NOTE_MAX_LENGTH = 200;

// TODO: Clean this up

export const loader = async ({ request, params }: LoaderArgs) => {
    const userId = await getUserId(request);
    const inventoryId = params.inventoryId;

    invariant(userId, "Was expecting userId");
    invariant(inventoryId, "Was expecting inventoryId");

    const inventory = await db.inventoryLocation.findFirst({
        where: {
            short_id: inventoryId,
        },
        select: { deleted_at: true },
    });

    if (inventory && inventory.deleted_at)
        throw new Response(
            `This inventory was archived on ${inventory.deleted_at.toLocaleDateString()}.`,
            { status: 401 }
        );

    const inventoryData = await calculateInventoryAndCartQuantities(
        inventoryId,
        userId
    );

    const data = {
        user: await getUserInfoById(userId),
        cart: isProcessedStockWithCart(inventoryData)
            ? inventoryData.cart
            : null,
    };

    return json(data);
};

export const action: ActionFunction = async ({
    request,
    params,
}): Promise<TypedResponse<TxActionData>> => {
    const userId = await getUserId(request);
    const inventoryId = params.inventoryId;

    invariant(inventoryId, "Was expecting inventoryId");
    invariant(userId, "Was expecting userId");

    const user = await getInfoFromUserById(userId, {
        select: { account_type: true, id: true, name: true },
    });

    const inventory = await db.inventoryLocation.findUniqueOrThrow({
        where: { short_id: inventoryId },
        select: { id: true, name: true, deleted_at: true },
    });

    if (inventory.deleted_at)
        return badRequest<TxActionData>({
            type: CREATE_TX_STATUS.FAILURE,
            formError: "This inventory was archived.",
            fieldErrors: null,
            fields: null,
            message: "This inventory was archived.",
        });

    const form = await request.formData();

    const cartId = form.get("cart-id");
    const temporaryItemsString = form.get("temporary-items");
    const permanentItemsString = form.get("permanent-items");
    const note = form.get("note") || "";
    const displayName = form.get("display-name") || "";
    const itemCount = Number(form.get("item-count"));
    const hasNote = form.get("has-note") === "true";

    if (
        typeof cartId !== "string" ||
        typeof permanentItemsString !== "string" ||
        typeof temporaryItemsString !== "string" ||
        typeof note !== "string" ||
        typeof displayName !== "string" ||
        typeof itemCount !== "number"
    ) {
        return badRequest<TxActionData>({
            formError: "Invalid Request",
            fieldErrors: null,
            fields: null,
            type: CREATE_TX_STATUS.FAILURE,
            message: "Invalid Request",
        });
    }

    const temporaryItems = JSON.parse(temporaryItemsString);
    const permanentItems = JSON.parse(permanentItemsString);

    console.log({ permanentItems, temporaryItems, note, displayName, hasNote });

    const fields: TxFields = { note, displayName };

    const fieldErrors: TxFieldErrors = {
        displayName: validateDisplayName(displayName, user.account_type),
        note: validateNote(note, hasNote),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<TxActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
            type: CREATE_TX_STATUS.FAILURE,
            message: "Some fields are invalid",
        });
    }

    console.log("VALID!@");

    const checkoutResult = await checkout({
        cart: {
            id: cartId,
            itemCount,
            temporaryItems,
            permanentItems,
        },
        inventory,
        displayName,
        user,
        note,
    });

    if (checkoutResult.type === CREATE_TX_STATUS.FAILURE) {
        console.log(checkoutResult);
        return badRequest<TxActionData>({
            formError: checkoutResult.message,
            fields,
            fieldErrors,
            type: checkoutResult.type,
            message: checkoutResult.message,
        });
    }

    return json({
        ...checkoutResult,
        formError: null,
        fieldErrors: null,
        fields: null,
    });
};

export default function InventoryCheckoutRoute() {
    const { cart, user } = useLoaderData<typeof loader>();

    invariant(user, "Check out information not found");

    const sortedItems = useMemo(() => {
        if (!cart) return null;

        return {
            noteFirst: cart.items.sort((a, b) => (a.item.note ? -1 : 1)),
            permanentItems: cart.items.filter(
                (item) => item.checkout_type === "PERMANENT"
            ),
            temporaryItems: cart.items.filter(
                (item) => item.checkout_type === "TEMPORARY"
            ),
        };
    }, [cart]);

    const action = useActionData<TxActionData>();

    const revalidator = useRevalidator();
    const navigation = useNavigation();
    const params = useParams();
    const submit = useSubmit();

    const isSubmitting = navigation.state === "submitting";
    const isIdle = navigation.state === "idle";

    const noteFieldRef = useRef<HTMLTextAreaElement>(null);

    const [displayName, setDisplayName] = useState<string | undefined>("");

    const [showNoteField, setShowNoteField] = useState(false);

    const [note, setNote] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData();

        // To String? I'm not sure why this is needed
        if (cart) formData.append("cart-id", cart.id.toString());

        formData.append("has-note", showNoteField.toString());
        formData.append("display-name", displayName || "");
        formData.append("note", note || "");
        formData.append(
            "permanent-items",
            JSON.stringify(sortedItems?.permanentItems || [])
        );
        formData.append(
            "temporary-items",
            JSON.stringify(sortedItems?.temporaryItems || [])
        );

        try {
            submit(formData, {
                method: "POST",
            });
        } catch (err) {
            const error = err as Error;

            console.log(error.message);
        }
    };

    useEffect(() => {
        // Updates the updatedTime and reloads the data
        const revalidate = () => {
            revalidator.revalidate();
        };

        // When the window is focused, revalidate and restart interval
        const onFocus = () => {
            revalidate();
        };

        window.addEventListener("focus", onFocus);

        return () => {
            // Cleanup
            window.removeEventListener("focus", onFocus);
        };
    }, []);
    useEffect(() => {
        console.log({ action });
        if (action?.type === CREATE_TX_STATUS.SUCCESS) {
            setShowNoteField(false);
            setNote("");
        }
    }, [action]);

    console.log({ action });
    // Focuses the note field when it is shown and puts the cursor at the end
    useEffect(() => {
        if (!showNoteField || !noteFieldRef.current) return;
        const noteField = noteFieldRef.current;
        const end = noteField.value.length;
        noteField.setSelectionRange(end, end);
        noteField.focus();
    }, [showNoteField, noteFieldRef.current]);

    return (
        <section className="flex flex-col-reverse md:flex-row gap-12 items-start py-8">
            <div className="w-full md:basis-3/5">
                <h2 className={clsx("theme-text-h3 mb-8")}>
                    {action?.type === CREATE_TX_STATUS.SUCCESS && isIdle
                        ? `${action.message}`
                        : "Cart"}
                </h2>
                {!sortedItems ? (
                    action?.type === CREATE_TX_STATUS.SUCCESS ? (
                        <>
                            <ul className="flex flex-col gap-2">
                                {action.data.transactions.map((tx) => {
                                    return (
                                        <FormAlert
                                            key={tx.id}
                                            variant="success"
                                            condition={`Created ${tx.id} at ${tx.created_at}`}
                                        />
                                    );
                                })}
                            </ul>
                        </>
                    ) : (
                        <div className="alert alert-warning">
                            <div>
                                <AlertTriangle />
                                <span>
                                    No items in cart,{" "}
                                    <Link
                                        to={`/inventory/${params.inventoryId}/summary`}
                                        className="link">
                                        click here to add some.
                                    </Link>
                                </span>
                            </div>
                        </div>
                    )
                ) : (
                    <ul className="flex flex-col gap-4">
                        {sortedItems.noteFirst.map((cartItem) => {
                            const classes =
                                "bg-base-200 flex flex-col py-2 px-4 rounded-lg";
                            return (
                                <li
                                    key={`${cartItem.item.id}-${cartItem.checkout_type}`}
                                    className={classes}>
                                    <div className="flex justify-between items-center">
                                        <span className="theme-text-h4 py-2 flex gap-2 items-center">
                                            {cartItem.item.name}
                                        </span>
                                        <span>
                                            Quantity: {cartItem.quantity}
                                        </span>
                                    </div>
                                    {cartItem.checkout_type === "TEMPORARY" && (
                                        <p className="text-primary theme-text-p flex gap-2 items-center">
                                            <Clock />
                                            Temporary
                                        </p>
                                    )}
                                    {cartItem.item.note && (
                                        <p className="theme-text-p flex gap-2 items-center">
                                            <Info className="shrink-0" />
                                            <span className="opacity-60">
                                                {cartItem.item.note}
                                            </span>
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <aside className="w-full md:basis-2/5 sticky top-0 md:top-6 p-8 bg-base-100">
                <h2 className="theme-text-h3">Information</h2>
                <Form
                    onSubmit={handleSubmit}
                    method="POST"
                    className="flex flex-col gap-2">
                    <FormAlert
                        variant="warning"
                        condition={action?.formError}
                    />
                    <input
                        name="cart"
                        type="hidden"
                        value={JSON.stringify(cart)}></input>
                    <input
                        name="has-note"
                        type="hidden"
                        value={String(showNoteField)}
                    />
                    {user.account_type === "GUEST" ? (
                        <>
                            <span>
                                You are signed in as{" "}
                                <span className="font-bold">{user.name}</span>,
                                please provide a name
                            </span>
                            <input
                                className="input input-bordered"
                                name="display-name"
                                onChange={(e) => {
                                    setDisplayName(e.target.value);
                                    if (action?.fieldErrors?.displayName)
                                        action.fieldErrors.displayName =
                                            undefined;
                                }}
                                value={displayName}
                                placeholder="Enter your name or group name"
                            />
                            <FormAlert
                                variant="error"
                                condition={action?.fieldErrors?.displayName}
                            />
                        </>
                    ) : (
                        <span className="theme-text-p">
                            Check out as{" "}
                            <span className="font-bold">{user.name}</span>
                        </span>
                    )}
                    {showNoteField && (
                        <>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Transaction Note
                                    </span>
                                    <span className="label-text-alt">
                                        {note.length}/
                                        {TRANSACTION_NOTE_MAX_LENGTH}
                                    </span>
                                </label>
                                <textarea
                                    ref={noteFieldRef}
                                    className="textarea textarea-primary"
                                    placeholder="Add a note.."
                                    name="note"
                                    // maxLength={TRANSACTION_NOTE_MAX_LENGTH}
                                    value={note}
                                    onChange={(e) => {
                                        if (
                                            e.target.value.length <=
                                            TRANSACTION_NOTE_MAX_LENGTH
                                        )
                                            setNote(e.target.value);

                                        if (action?.fieldErrors?.note)
                                            action.fieldErrors.note = undefined;
                                    }}></textarea>
                            </div>
                            <FormAlert
                                variant="error"
                                condition={action?.fieldErrors?.note}
                            />
                        </>
                    )}
                    <button
                        className={clsx("btn", {
                            "btn-ghost": !showNoteField,
                            "btn-error": showNoteField,
                            "btn-disabled":
                                !isIdle || !cart || cart.items.length === 0,
                        })}
                        type="button"
                        onClick={(e) => {
                            setShowNoteField((prev) => !prev);
                        }}>
                        {!isIdle
                            ? isSubmitting
                                ? "Attaching note..."
                                : "Loading..."
                            : !showNoteField
                            ? "Add a note"
                            : "Cancel"}
                    </button>
                    <button
                        // disabled={!shouldRevalidate}
                        className={clsx("btn btn-primary", {
                            "btn-disabled":
                                !isIdle || !cart || cart.items.length === 0,
                        })}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                </Form>
            </aside>
        </section>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "Couldn't load the check out component";

    return <UnknownErrorMessage message={errorMessage} />;
}
