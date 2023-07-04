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

export type CreateTxFailure = {
    type: "CHECKOUT_FAILURE";
    message: string;
};

export type CreateTxSuccess = {
    type: "CHECKOUT_SUCCESS";
    message: string;
    data: CreateTxSuccessData;
};

export type CreateTxResult = CreateTxSuccess | CreateTxFailure;
