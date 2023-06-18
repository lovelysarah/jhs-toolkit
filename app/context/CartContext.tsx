import type { ReactNode } from "react";
import React, { createContext, useState } from "react";

type CartContextProps = {
    diffs: { [key: string]: number };
    updateDiffs: (newDiffs: { [key: string]: number }) => void;
};

const CartContext = createContext<CartContextProps | undefined>(undefined);

// Create CartContextProvider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [diffs, setDiffs] = useState<{ [key: string]: number }>({});

    const updateDiffs = (newDiffs: { [key: string]: number }) => {
        setDiffs((prev) => {
            const adjustedDiffs = Object.keys(newDiffs).reduce((acc, key) => {
                console.log({ key, acc });
                if (!prev[key]) {
                    acc[key] = newDiffs[key];
                    return acc;
                }
                acc[key] = acc[key] + newDiffs[key];
                return acc;
            }, prev);
            // Add new diffs to existing diffs
            return { ...prev, ...adjustedDiffs };
        });
    };

    return (
        <CartContext.Provider value={{ diffs, updateDiffs }}>
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
