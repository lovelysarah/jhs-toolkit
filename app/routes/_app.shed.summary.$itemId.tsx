import { LoaderFunction, json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { SingleItemResult, getSingleItem } from "~/data/item";
import invariant from "tiny-invariant";

type LoaderData = {
    item: SingleItemResult;
};

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "",
];

export const loader: LoaderFunction = async ({ params }) => {
    invariant(params.itemId, "Expected itemId");
    const data: LoaderData = {
        item: await getSingleItem(params.itemId),
    };

    return json(data);
};

export default function ItemDetailRoute() {
    const { item } = useLoaderData<LoaderData>();
    invariant(item);
    console.log(item.last_checked_out_at);
    const date = new Date(item.last_checked_out_at);

    console.log({ date });
    console.log({ test: date.getUTCDay() });

    return (
        <div className="px-4 py-2">
            <Outlet />
            <p>{item.note}</p>
            <p>
                Last checked out by{" "}
                <span className="font-bold">{item.last_checked_out_by}</span> on{" "}
                <span className="font-bold">
                    {months[date.getUTCMonth()]} {date.getUTCDate()}{" "}
                    {date.getUTCFullYear()}
                </span>
            </p>
        </div>
    );
}
