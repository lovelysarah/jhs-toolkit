import { json } from "@remix-run/node";
import {
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
    useRevalidator,
} from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

import clsx from "clsx";
import invariant from "tiny-invariant";
import Modal from "react-modal";

import { checkout } from "~/api/inventory";
import { getInfoFromUserById, getUserInfoById } from "~/api/user";
import type { AdjustedItem } from "~/utils/cart";
import {
    countItemsInCart,
    calculateInventoryAndCartQuantities,
} from "~/utils/cart";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId } from "~/utils/session.server";

import { FormAlert } from "~/components/FormAlert";

import type { FieldErrors, FormActionData } from "~/types/form";
import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { getCollectionOfItems } from "~/api/item";
import { Backpack } from "lucide-react";
import type { ShedTransaction } from "@prisma/client";

const TRANSACTION_NOTE_MAX_LENGTH = 200;

type CheckinFields = {
    displayName?: string;
    note?: string;
};

type CheckinFieldErrors = FieldErrors<CheckinFields>;
type CheckinActionData = FormActionData<CheckinFieldErrors, CheckinFields>;

Modal.setAppElement("#root");

type LoaderData = {
    itemHistory: ShedTransaction[];
    user: Awaited<ReturnType<typeof getUserInfoById>>;
    userItems: Awaited<ReturnType<typeof getCollectionOfItems>>;
    items: AdjustedItem[];
    cart: string[];
    cartCount: number;
    counts: Record<string, number>;
};

export const loader = async ({ request }: LoaderArgs) => {
    const data = {} as LoaderData;
    const userId = await getUserId(request);

    // Get the query parameters
    const url = new URL(request.url);
    const query = url.searchParams;

    // Get details about the transaction
    const historyRequest = query.get("history");

    if (historyRequest) {
        console.log(historyRequest);
    }

    invariant(userId, "Was expecting userId");

    const { shed_checked_out, shed_cart } = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { shed_checked_out: true, shed_cart: true },
    });

    const adjustment = await calculateInventoryAndCartQuantities(shed_cart);
    const itemCounts = countItemsInCart(shed_checked_out);
    const itemDetails = await getCollectionOfItems(shed_checked_out);

    data.cart = adjustment.cart;
    data.cartCount = adjustment.cart.length;
    data.user = await getUserInfoById(userId);
    data.items = adjustment.stock;
    data.counts = itemCounts;
    data.userItems = itemDetails;

    return json(data);
};

export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);

    invariant(userId, "Could not check out cart");

    const user = await getInfoFromUserById(userId, {
        select: { account_type: true, id: true, name: true },
    });

    const form = await request.formData();
    const cart = form.get("cart");
    const note = form.get("note") || "";
    const displayName = form.get("display-name") || "";
    const hasNote = form.get("has-note") === "true";

    console.log({ cart, note, displayName, hasNote });

    if (
        typeof cart !== "string" ||
        typeof note !== "string" ||
        typeof displayName !== "string"
    ) {
        return badRequest<CheckinActionData>({
            formError: "Invalid Request",
            fieldErrors: null,
            fields: null,
        });
    }

    const fields: CheckinFields = { note, displayName };

    const validateDisplayName = (displayName: string) => {
        if (user.account_type === "GUEST" && !displayName)
            return "Display name is required";
    };
    const validateNote = (note: string) => {
        if (hasNote && note.length < 10)
            return "Note should be at least 10 characters";
        if (note.length > TRANSACTION_NOTE_MAX_LENGTH)
            return `Note should not exceed ${TRANSACTION_NOTE_MAX_LENGTH} characters`;
    };

    const fieldErrors: CheckinFieldErrors = {
        displayName: validateDisplayName(displayName),
        note: validateNote(note),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<CheckinActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    console.log("VALID!@");

    const checkoutResult = await checkout({
        cart: JSON.parse(cart),
        displayName,
        user,
        note,
    });

    if (checkoutResult.type === "CHECKOUT_FAILURE") {
        console.log(checkoutResult);
        return badRequest<CheckinActionData>({
            formError: checkoutResult.message,
            fields,
            fieldErrors,
        });
    }
    console.log(checkoutResult);

    return json(checkoutResult);
};

export default function ShedCheckOutRoute() {
    const { itemHistory, counts, user, cartCount, cart, userItems } =
        useLoaderData<typeof loader>();

    const action = useActionData<CheckinActionData>();

    const revalidator = useRevalidator();
    const navigation = useNavigation();

    const noteFieldRef = useRef<HTMLTextAreaElement>(null);

    const [displayName, setDisplayName] = useState<string | undefined>("");

    const [showNoteField, setShowNoteField] = useState(false);
    const [note, setNote] = useState("");

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

    invariant(user, "Check out information not found");

    console.log({ userItems });
    // Focuses the note field when it is shown and puts the cursor at the end
    useEffect(() => {
        if (!showNoteField || !noteFieldRef.current) return;
        const noteField = noteFieldRef.current;
        const end = noteField.value.length;
        noteField.setSelectionRange(end, end);
        noteField.focus();
    }, [showNoteField, noteFieldRef.current]);

    const submitting = navigation.state === "submitting";

    return (
        <section className="flex flex-col-reverse md:flex-row gap-12 items-start">
            <div className="w-full md:basis-1/2">
                <h2
                    className={clsx(
                        "theme-text-h3 mb-8 flex gap-2 items-center"
                    )}>
                    <Backpack size={36} />
                    Your bag
                </h2>
                {userItems.length < 1 ? (
                    <h3 className="theme-text-h4 rounded-lg w-full">
                        No items in cart,{" "}
                        <Link
                            to="/shed/summary"
                            className="link text-primary">
                            click here to add some
                        </Link>
                        .
                    </h3>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {userItems.map((item) => {
                            console.log({ item });
                            const count = counts[item.name];
                            return (
                                <li
                                    key={item.id}
                                    className="bg-base-200 flex flex-col py-2 px-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gap-2">
                                            <span className="theme-text-h4 py-2">
                                                {item.name}
                                            </span>
                                            <Link
                                                className="link link-primary"
                                                to={`/shed/activity/${item.id}`}>
                                                View activity
                                            </Link>
                                        </div>
                                        <span>Quantity: {count}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <aside className="w-full md:basis-1/2 sticky top-0 md:top-6">
                <div className="rounded-lg border-base-300 bg-base-200 p-8 border">
                    <h2 className="theme-text-h3">Information</h2>
                    <Form
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
                                    <span className="font-bold">
                                        {user.name}
                                    </span>
                                    , please provide a name
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
                        {showNoteField ? (
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
                                                action.fieldErrors.note =
                                                    undefined;
                                        }}></textarea>
                                </div>
                                <FormAlert
                                    variant="error"
                                    condition={action?.fieldErrors?.note}
                                />
                                <button
                                    className="btn btn-error"
                                    onClick={(e) => setShowNoteField(false)}>
                                    Cancel Note
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={(e) => {
                                    setShowNoteField(true);
                                }}>
                                Add a note
                            </button>
                        )}
                        <button
                            className={clsx("btn btn-primary", {
                                "btn-warning": submitting,
                                "btn-disabled": cartCount < 1,
                            })}>
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </Form>
                </div>
                {itemHistory?.length > 0 && (
                    <div className="rounded-lg border-base-100 bg-base-200 p-8 border md:mt-2">
                        <h2 className="theme-text-h3">Item log</h2>
                        <ul>
                            {itemHistory.map((tx) => {
                                return <li key={tx.id}>{tx.display_name}</li>;
                            })}
                        </ul>
                    </div>
                )}
            </aside>
        </section>
    );
}
