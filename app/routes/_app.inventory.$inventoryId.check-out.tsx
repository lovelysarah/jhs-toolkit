import { json } from "@remix-run/node";
import {
    Form,
    Link,
    useActionData,
    useLoaderData,
    useNavigation,
    useRevalidator,
} from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";
import invariant from "tiny-invariant";
import Modal from "react-modal";

import { getInfoFromUserById, getUserInfoById } from "~/api/user";
import {
    countItemsInCart,
    calculateInventoryAndCartQuantities,
    isProcessedStockWithCart,
} from "~/utils/cart";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId } from "~/utils/session.server";

import { FormAlert } from "~/components/FormAlert";

import type { FieldErrors, FormActionData } from "~/types/form";
import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { Check, Clock, Clock1, DoorOpen, Info } from "lucide-react";

const TRANSACTION_NOTE_MAX_LENGTH = 200;

const customStyles = {
    content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        maxWidth: "500px",
        marginRight: "-50%",
        borderRadius: "10px",
        transform: "translate(-50%, -50%)",
    },
    overlay: {
        zIndex: 1000,
    },
};

type CheckoutFields = {
    displayName?: string;
    note?: string;
};

type CheckoutFieldErrors = FieldErrors<CheckoutFields>;
type CheckoutActionData = FormActionData<CheckoutFieldErrors, CheckoutFields>;

Modal.setAppElement("#root");

export const loader = async ({ request, params }: LoaderArgs) => {
    const userId = await getUserId(request);
    const inventoryId = params.inventoryId;

    invariant(userId, "Was expecting userId");
    invariant(inventoryId, "Was expecting inventoryId");

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

    if (
        typeof cart !== "string" ||
        typeof note !== "string" ||
        typeof displayName !== "string"
    ) {
        return badRequest<CheckoutActionData>({
            formError: "Invalid Request",
            fieldErrors: null,
            fields: null,
        });
    }

    const parsedCart = JSON.parse(cart);

    const fields: CheckoutFields = { note, displayName };

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

    const fieldErrors: CheckoutFieldErrors = {
        displayName: validateDisplayName(displayName),
        note: validateNote(note),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<CheckoutActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
        });
    }

    console.log("VALID!@");

    // const checkoutResult = await checkout({
    //     cart: JSON.parse(cart),
    //     displayName,
    //     user,
    //     note,
    // });

    // if (checkoutResult.type === "CHECKOUT_FAILURE") {
    //     console.log(checkoutResult);
    //     return badRequest<CheckoutActionData>({
    //         formError: checkoutResult.message,
    //         fields,
    //         fieldErrors,
    //     });
    // }
    // console.log(checkoutResult);

    return null;
};

export default function ShedCheckOutRoute() {
    const { cart, user } = useLoaderData<typeof loader>();

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

    const action = useActionData<CheckoutActionData>();

    const revalidator = useRevalidator();
    const navigation = useNavigation();

    const noteFieldRef = useRef<HTMLTextAreaElement>(null);

    const [displayName, setDisplayName] = useState<string | undefined>("");

    const [showNoteField, setShowNoteField] = useState(false);
    const [note, setNote] = useState("");

    const [modalIsOpen, setModalIsOpen] = useState(false);

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

    function openModal() {
        setModalIsOpen(true);
    }

    function closeModal() {
        setModalIsOpen(false);
    }

    invariant(user, "Check out information not found");

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
            <div className="w-full md:basis-4/6">
                <h2 className={clsx("theme-text-h3 mb-8")}>Cart</h2>
                {!sortedItems ? (
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
                    <>
                        <ul className="flex flex-col gap-4">
                            {sortedItems.noteFirst.map((cartItem) => {
                                const classes = clsx(
                                    "shadow-md flex flex-col py-2 px-4 rounded-lg",
                                    {
                                        "":
                                            cartItem.checkout_type ===
                                            "PERMANENT",
                                    }
                                );
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
                                        {cartItem.checkout_type ===
                                            "TEMPORARY" && (
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
                    </>
                )}
            </div>

            <aside className="w-full md:basis-2/6 sticky top-0 md:top-6 border p-8 rounded-lg border-base-300 bg-base-100">
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
                    {/* <button
                        type="button"
                        onClick={openModal}
                        className="btn btn-warning">
                        Open Modal
                    </button> */}
                    <Modal
                        preventScroll={true}
                        isOpen={modalIsOpen}
                        onRequestClose={closeModal}
                        style={customStyles}
                        contentLabel="Example Modal">
                        <div>
                            <h2 className="theme-text-h3 theme-text-gradient">
                                The quantities have changed!
                            </h2>
                            <p>
                                Lorem ipsum dolor sit amet consectetur
                                adipisicing elit. At, reiciendis neque doloribus
                                animi quae deleniti accusamus, quas dolores
                                consequuntur non corporis facilis minima
                                corrupti alias aspernatur vero, iure pariatur
                                distinctio.
                            </p>
                        </div>
                        <button onClick={closeModal}>close</button>
                        <div>I am a modal</div>
                    </Modal>
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
                                            action.fieldErrors.note = undefined;
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
                        // disabled={!shouldRevalidate}
                        className={clsx("btn btn-primary", {
                            "btn-warning": submitting,
                            "btn-disabled": !cart || cart.items.length === 0,
                        })}>
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </Form>
            </aside>
        </section>
    );
}
