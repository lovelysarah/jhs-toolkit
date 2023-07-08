import { Link } from "@remix-run/react";
import clsx from "clsx";
import { Check, Clock } from "lucide-react";
import type { MultipleTransactions } from "~/data/transaction";
import type { Unpacked } from "~/types/utils";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

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
            <tr className="hidden md:table-row hover">
                <td>{item.created_at.toLocaleDateString()}</td>
                <td
                    className={clsx({
                        "whitespace-normal": true,
                        "font-bold": isSelected,
                    })}
                    id={item.id}>
                    <div>
                        <span className="mr-2">
                            {item.checkout_type === "TEMPORARY" &&
                            item.status === "PENDING" ? (
                                <Clock className="inline" />
                            ) : (
                                <Check className="inline" />
                            )}
                        </span>
                        <span className="font-bold">
                            {item.by_guest
                                ? item.guest_display_name
                                : item.user.name}{" "}
                        </span>
                        {item.action_type === "CHECK_OUT"
                            ? item.checkout_type === "PERMANENT"
                                ? "took"
                                : "borrowed"
                            : "brought back"}{" "}
                        <span className="font-bold">
                            {item.item_count} items
                        </span>
                        {" from"}{" "}
                        <span className="font-bold">{item.inventory.name}</span>
                        {item.checkout_type === "TEMPORARY" &&
                            item.resolved_at && (
                                <span>
                                    {" "}
                                    for{" "}
                                    {dayjs(item.created_at)
                                        .from(dayjs(item.resolved_at))
                                        .replace("ago", "")}
                                </span>
                            )}
                    </div>
                </td>
                {!isSelected && (
                    <td>
                        <Link
                            to={`?${detailsLink}`}
                            className="btn btn-ghost btn-sm self-end">
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
                        {item.item_count} items
                    </span>
                    {" from"} {item.inventory.name}
                </td>
                <td>{item.created_at.toLocaleDateString()}</td>
            </tr>
            <tr className="sm:hidden">
                <td>
                    {item.by_guest ? item.guest_display_name : item.user.name}
                </td>
                <td>{item.item_count} items</td>
            </tr>
        </>
    );
};
