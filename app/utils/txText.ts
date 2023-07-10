import { CHECKOUT_TYPE } from "@prisma/client";

export const getAction = (
    checkout_type: CHECKOUT_TYPE,
    capitalized: boolean
) => {
    const txt = checkout_type === CHECKOUT_TYPE.PERMANENT ? "took" : "borrowed";

    if (capitalized) {
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    return txt;
};
