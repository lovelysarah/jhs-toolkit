import { json } from "@remix-run/node";
import {
    Form,
    isRouteErrorResponse,
    useActionData,
    useLoaderData,
    useNavigation,
    useRevalidator,
    useRouteError,
    useSubmit,
} from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";
import invariant from "tiny-invariant";
import Modal from "react-modal";

import { getUserInfoById } from "~/data/user";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId, requireUser } from "~/utils/session.server";

import { FormAlert } from "~/components/FormAlert";

import type { TxActionData, TxFieldErrors, TxFields } from "~/types/form";
import type {
    ActionFunction,
    LoaderArgs,
    TypedResponse,
} from "@remix-run/node";
import { Check, MapPin } from "lucide-react";
import { isTxItem } from "~/types/tx";
import { validateNote } from "~/helper/TransactionFormValidators";
import { resolveTransactions } from "~/data/transaction";
import { RESOLVE_TX_STATUS } from "~/types/inventory";
import { FEATURE_FLAG } from "~/config";
import {
    ErrorResponseMessage,
    UnknownErrorMessage,
} from "~/components/ErrorMessage";

const TRANSACTION_NOTE_MAX_LENGTH = 200;

dayjs.extend(relativeTime);

Modal.setAppElement("#root");

type LoaderData = {
    pendingTransactions: PendingTransactions;
    user: Awaited<ReturnType<typeof getUserInfoById>>;
    cartCount: number;
    counts: Record<string, number>;
};
const getPendingTxs = async (userId: string) =>
    await db.transaction.findMany({
        orderBy: { created_at: "asc" },
        where: {
            AND: [
                { user_id: userId },
                { status: "PENDING" },
                { checkout_type: "TEMPORARY" },
                { inventory: { deleted_at: { isSet: false } } },
            ],
        },
        include: { inventory: true },
    });

type PendingTransactions = Awaited<ReturnType<typeof getPendingTxs>>;

export const loader = async ({ request }: LoaderArgs) => {
    const data = {} as LoaderData;
    const userId = await requireUser(request);

    // Get the query parameters
    const url = new URL(request.url);
    const query = url.searchParams;

    // Get details about the transaction
    const historyRequest = query.get("history");

    if (historyRequest) {
        console.log(historyRequest);
    }

    data.pendingTransactions = await getPendingTxs(userId);
    data.user = await getUserInfoById(userId);

    return json(data);
};

export const action: ActionFunction = async ({
    request,
}): Promise<TypedResponse<TxActionData>> => {
    const userId = await getUserId(request);

    invariant(userId, "Could not check out cart");

    const form = await request.formData();
    const txs = form.get("transactions");
    const note = form.get("note") || "";
    const hasNote = form.get("has-note") === "true";

    if (typeof txs !== "string" || typeof note !== "string") {
        return badRequest<TxActionData>({
            formError: "Invalid Request",
            fieldErrors: null,
            fields: null,
            type: RESOLVE_TX_STATUS.FAILURE,
            message: "Some fields are invalid",
        });
    }

    const fields: TxFields = { note };

    const fieldErrors: TxFieldErrors = {
        note: validateNote(note, hasNote),
    };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest<TxActionData>({
            formError: "Some fields are invalid",
            fields,
            fieldErrors,
            type: RESOLVE_TX_STATUS.FAILURE,
            message: "Some fields are invalid",
        });
    }

    try {
        const affectedTxs = await resolveTransactions(JSON.parse(txs));

        return json({
            type: RESOLVE_TX_STATUS.SUCCESS,
            data: { transactions: affectedTxs },
            formError: null,
            fields: null,
            fieldErrors: null,
            message: "Successfullly returned items!",
        });
    } catch (err) {
        const error = err as Error;
        return badRequest<TxActionData>({
            formError: error.message,
            fields,
            fieldErrors,
            type: RESOLVE_TX_STATUS.FAILURE,
            message: error.message,
        });
    }
};

