import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExist = cart.find((product) => product.id === productId);

      if (productExist) {
        const { amount: productAmount } = productExist;

        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        const productIsAvailble = stock.amount > productAmount;

        if (!productIsAvailble) {
          toast.error("Quantidade solicitada fora de estoque");

          return;
        }

        const updatedAmountCartProduct = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: productAmount + 1 }
            : product
        );

        setCart(updatedAmountCartProduct);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(updatedAmountCartProduct)
        );

        return;
      }

      const { data } = await api.get(`/products/${productId}`);

      const updatedCartProduct = [...cart, { ...data, amount: 1 }];

      setCart(updatedCartProduct);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(updatedCartProduct)
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAlreadyExists = cart.find(
        (product) => product.id === productId
      );

      if (!productAlreadyExists) throw Error();

      const restItems = cart.filter((item) => item.id !== productId);
      setCart(restItems);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(restItems));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const isProductAvailable = stock.amount >= amount;

      if (!isProductAvailable) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      const productExist = cart.find((product) => product.id === productId);

      if (!productExist) throw Error();

      const updtedCartProduct = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart(updtedCartProduct);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(updtedCartProduct)
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
