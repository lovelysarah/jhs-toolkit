export const countItemsInCart = (cart: string[]): { [key: string]: number } =>
    cart.reduce((acc: any, item) => {
        if (!acc[item]) {
            acc[item] = 1;
        } else {
            acc[item]++;
        }
        return acc;
    }, {});
