import clsx from "clsx";
import { json } from "@remix-run/node";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";

import Pagination from "~/components/Pagination";
import { TransactionTableRow } from "~/components/TransactionInfoText";

import { db } from "~/utils/db.server";

import type { UsersWithAShedTransaction } from "~/data/user";
import type { LoaderArgs } from "@remix-run/node";
import type { Prisma } from "@prisma/client";
import {
    getTransactionDetails,
    getTransactionsFromRange,
} from "~/data/shedTransaction";
import type {
    MultipleTransactions,
    TransactionDetails,
} from "~/data/shedTransaction";

import { getUsersThatHaveShedTransactions } from "~/data/user";

// How many transactions to show per page
const PER_PAGE = 7;

type LoaderData = {
    users: UsersWithAShedTransaction;
    transactionDetails: TransactionDetails;
    transactions: MultipleTransactions;
    transactionCount: number;
    offset: number;
};
export const loader = async ({ request }: LoaderArgs) => {
    const data = {} as LoaderData;

    // Get the query parameters
    const url = new URL(request.url);
    const query = url.searchParams;

    // Get details about the transaction
    const transactionId = query.get("transaction");

    if (transactionId) {
        data.transactionDetails = await getTransactionDetails(transactionId);
    }

    // Get the current page
    const currentPage = Math.max(Number(query.get("page")) || 1);

    // Set query options for pagination
    const countOptions: Prisma.ShedTransactionCountArgs = {};
    const options: Prisma.ShedTransactionFindManyArgs = {
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
    const [users, transactions, transactionCount] = await Promise.all([
        getUsersThatHaveShedTransactions(),
        getTransactionsFromRange(options),
        db.shedTransaction.count(countOptions),
    ]);

    console.log(transactions[0]);
    // Set the data
    data.users = users;
    data.transactions = transactions;
    data.transactionCount = transactionCount;
    data.offset = (currentPage - 1) * PER_PAGE;

    return json(data);
};

const ShowDetails = ({ data }: { data: TransactionDetails }) => {
    console.log({ data });
    const uniqueItems = [...new Set(data.item_ids)];
    const splitInTwo = uniqueItems.length >= 10;

    // Conditional
    const half = Math.ceil(uniqueItems.length / 2);
    const itemsFirstHalf = uniqueItems.slice(0, half);
    const itemsSecondHalf = uniqueItems.slice(half);
    return (
        <div className={clsx({})}>
            <div className="flex md:flex-row md:justify-between md:items-center">
                <h2 className="theme-text-h3">Transaction Details</h2>
                <Link
                    className="btn btn-error btn-outline"
                    to="/shed/activity">
                    Close
                </Link>
            </div>
            <div className="flex">
                <div className="flex-1">
                    <h4 className="theme-text-h4">
                        {data.item_ids.length} Items
                    </h4>
                    <div
                        className={clsx({
                            flex: splitInTwo,
                            "flex flex-col": !splitInTwo,
                        })}>
                        {!splitInTwo ? (
                            uniqueItems.map((item, index) => {
                                if (data.count)
                                    return (
                                        <span key={`${item}-${index}`}>
                                            {data.count[item]} {item}
                                        </span>
                                    );
                                return null;
                            })
                        ) : (
                            <>
                                <div className="flex-1 flex flex-col">
                                    {/* // Add custom key */}
                                    {itemsFirstHalf.map((item, index) => {
                                        if (data.count)
                                            return (
                                                <span key={`${item}-${index}`}>
                                                    {data.count[item]} {item}
                                                </span>
                                            );
                                        return null;
                                    })}
                                </div>
                                <div className="flex-1 flex flex-col">
                                    {/* // Add custom key */}
                                    {itemsSecondHalf.map((item, index) => {
                                        if (data.count)
                                            return (
                                                <span key={`${item}-${index}`}>
                                                    {data.count[item]} {item}
                                                </span>
                                            );
                                        return null;
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex-1">
                    <h4 className="theme-text-h4">User</h4>
                    <span>
                        {data.display_name} [{data.user.name}]
                    </span>
                    <h4 className="theme-text-h4">Date & Time</h4>
                    <span>
                        {data.created_at.toLocaleDateString()} at{" "}
                        {data.created_at.toLocaleTimeString()}
                    </span>
                    <h4 className="theme-text-h4">Action</h4>
                    <span>
                        {data.action_type === "CHECK_OUT"
                            ? "Check out"
                            : "Check in"}
                    </span>

                    {data.note && (
                        <>
                            <h4 className="theme-text-h4">Note</h4>
                            <p className="opacity-70">{data.note}</p>
                        </>
                    )}
                </div>
            </div>
            <span className="text-sm opacity-50">ID: {data.id}</span>
            <div className="divider"></div>
        </div>
    );
};
export default function ShedActivityRoute() {
    const {
        transactions,
        transactionCount,
        users,
        offset,
        transactionDetails,
    } = useLoaderData<typeof loader>();

    const [searchParams] = useSearchParams();

    const finalPage = Math.ceil(transactionCount / PER_PAGE);

    const [nameFilter, setNameFilter] = useState(false);
    const [nameFilterSelected, setNameFilterSelected] = useState("DEFAULT");

    useEffect(() => {
        setNameFilterSelected(searchParams.get("filter-by-user") || "DEFAULT");
        setNameFilter(Boolean(searchParams.get("filter-by-user")));
    }, [searchParams]);

    const detailsLink = new URLSearchParams(searchParams);

    const largeList = ["Summary"];
    const smallList = ["Name", "Details"];

    return (
        <section>
            {transactionDetails && (
                <ShowDetails
                    data={{
                        ...transactionDetails,
                        created_at: new Date(transactionDetails.created_at),
                    }}
                />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="basis-1/3">
                    <h2 className="theme-text-h3">All</h2>
                    <span className="text-sm">
                        {transactions.length > 1
                            ? `Displaying items [${offset + 1} - ${
                                  offset + transactions.length
                              }] out of ${transactionCount}`
                            : `Displaying item ${
                                  offset + 1
                              } out of ${transactionCount}`}
                    </span>
                </div>
                <Form className="basis-2/3 flex gap-2 items-center sm:justify-end my-2">
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
                            to="/shed/activity"
                            className="btn btn-error">
                            <X />
                        </Link>
                    )}

                    <button className="btn btn-info flex gap-2 items-center">
                        <Search />
                        <span className="hidden md:inline">Search</span>
                    </button>
                </Form>
            </div>
            <table className="table w-full z-10">
                {/* head */}
                <thead className="hidden sm:table-header-group">
                    <tr>
                        {largeList.map((th) => (
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
                        {smallList.map((th) => (
                            <th
                                className="bg-base-100"
                                key={th}>
                                {th}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((item) => {
                        detailsLink.set("transaction", item.id);
                        return (
                            <TransactionTableRow
                                key={item.id}
                                isSelected={transactionDetails?.id === item.id}
                                item={{
                                    ...item,
                                    created_at: new Date(item.created_at),
                                }}
                                detailsLink={detailsLink.toString()}
                            />
                        );
                    })}
                    {/* row 2 */}
                </tbody>
            </table>
            {finalPage > 1 && (
                <Pagination
                    totalPages={finalPage}
                    pageParam="page"
                />
            )}
        </section>
    );
}
