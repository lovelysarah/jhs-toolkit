import { LoaderArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import invariant from "tiny-invariant";
import { db } from "~/utils/db.server";

export const loader = async ({ request, params }: LoaderArgs) => {
    const itemId = params.itemId;

    invariant(itemId, "Item id is required");

    const findTransactionsThatContainsItem = async (item: string) =>
        await db.shedTransaction.findMany({
            where: { item_ids: { has: item } },
        });
    const item = await db.item.findUniqueOrThrow({
        where: { id: itemId },
    });

    const pastTransactions = await findTransactionsThatContainsItem(item.name);
    const notes = await db.shedTransaction.findMany({
        where: { item_ids: { has: item.name } },
        select: { id: true, note: true, created_at: true, display_name: true },
        orderBy: {
            created_at: "desc",
        },
    });

    const data = {
        item,
        notes,
        pastTransactions,
    };
    return json(data);
};
export default function ItemActivityById() {
    const { item, pastTransactions, notes } = useLoaderData<typeof loader>();

    let noteLastDate = "";

    return (
        <div>
            <h1 className="theme-text-h3">Past activity of {item.name}</h1>
            <ul>
                {pastTransactions.map((transaction) => {
                    return (
                        <li key={transaction.id}>{transaction.display_name}</li>
                    );
                })}
            </ul>
            <h2 className="theme-text-h3">Past notes</h2>
            <ul>
                {notes.map((note) => {
                    const date = new Date(note.created_at).toLocaleDateString();

                    console.log(date, noteLastDate);
                    console.log(noteLastDate !== date);
                    let addHeader = false;
                    if (noteLastDate !== date) {
                        addHeader = true;
                        noteLastDate = date;
                    }

                    return (
                        <>
                            {addHeader && (
                                <li className="theme-text-h4 opacity-50">
                                    {new Date(
                                        note.created_at
                                    ).toLocaleDateString()}
                                </li>
                            )}
                            <li key={note.id}>
                                <span className="font-bold">
                                    {note.display_name} said:{" "}
                                </span>
                                {note.note}
                            </li>
                        </>
                    );
                })}
            </ul>
        </div>
    );
}
