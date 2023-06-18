import { LoaderArgs, json } from "@remix-run/node";
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
import { getCollectionOfItems } from "~/api/item";
import { getUserInfoById } from "~/api/user";
import { countItemsInCart, adjustForQuantities } from "~/utils/cart";
import { getCartSession } from "~/utils/cart.server";
import { getUserId } from "~/utils/session.server";
import Modal from "react-modal";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import type { CollectionOfItems } from "~/api/item";
import type { UserInfo } from "~/api/user";
import { useEffect, useState } from "react";

type LoaderData = {
    user: UserInfo;
    items: CollectionOfItems;
    cartCount: number;
    counts: { [key: string]: number };
};
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
    const id = await getUserId(request);
    // This scenerio should never happen
    invariant(id, "User ID is not defined");

    const cartSession = await getCartSession(request);
    const cart = cartSession.getCart();

    const adjustment = await adjustForQuantities(cart);
    cartSession.updateCart(adjustment.cart);

    const itemCounts = countItemsInCart(adjustment.cart);

    const data = {
        user: await getUserInfoById(id),
        shouldRevalidate: cart !== adjustment.cart,
        items: adjustment.stock,
        cartCount: adjustment.cart.length,
        counts: itemCounts,
    };

    return json(data, {
        headers: { "Set-Cookie": await cartSession.commit() },
    });
};

export const action: ActionFunction = async ({ request }) => {
    const userId = await getUserId(request);
    invariant(userId, "Could not check out cart");

    const { getCart, commit, updateCart } = await getCartSession(request);
    const cart = getCart();

    await CheckoutItems(userId, cart);

    updateCart([]);

    return json(
        { success: true },
        { headers: { "Set-Cookie": await commit() } }
    );
};

export default function ShedCheckOutRoute() {
    const { items, counts, user, cartCount, shouldRevalidate } =
        useLoaderData<typeof loader>();

    const revalidator = useRevalidator();
    useEffect(() => {
        if (shouldRevalidate) revalidator.revalidate();
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
