export enum CHECKOUT_ERROR_MESSAGES {
    NO_STOCK = "Not enough stock left",
    SERVER_ERROR = "Server error, please try again later",
}
export type CheckoutFailure = {
    type: "CHECKOUT_FAILURE";
    message: string;
};

export type CheckoutSuccess<T> = {
    type: "CHECKOUT_SUCCESS";
    message: string;
    data: T;
};

export type CheckoutResult<T> = CheckoutSuccess<T> | CheckoutFailure;

export enum CART_ACTION {
    ADD = "ADD",
    REMOVE = "REMOVE",
    CLEAR = "CLEAR",
}

export enum CHECKOUT_TYPE {
    PERMANENT = "PERMANENT",
    TEMPORARY = "TEMPORARY",
}
