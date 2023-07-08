export type TxItem = {
    id: string;
    name: string;
    quantity: number;
};
export const isTxItem = (data: unknown): data is TxItem => {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    if (!("name" in data) || !("quantity" in data) || !("id" in data)) {
        return false;
    }
    if (
        typeof data.name !== "string" ||
        typeof data.quantity !== "number" ||
        typeof data.id !== "string"
    ) {
        return false;
    }

    return true;
};
