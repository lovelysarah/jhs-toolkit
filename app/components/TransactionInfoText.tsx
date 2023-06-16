import { Link } from "@remix-run/react";
import clsx from "clsx";
import type { MultipleTransactions } from "~/api/shedTransaction";
import type { Unpacked } from "~/types/utils";

export type TransactionInfoTextProps = {
    item: Unpacked<MultipleTransactions>;
    isSelected: boolean;
    detailsLink: string;
};

export const TransactionTableRow = ({
    item,
    detailsLink,
    isSelected,
}: TransactionInfoTextProps) => {
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
                {!isSelected && (
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
