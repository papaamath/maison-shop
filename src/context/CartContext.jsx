import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(product) {
    const produitNormalise = {
      id: product.id,
      nom: product.nom || product.Nom || "",
      prix: Number(product.prix || product.Prix || 0),
      categorie: product.categorie || product.Cathégorie || product.Categorie || "",
      description: product.description || product.Description || "",
      image: product.image || product.Image || "",
      stock: Number(product.stock || product.Stock || 0),
    };

    setCart(prev => {
      const existing = prev.find(i => i.id === produitNormalise.id);
      return existing
        ? prev.map(i =>
            i.id === produitNormalise.id
              ? { ...i, qty: i.qty + 1 }
              : i
          )
        : [...prev, { ...produitNormalise, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function updateQty(id, delta) {
    setCart(prev =>
      prev.map(i =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce((a, i) => a + (Number(i.prix) * i.qty), 0);
  const count = cart.reduce((a, i) => a + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}