export default function InventoryCheckInRoute() {
    const { pendingTransactions, user } = useLoaderData<typeof loader>();

    const action = useActionData<TxActionData>();

    const revalidator = useRevalidator();
    const navigation = useNavigation();
    const submit = useSubmit();

    useEffect(() => {
        console.log(action?.type);
        if (
            action?.type === RESOLVE_TX_STATUS.SUCCESS &&
            navigation.state === "idle"
        ) {
            setNote("");
            setShowNoteField(false);
            setSelectedTxs([]);
        }
    }, [action, navigation.state]);

    const noteFieldRef = useRef<HTMLTextAreaElement>(null);

    const [selectedTxs, setSelectedTxs] = useState<string[]>([]);

    const [showNoteField, setShowNoteField] = useState(false);
    const [note, setNote] = useState("");

    const isIdle = navigation.state === "idle";
    const isLoading = navigation.state === "loading";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        //Client side validation here

        //Create form data
        const formData = new FormData();
        formData.append("transactions", JSON.stringify(selectedTxs));
        formData.append("note", note);
        formData.append("has-note", String(showNoteField));

        // Submit form
        submit(formData, { method: "POST" });
    };

    useEffect(() => {
        // Updates the updatedTime and reloads the data
        const revalidate = () => {
            revalidator.revalidate();
        };

        // When the window is focused, revalidate and restart interval
        const onFocus = () => {
            revalidate();
        };

        window.addEventListener("focus", onFocus);

        return () => {
            // Cleanup
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    invariant(user, "Check out information not found");
    const filteredTxs = useMemo(
        () => pendingTransactions.filter((tx) => selectedTxs.includes(tx.id)),
        [selectedTxs]
    );

    // Focuses the note field when it is shown and puts the cursor at the end
    useEffect(() => {
        if (!showNoteField || !noteFieldRef.current) return;
        const noteField = noteFieldRef.current;
        const end = noteField.value.length;
        noteField.setSelectionRange(end, end);
        noteField.focus();
    }, [showNoteField, noteFieldRef.current]);

    const addToSelected = (id: string) => (e: any) =>
        setSelectedTxs((prev) => [...selectedTxs, id]);

    const removeFromSelected = (id: string) => (e: any) =>
        setSelectedTxs((prev) => prev.filter((txId) => txId !== id));

    const submitting = navigation.state === "submitting";

    return (
        <section className="flex flex-col-reverse md:flex-row gap-12 items-start">
            <div className="w-full md:basis-3/5">
                <h2
                    className={clsx(
                        "theme-text-h3 mb-8 flex gap-2 items-center"
                    )}>
                    My Transactions
                </h2>
                {pendingTransactions.length < 1 ? (
                    <div className="alert alert-success">
                        <div>
                            <Check />
                            <span>No pending transactions</span>
                        </div>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-8 my-4">
                        {pendingTransactions.map((tx) => {
                            const timeAgo = dayjs().to(dayjs(tx.created_at));

                            return (
                                <li
                                    key={tx.id}
                                    className="flex flex-col p-4 bg-base-200 rounded-lg">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <span className="theme-text-h4 py-2 flex gap-2 items-center">
                                                {tx.item_count} item
                                                {tx.item_count > 1
                                                    ? "s"
                                                    : ""}{" "}
                                                {tx.by_guest
                                                    ? `by ${tx.guest_display_name}`
                                                    : ""}
                                            </span>
                                            <span className="flex gap-2 items-center">
                                                <MapPin />
                                                {tx.inventory.name}
                                            </span>
                                        </div>
                                        <div className="justify-between flex gap-2 items-center">
                                            <ul>
                                                {tx.items.map(
                                                    (item: unknown) => {
                                                        if (!isTxItem(item))
                                                            return null;
                                                        return (
                                                            <li
                                                                key={`tx-${tx.id}-${item.name}`}>
                                                                {item.quantity}{" "}
                                                                {item.name}
                                                            </li>
                                                        );
                                                    }
                                                )}
                                            </ul>
                                            <span className="opacity-60 self-start">
                                                {timeAgo}
                                            </span>
                                        </div>
                                        {selectedTxs.includes(tx.id) ? (
                                            <button
                                                onClick={removeFromSelected(
                                                    tx.id
                                                )}
                                                className="btn btn-error">
                                                Remove
                                            </button>
                                        ) : (
                                            <button
                                                onClick={addToSelected(tx.id)}
                                                className="btn btn-primary btn-outline">
                                                Return
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <aside className="w-full md:basis-2/5 sticky top-0 md:top-6">
                <div className="p-8">
                    <h2 className="theme-text-h3">Information</h2>
                    <Form
                        onSubmit={handleSubmit}
                        method="POST"
                        className="flex flex-col gap-2">
                        <FormAlert
                            variant="warning"
                            condition={action?.formError}
                        />
                        <span className="theme-text-p">
                            Checking in as{" "}
                            <span className="font-bold">{user?.name}</span>
                        </span>
                        {selectedTxs.length > 0 && (
                            <>
                                <span>This will return:</span>
                                <ul className="p-2 list-disc">
                                    {filteredTxs.map((tx) => (
                                        <li key={tx.id}>
                                            {tx.by_guest
                                                ? `${tx.guest_display_name}'s`
                                                : ""}{" "}
                                            {tx.item_count} item
                                            {tx.item_count > 1
                                                ? "s"
                                                : ""} at {tx.inventory.name}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {FEATURE_FLAG.CHECKIN_NOTE &&
                            (showNoteField ? (
                                <>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">
                                                Transaction Note
                                            </span>
                                            <span className="label-text-alt">
                                                {note.length}/
                                                {TRANSACTION_NOTE_MAX_LENGTH}
                                            </span>
                                        </label>
                                        <textarea
                                            ref={noteFieldRef}
                                            className="textarea textarea-primary"
                                            placeholder="Add a note.."
                                            name="note"
                                            // maxLength={TRANSACTION_NOTE_MAX_LENGTH}
                                            value={note}
                                            onChange={(e) => {
                                                if (
                                                    e.target.value.length <=
                                                    TRANSACTION_NOTE_MAX_LENGTH
                                                )
                                                    setNote(e.target.value);

                                                if (action?.fieldErrors?.note)
                                                    action.fieldErrors.note =
                                                        undefined;
                                            }}></textarea>
                                    </div>
                                    <FormAlert
                                        variant="error"
                                        condition={action?.fieldErrors?.note}
                                    />
                                    <button
                                        className="btn btn-error btn-sm"
                                        onClick={(e) =>
                                            setShowNoteField(false)
                                        }>
                                        Cancel Note
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    type="button"
                                    onClick={(e) => {
                                        setShowNoteField(true);
                                    }}>
                                    Add a note
                                </button>
                            ))}
                        <button
                            disabled={
                                navigation.state !== "idle" ||
                                selectedTxs.length < 1
                            }
                            className={clsx("btn btn-primary", {
                                "btn-warning": submitting,
                            })}>
                            {isIdle
                                ? "Submit"
                                : isLoading
                                ? "Loading.."
                                : "Submitting.."}
                        </button>
                    </Form>
                </div>
            </aside>
        </section>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return <ErrorResponseMessage error={error} />;
    }

    let errorMessage = "Couldn't load the check-in component";

    return (
        <div className="m-4">
            <UnknownErrorMessage message={errorMessage} />
        </div>
    );
}
