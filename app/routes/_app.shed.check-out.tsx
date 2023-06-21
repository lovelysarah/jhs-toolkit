import { json } from "@remix-run/node";
import {
    Form,
    Link,
    useLoaderData,
    useNavigation,
    useRevalidator,
} from "@remix-run/react";
import clsx from "clsx";
import invariant from "tiny-invariant";
import { CheckoutItems } from "~/api/inventory";
import { countItemsInCart, adjustForQuantities } from "~/utils/cart";
import { getUserId } from "~/utils/session.server";
import Modal from "react-modal";

import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { useEffect, useState } from "react";
import { getUserInfoById } from "~/api/user";
import { db } from "~/utils/db.server";

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

Modal.setAppElement("#root");

export const loader = async ({ request }: LoaderArgs) => {
    const userId = await getUserId(request);

    invariant(userId, "Was expecting userId");

    const { shed_cart } = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { shed_cart: true },
    });

    const adjustment = await adjustForQuantities(shed_cart);
    const itemCounts = countItemsInCart(adjustment.cart);

    const data = {
        user: await getUserInfoById(userId),
        shouldRevalidate: shed_cart !== adjustment.cart,
        cart: adjustment.cart,
        items: adjustment.stock,
        cartCount: adjustment.cart.length,
        counts: itemCounts,
    };

    return json(data);
};

export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);
    invariant(userId, "Could not check out cart");

    const form = await request.formData();
    const cart = form.get("cart");

    if (typeof cart !== "string") {
        return json({ success: false }, { status: 400 });
    }

    // const { shed_cart } = await db.user.findUniqueOrThrow({
    // where: { id: userId },
    // select: { shed_cart: true },
    // });

    await CheckoutItems(userId, JSON.parse(cart));

    return json({ success: true });
};

export default function ShedCheckOutRoute() {
    const { items, counts, user, cartCount, cart, shouldRevalidate } =
        useLoaderData<typeof loader>();

    const revalidator = useRevalidator();
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

    const [addingANote, setAddingANote] = useState(false);

    const navigation = useNavigation();

    const [modalIsOpen, setModalIsOpen] = useState(false);

    function openModal() {
        setModalIsOpen(true);
    }

    function closeModal() {
        setModalIsOpen(false);
    }

    invariant(user, "Check out information not found");

    const submitting = navigation.state === "submitting";

    return (
        <section className="flex flex-col-reverse md:flex-row gap-12 items-start">
            <div className="w-full md:basis-4/6">
                <h2 className={clsx("theme-text-h3 mb-8")}>Items</h2>
                {cartCount < 1 ? (
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
                        {items.map((item) => {
                            const count = counts[item.name];
                            return (
                                <li
                                    key={item.id}
                                    className="bg-info text-info-content shadow-md flex flex-col py-2 px-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="theme-text-h4 py-2">
                                            {item.name}
                                        </span>
                                        <span>Quantity: {count}</span>
                                    </div>
                                    <p className="theme-text-p">{item.note}</p>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <aside className="w-full md:basis-2/6 sticky top-0 md:top-6 border p-8 rounded-lg border-base-300 bg-base-100">
                <h2 className="theme-text-h3">Information</h2>
                <Form
                    method="POST"
                    className="flex flex-col gap-2">
                    <input
                        name="cart"
                        type="hidden"
                        value={JSON.stringify(cart)}></input>
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
                                placeholder="Enter your name or group name"></input>
                        </>
                    ) : (
                        <span className="theme-text-p">
                            Check out as{" "}
                            <span className="font-bold">{user.name}</span>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={openModal}
                        className="btn btn-warning">
                        Open Modal
                    </button>
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
                    {addingANote ? (
                        <>
                            <textarea
                                className="textarea textarea-primary"
                                placeholder="Bio"></textarea>
                            <button
                                className="btn btn-error"
                                onClick={(e) => setAddingANote(false)}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => setAddingANote(true)}>
                            Add a note
                        </button>
                    )}
                    <button
                        disabled={!shouldRevalidate}
                        className={clsx("btn btn-primary", {
                            "btn-warning": submitting,
                            "btn-disabled": cartCount < 1,
                        })}>
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </Form>
            </aside>
        </section>
    );
}
