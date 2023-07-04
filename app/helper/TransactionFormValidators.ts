import type { ACCOUNT_TYPE } from "@prisma/client";
import { TRANSACTION_NOTE_MAX_LENGTH } from "~/constant";

export const validateDisplayName = (
    displayName: string,
    account_type: ACCOUNT_TYPE
) => {
    if (account_type === "GUEST" && !displayName)
        return "Display name is required";
};
export const validateNote = (note: string, hasNote: boolean) => {
    if (hasNote && note.length < 10)
        return "Note should be at least 10 characters";
    if (note.length > TRANSACTION_NOTE_MAX_LENGTH)
        return `Note should not exceed ${TRANSACTION_NOTE_MAX_LENGTH} characters`;
};
