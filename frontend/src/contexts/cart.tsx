import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

export type Cart = {
    visible: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>
};

export const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState<boolean>(false);

    return (
        <CartContext.Provider value={{ visible: visible, setVisible: setVisible }}>
            {children}
        </CartContext.Provider>
    )
}