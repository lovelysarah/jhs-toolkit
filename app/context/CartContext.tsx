import React, { ReactNode, createContext, useState } from "react";

type CartContext = {
    count: number;
    update: (count: number) => void;
};

const CartContext = createContext<CartContext | undefined>(undefined);

// Create CartContextProvider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [count, setCount] = useState(0);

    const update = (count: number) => {
        setCount(count);
    };

    return (
        <CartContext.Provider value={{ count, update }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = React.useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
