import { LoaderArgs, json } from "@remix-run/node";
import {
    Form,
    Link,
    Outlet,
    useLoaderData,
    useSearchParams,
} from "@remix-run/react";
import invariant from "tiny-invariant";
import { LatestShedTransactions } from "~/api/shedTransaction";
import { Unpacked } from "~/types/utils";
import { db } from "~/utils/db.server";
import { Prisma } from "@prisma/client";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import Pagination from "~/components/Pagination";
import { TransactionTableRow } from "~/components/TransactionInfoText";

const PER_PAGE = 10;

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const query = url.searchParams;

    const currentPage = Math.max(Number(query.get("page")) || 1);

    const countOptions: Prisma.ShedTransactionCountArgs = {};
    const options: Prisma.ShedTransactionFindManyArgs = {
        take: PER_PAGE,
        skip: (currentPage - 1) * PER_PAGE,

        orderBy: { created_at: "desc" },
        where: undefined,
    };

    if (query.get("filter-by-user")) {
        console.log(query.get("filter-by-user"));
        options.where = {
            user: {
                id: query.get("filter-by-user") || undefined,
            },
        };
        countOptions.where = options.where;
    }

    const [users, transactions, transactionCount] = await Promise.all([
        db.user.findMany({
            where: {
                shed_transactions: {
                    some: {},
                },
            },
            select: { name: true, id: true },
        }),
        db.shedTransaction.findMany({
            ...options,
            select: {
                id: true,
                shed_location: true,
                item_ids: true,
                user: { select: { name: true } },
                action_type: true,
                created_at: true,
            },
        }),
        db.shedTransaction.count(countOptions),
    ]);

    const data = {
        usernames: users,
        transactions,
        transactionCount,
        offset: (currentPage - 1) * PER_PAGE,
    };

    return json(data);
};

const TableRow = ({ item }: { item: Unpacked<LatestShedTransactions> }) => {
    return (
        <tr>
            <td>
                <span className="font-bold">{item.user.name} </span>
                {item.action_type === "CHECK_OUT"
                    ? "checked out"
                    : "brought back"}{" "}
                <span className="font-bold link link-primary">
                    {item.item_ids.length} items
                </span>
                {" from"}{" "}
                {item.shed_location === "FLANDERS"
                    ? "15 Flanders Court"
                    : "170 Joyce Ave"}
                {" at"} {item.created_at.toLocaleTimeString()}
                {" on"} {item.created_at.toLocaleDateString()}
            </td>
            <td>
                <button className="btn btn-ghost">
                    {item.user.name.split(" ")[0]}'s bag
                </button>
            </td>
        </tr>
    );
};

export default function ShedActivityRoute() {
    const { transactions, transactionCount, usernames, offset } =
        useLoaderData<typeof loader>();

    console.log(transactions[0]);
    const [searchParams] = useSearchParams();

    invariant(transactions, "Couldn't load latest transactions");

    // const currentPage = searchParams.get("page")
    //  Number(searchParams.get("page"))
    // : 1;
    const finalPage = Math.ceil(transactionCount / PER_PAGE);
    // const prevPage = Math.max(currentPage - 1, 0);
    // const nextPage = Math.min(currentPage + 1, finalPage);

    const [nameFilter, setNameFilter] = useState(false);
    const [nameFilterSelected, setNameFilterSelected] = useState("DEFAULT");

    useEffect(() => {
        setNameFilterSelected(searchParams.get("filter-by-user") || "DEFAULT");
        setNameFilter(Boolean(searchParams.get("filter-by-user")));
    }, []);

    const largeList = ["Summary"];
    const smallList = ["Name", "Details"];

    return (
        <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="basis-1/3">
                    <h2 className="theme-text-h3">All</h2>
                    <span className="text-sm">
                        Displaying {offset + 1} to{" "}
                        {offset + transactions.length} of {transactionCount}
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
                        {usernames.map((user) => (
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
            <Outlet />
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
                    {transactions.map((item) => (
                        <TransactionTableRow
                            key={item.id}
                            item={{
                                ...item,
                                created_at: new Date(item.created_at),
                            }}
                        />
                    ))}
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
