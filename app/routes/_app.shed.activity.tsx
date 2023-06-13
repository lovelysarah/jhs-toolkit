import { LoaderArgs, json } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import {
    LatestShedTransactions,
    getAllShedTransactions,
} from "~/api/shedTransaction";
import { Unpacked } from "~/types/utils";
import { db } from "~/utils/db.server";
import { Prisma } from "@prisma/client";
import { Search, X } from "lucide-react";
import { useState } from "react";

const PER_PAGE = 3;

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const query = url.searchParams;

    const currentPage = Math.max(Number(query.get("page")) || 1);

    const users = await db.user.findMany({
        select: { name: true, id: true },
    });

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

    const transactionCount = await db.shedTransaction.count(countOptions);
    const transactions = await db.shedTransaction.findMany({
        ...options,
        select: {
            shed_location: true,
            item_ids: true,
            user: { select: { name: true } },
            action_type: true,
            created_at: true,
        },
    });

    const data = {
        usernames: users,
        transactions,
        transactionCount,
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
    const { transactions, transactionCount, usernames } =
        useLoaderData<typeof loader>();

    console.log(transactions[0]);
    invariant(transactions, "Couldn't load latest transactions");

    const [nameFilter, setNameFilter] = useState(false);

    const [nameFilterSelected, setNameFilterSelected] = useState("DEFAULT");

    const largeList = ["Summary"];
    const smallList = ["Name", "Details"];

    return (
        <section>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="theme-text-h3">All</h2>
                    <span className="text-sm">
                        Displaying {transactions.length} of {transactionCount}
                    </span>
                </div>
                <Form className="flex gap-2 items-center">
                    <select
                        className="select w-full max-w-xs"
                        name="filter-by-user"
                        onChange={(e) => {
                            setNameFilter(e.target.value ? true : false);
                            setNameFilterSelected(e.target.value);
                        }}
                        value={nameFilterSelected}>
                        <option
                            disabled
                            value={"DEFAULT"}
                            selected>
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
                        Search
                    </button>
                </Form>
            </div>
            <Outlet />
            <table className="table w-full">
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
                        <TableRow
                            item={{
                                ...item,
                                created_at: new Date(item.created_at),
                            }}
                        />
                    ))}
                    {/* row 2 */}
                </tbody>
            </table>
            <div className="join">
                <button className="join-item btn">1</button>
                <button className="join-item btn btn-active">2</button>
                <button className="join-item btn">3</button>
                <button className="join-item btn">{transactionCount}</button>
            </div>
        </section>
    );
}
