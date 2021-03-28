import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (cartProduct) {
        if (stock.amount > cartProduct.amount) {
          const updatedCart = cart.map(cartItem => {
            if (cartItem.id === productId) {
              return { ...cartItem, amount: cartItem.amount + 1 };
            }
            
            return cartItem;
          });

          setCart(updatedCart);

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          toast.success('Adicionado');
          return;
        } 
        
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data: product } = await api.get<Product>(`products/${productId}`);

      if (stock.amount > 0) {
        setCart(state => [...state, { ...product, amount: 1 }]);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(
          [...cart, {...product, amount: 1}]
        ));

        toast.success('Adicionado');
        return;
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.some(cartItem => cartItem.id === productId)) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(cartItem => cartItem.id !== productId);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data } = await api.get(`/stock/${productId}`);

      const productAmount = data.amount;
      const productStock = amount > productAmount;

      if (productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!cart.some(cartItem => cartItem.id === productId)) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const updatedCart = cart.map(cartItem => {
        if (cartItem.id === productId) {
          return { ...cartItem, amount };
        }

        return cartItem;
      });

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
