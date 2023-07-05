import type { Transaction } from "@prisma/client";

export enum CHECKOUT_ERROR_MESSAGES {
    NO_STOCK = "Not enough stock left, your cart was adjusted. You can try submitting again.",
    SERVER_ERROR = "Server error, please try again later",
}

export enum CART_ACTION {
    ADD = "ADD",
    REMOVE = "REMOVE",
    CLEAR = "CLEAR",
}

export enum CHECKOUT_TYPE {
    PERMANENT = "PERMANENT",
    TEMPORARY = "TEMPORARY",
}

export type CreateTxSuccessData = {
    transactions: Pick<Transaction, "id" | "created_at">[];
};
export type ResolveTxSuccessData = {
    transactions: Pick<Transaction, "id" | "status" | "resolved_at">[];
};

export enum CREATE_TX_STATUS {
    SUCCESS = "CREATE_TX_SUCCESS",
    FAILURE = "CREATE_TX_FAILURE",
}

export enum RESOLVE_TX_STATUS {
    SUCCESS = "RESOLVE_TX_SUCCESS",
    FAILURE = "RESOLVE_TX_FAILURE",
}

export type TxFailure = {
    type: RESOLVE_TX_STATUS.FAILURE | CREATE_TX_STATUS.FAILURE;
    message: string;
};

export type ResolveTxResult = {
    type: RESOLVE_TX_STATUS.SUCCESS;
    data: ResolveTxSuccessData;
};

export type CreateTxResult = {
    type: CREATE_TX_STATUS.SUCCESS;
    data: CreateTxSuccessData;
};

type TX_RESULT_TYPE = ResolveTxResult | CreateTxResult;

export type TxSuccess<T extends TX_RESULT_TYPE> = {
    message: string;
} & T;

export type TxResult<T extends TX_RESULT_TYPE> = TxSuccess<T> | TxFailure;
