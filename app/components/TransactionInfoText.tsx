import { Link } from "@remix-run/react";
import clsx from "clsx";

export type TransactionInfoTextProps = {
    item: any;
    isSelected: boolean;
    details: any;
    detailsLink: string;
};
const ShowDetails = ({ data }: { data: any }) => {
    return (
        <div
            className={clsx("bg-base-300 rounded-lg", {
                "font-normal text-base-content": true,
            })}>
            <h2 className="theme-text-h3">Transaction Details</h2>
            <div className="flex">
                <div className="flex-1">
                    <h4 className="theme-text-h4">Items</h4>
                    {data.item_ids.map((item: any) => {
                        return <span key={item}>{item}</span>;
                    })}
                </div>
                <div className="flex-1">
                    <h4 className="theme-text-h4">User</h4>
                    <span>{data.user.name}</span>
                    <h4 className="theme-text-h4">Action</h4>
                    <span>
                        {data.action_type === "CHECK_OUT"
                            ? "Check out"
                            : "Check in"}
                    </span>

                    <h4 className="theme-text-h4">Note</h4>
                    <p>
                        Lorem ipsum dolor, sit amet consectetur adipisicing
                        elit. Ratione quidem commodi blanditiis architecto quis
                        et nisi facilis mollitia consequuntur delectus?
                    </p>
                </div>
            </div>
        </div>
    );
};

export const TransactionTableRow = ({
    item,
    details,
    detailsLink,
    isSelected,
}: TransactionInfoTextProps) => {
    console.log(detailsLink);
    const showDetails = details && isSelected;
    return (
        <>
            <tr className="hidden md:table-row">
                <td
                    className={clsx({
                        "whitespace-normal": true,
                        "font-bold": isSelected,
                    })}
                    id={item.id}>
                    <div>
                        <span className="font-bold">{item.user.name} </span>
                        {item.action_type === "CHECK_OUT"
                            ? "took"
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
                    </div>
                </td>
                {!showDetails && (
                    <td>
                        <Link
                            to={`?${detailsLink}`}
                            className="btn btn-ghost self-end">
                            View details
                        </Link>
                    </td>
                )}
            </tr>
            <tr className="hidden sm:table-row md:hidden">
                <td>
                    <span className="font-bold">{item.user.name} </span>
                    {item.action_type === "CHECK_OUT"
                        ? "took"
                        : "brought back"}{" "}
                    <span className="font-bold link link-primary">
                        {item.item_ids.length} items
                    </span>
                    {" from"}{" "}
                    {item.shed_location === "FLANDERS"
                        ? "15 Flanders Court"
                        : "170 Joyce Ave"}
                </td>
                <td>{item.created_at.toLocaleDateString()}</td>
            </tr>
            <tr className="sm:hidden">
                <td>{item.user.name}</td>
                <td>{item.item_ids.length} items</td>
            </tr>
        </>
    );
};
