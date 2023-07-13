import clsx from "clsx";
import { json, redirect } from "@remix-run/node";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
    Form,
    Link,
    Outlet,
    isRouteErrorResponse,
    useLoaderData,
    useNavigation,
    useParams,
    useRouteError,
    useSearchParams,
} from "@remix-run/react";

import Pagination from "~/components/Pagination";
import { TransactionTableRow } from "~/components/TransactionInfoText";

import { db } from "~/utils/db.server";
import {
    getPendingTransactions,
    getTransactionsFromRange,
} from "~/data/transaction";
import { getUsersWithATransaction } from "~/data/user";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";

import type { UsersWithATransaction } from "~/data/user";
import type { LoaderArgs, SerializeFrom } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import type {
    MultipleTransactions,
    PendingTransactions,
} from "~/data/transaction";

// How many transactions to show per page
const PER_PAGE = 7;

type LoaderData = {
    users: UsersWithATransaction;
    transactions: MultipleTransactions;
    transactionCount: number;
    pendingTx: PendingTransactions;
    offset: number;
};
export const loader = async ({ request }: LoaderArgs) => {
    const data = {} as LoaderData;

    // Get the query parameters
    const url = new URL(request.url);
    const query = url.searchParams;

    // Get the current page
    const currentPage = Math.max(Number(query.get("page")) || 1);

    // Handle pages that are out of range
    if (currentPage < 1) {
        url.searchParams.delete("page");
        return redirect(url.toString());
    }

    // Set query options for pagination
    const countOptions: Prisma.TransactionCountArgs = {};
    const options: Prisma.TransactionFindManyArgs = {
        take: PER_PAGE,
        skip: (currentPage - 1) * PER_PAGE,
        orderBy: { created_at: "desc" },
    };

    // Filter by user
    if (query.get("filter-by-user")) {
        options.where = {
            user: {
                id: query.get("filter-by-user") || undefined,
            },
        };
        countOptions.where = options.where;
    }

    // Read from database
    const [users, transactions, transactionCount, pendingTx] =
        await Promise.all([
            getUsersWithATransaction(),
            getTransactionsFromRange(options),
            db.transaction.count(countOptions),
            getPendingTransactions(),
        ]);

    const offset = (currentPage - 1) * PER_PAGE;

    if (offset > transactionCount) {
        url.searchParams.set(
            "page",
            Math.ceil(transactionCount / PER_PAGE).toString()
        );
        return redirect(url.toString());
    }

    // Set the data
    data.pendingTx = pendingTx;
    data.users = users;
    data.transactions = transactions;
    data.transactionCount = transactionCount;
    data.offset = offset;

    return json(data);
};

const TransactionTable = ({
    txs,
    largeHeaders,
    smallHeaders,
}: {
    txs: SerializeFrom<MultipleTransactions>;
    largeHeaders: string[];
    smallHeaders: string[];
}) => {
    const params = useParams();
    const [searchParams] = useSearchParams();
    return (
        <table className="table w-full z-10 table-compact my-8">
            {/* head */}
            <thead className="hidden sm:table-header-group">
                <tr>
                    {largeHeaders.map((th) => (
                        <th
                            className="bg-base-100"
                            key={th}>
                            {th}
                        </th>
                    ))}
                </tr>
            </thead>
            <thead className="table-header-group sm:hidden">
                <tr>
                    {smallHeaders.map((th) => (
                        <th
                            className="bg-base-100"
                            key={th}>
                            {th}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {txs.map((item) => {
                    return (
                        <TransactionTableRow
                            key={item.id}
                            showDetailBtn={params.id !== item.id}
                            item={{
                                ...item,
                                created_at: new Date(item.created_at),
                                resolved_at: item.resolved_at
                                    ? new Date(item.resolved_at)
                                    : null,
                            }}
                            detailsLink={`/activity/${
                                item.id
                            }?${searchParams.toString()}`}
                        />
                    );
                })}
            </tbody>
        </table>
    );
};

export default function InventoryActivityRoute() {
    const { transactions, transactionCount, users, offset, pendingTx } =
        useLoaderData<typeof loader>();

    const [searchParams] = useSearchParams();
    const params = useParams();
    const nav = useNavigation();

    const finalPage = Math.ceil(transactionCount / PER_PAGE);

    const [nameFilter, setNameFilter] = useState(false);
    const [nameFilterSelected, setNameFilterSelected] = useState("DEFAULT");

    const baseRoute = `/activity${params.id ? `/${params.id}` : ""}`;

    useEffect(() => {
        setNameFilterSelected(searchParams.get("filter-by-user") || "DEFAULT");
        setNameFilter(Boolean(searchParams.get("filter-by-user")));
    }, [searchParams]);

    const largeList = ["Date", "Summary"];
    const smallList = ["Name", "Details"];

    return (
        <section>
            <div className="mt-4 mb-16">
                <Outlet />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="basis-1/3">
                    <h2 className="theme-text-h3">Browse transactions</h2>
                    <span className="text-sm">
                        {transactions.length > 1
                            ? `Displaying items [${offset + 1} - ${
                                  offset + transactions.length
                              }] out of ${transactionCount}`
                            : `Displaying item ${Math.min(
                                  offset + 1,
                                  transactionCount
                              )} out of ${transactionCount}`}
                    </span>
                </div>
                <Form
                    className="basis-2/3 flex gap-2 items-center sm:justify-end my-2"
                    action={baseRoute}>
                    <select
                        className="select max-w-xs"
                        name="filter-by-user"
                        onChange={(e) => {
                            setNameFilter(e.target.value ? true : false);
                            setNameFilterSelected(e.target.value);
                        }}
                        value={nameFilterSelected}>
                        <option
                            disabled
                            value={"DEFAULT"}>
                            Filter by user
                        </option>
                        {users.map((user) => (
                            <option
                                key={user.id}
                                value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                    {nameFilter && (
                        <Link
                            onClick={() => {
                                setNameFilterSelected("DEFAULT");
                                setNameFilter(false);
                            }}
                            to={baseRoute}
                            className="btn btn-error">
                            <X />
                        </Link>
                    )}

                    <button
                        className={clsx(
                            "btn btn-primary flex gap-2 items-center",
                            {
                                "btn-disabled": nav.state !== "idle",
                            }
                        )}>
                        {nav.state !== "idle" ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Search />
                        )}
                        <span className="hidden md:inline">Search</span>
                    </button>
                </Form>
            </div>
            <TransactionTable
                txs={transactions}
                largeHeaders={largeList}
                smallHeaders={smallList}
            />
            {finalPage > 1 && (
                <Pagination
                    totalPages={finalPage}
                    pageParam="page"
                />
            )}

            <div className="divider"></div>
            <div>
                <h3 className="theme-text-h3">Pending transactions</h3>
                <TransactionTable
                    txs={pendingTx}
                    largeHeaders={largeList}
                    smallHeaders={smallList}
                />
            </div>
        </section>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "Couldn't load the activity component";

    return (
        <div className="m-4">
            <UnknownErrorMessage message={errorMessage} />
        </div>
    );
}
