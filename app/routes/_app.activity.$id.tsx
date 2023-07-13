import { Prisma } from "@prisma/client";
import { json } from "@remix-run/node";
import {
    isRouteErrorResponse,
    Link,
    useLoaderData,
    useRouteError,
    useSearchParams,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";
import { db } from "~/utils/db.server";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CHECKOUT_TYPE } from "~/types/inventory";
import clsx from "clsx";
import { useMemo } from "react";
import { Check, Clock, LinkIcon } from "lucide-react";
import { getAction } from "~/utils/txText";

import type { SerializeFrom, LoaderArgs } from "@remix-run/node";

dayjs.extend(relativeTime);

const getLinkedTransaction = async (sisterId: string, linkId: string) => {
    try {
        const data = await db.transaction.findFirst({
            where: { AND: [{ link_id: linkId }, { id: { not: sisterId } }] },
            select: { item_count: true, id: true, status: true },
        });
        return data;
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code == "P2023") {
                throw new Response("Invalid id format", { status: 400 });
            }
        }
        throw new Response("Server error", { status: 500 });
    }
};
const getTransactionDetails = async (txId: string) => {
    try {
        const data = await db.transaction.findUnique({
            where: {
                id: txId,
            },
            include: { inventory: true, user: true },
        });

        return data;
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code == "P2023") {
                throw new Response("Invalid id format", { status: 400 });
            }
        }
    }
};

type TransactionDetails = Awaited<ReturnType<typeof getTransactionDetails>>;

export const loader = async ({ request, params }: LoaderArgs) => {
    invariant(params.id, "id is required");

    const tx = await getTransactionDetails(params.id);

    if (!tx) throw new Response("Transaction not found", { status: 404 });

    const linkedTx = await getLinkedTransaction(tx.id, tx.link_id);

    const data = {
        id: params.id,
        tx,
        linkedTx,
    };

    return json(data);
};

const InfoPanel = ({
    tx,
}: {
    tx: NonNullable<SerializeFrom<TransactionDetails>>;
}) => {
    const displayName = tx.by_guest
        ? `${tx.guest_display_name} from ${tx.user.name}`
        : tx.user.name;

    const s_container = "bg-base-200 rounded-lg p-4";
    return (
        <div className="flex-1 flex flex-col gap-2">
            {tx.checkout_type === CHECKOUT_TYPE.TEMPORARY && (
                <div
                    className={clsx(s_container, {
                        "bg-info text-info-content": tx.status === "PENDING",

                        "bg-success text-success-content":
                            tx.status === "COMPLETED",
                    })}>
                    <>
                        <span className="theme-text-h4">
                            Status: {tx.status}
                        </span>
                        <p>
                            {tx.status === "PENDING"
                                ? "Items have not been returned"
                                : `Items were borrowed for ${dayjs(
                                      tx.resolved_at
                                  )
                                      .to(dayjs(tx.created_at))
                                      .replace("ago", "")}`}
                        </p>
                    </>
                </div>
            )}
            <div className={s_container}>
                <span className="theme-text-h4">Who?</span>
                <p>{displayName}</p>
                <span className="theme-text-h4">When?</span>
                <p>
                    Created on {new Date(tx.created_at).toLocaleDateString()} at{" "}
                    {new Date(tx.created_at).toLocaleTimeString()} (
                    {dayjs(tx.created_at).from(new Date())})
                </p>
                <span className="theme-text-h4 block">Where?</span>
                <Link
                    className="link-primary"
                    to={`/inventory/${tx.inventory.short_id}`}>
                    {tx.inventory.name}
                </Link>
                <span className="theme-text-h4"></span>
            </div>
            {tx.note && (
                <div
                    className={clsx(s_container, {
                        "bg-warning text-warning-content": true,
                    })}>
                    <span className="theme-text-h4">Note</span>
                    <p>{tx.note}</p>
                </div>
            )}
            <span className="text-sm opacity-60 self-end">{tx.id}</span>
        </div>
    );
};

export default function TxOverviewRoute() {
    const { tx, linkedTx } = useLoaderData<typeof loader>();

    const [searchParams] = useSearchParams();
    const sortedItems = useMemo(() => {
        return tx.items.sort((a, b) => (a.name > b.name ? 1 : -1));
    }, [tx.items]);

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="theme-text-h2">Overview</h2>
                <Link
                    to={`/activity?${searchParams}`}
                    className="btn btn-error">
                    Close
                </Link>
            </div>

            <div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between  gap-4 sm:gap-2 my-8">
                    <div className="flex-1">
                        <h3 className="theme-text-h4">
                            {getAction(tx.checkout_type, true)} {tx.item_count}{" "}
                            item
                            {tx.item_count > 1 ? "s" : ""}
                        </h3>
                        <ul className="flex gap-2 flex-wrap my-4">
                            {sortedItems.map((item) => {
                                return (
                                    <li key={item.id}>
                                        <Link
                                            to={"#"}
                                            className="btn btn-ghost">
                                            {item.quantity} {item.name}
                                        </Link>
                                    </li>
                                );
                            })}

                            {linkedTx && (
                                <li key={linkedTx.id}>
                                    <Link
                                        to={`/activity/${linkedTx.id}?${searchParams}`}
                                        className="btn btn-primary btn-outline flex gap-2 items-center">
                                        {linkedTx.status === "COMPLETED" ? (
                                            <Check />
                                        ) : (
                                            <Clock />
                                        )}
                                        <LinkIcon />
                                        {linkedTx.item_count} item
                                        {linkedTx.item_count > 1 ? "s" : ""}
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>
                    <InfoPanel tx={tx} />
                </div>
            </div>
        </>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    console.log(error);
    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "The app encountered an unexpected error";

    return <UnknownErrorMessage message={errorMessage} />;
}
