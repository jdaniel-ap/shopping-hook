import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
  const CART_STORAGED = '@RocketShoes:cart';
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_STORAGED);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`/products/${productId}`);
      if (!product.data) throw Error('Erro na adição do produto');
      const filteredItems = cart.filter((item) => item.id !== productId);
      const isOnCart = cart.filter((item) => item.id === productId);
      const availableStock = await api.get(`/stock/${productId}`);
      if (isOnCart.length && availableStock.data.amount === isOnCart[0].amount)
        throw Error('Quantidade solicitada fora de estoque');

      const formattedCart = [
        ...filteredItems,
        {
          ...product.data,
          amount: isOnCart.length ? ++isOnCart[0].amount : 1,
        },
      ];
      setCart(formattedCart);
      localStorage.setItem(CART_STORAGED, JSON.stringify(formattedCart));
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(
          err.message !== 'Quantidade solicitada fora de estoque'
            ? 'Erro na adição do produto'
            : err.message
        );
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const finder = cart.some((product) => product.id === productId);

      if (!finder) throw Error;

      const filter = cart.filter((product) => product.id !== productId);
      setCart(filter);
      localStorage.setItem(CART_STORAGED, JSON.stringify(filter));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const outStockMessage = 'Quantidade solicitada fora de estoque';
    const notExistMessage = 'Erro na alteração de quantidade do produto';
    try {
      const availableStock = await api.get(`/stock/${productId}`);
      if (
        amount < availableStock.data.amount &&
        availableStock.data.amount === 1
      )
        throw new Error(notExistMessage);

      console.log(availableStock);
      const updatedCart = cart.map((product) => {
        if (amount > availableStock.data.amount)
          throw new Error(outStockMessage);
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      setCart(updatedCart);
      localStorage.setItem(CART_STORAGED, JSON.stringify(updatedCart));
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(
          err.message !== outStockMessage ? notExistMessage : outStockMessage
        );
      }
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
