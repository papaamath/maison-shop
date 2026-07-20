import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(product) {
    const produitNormalise = {
      id: product.id,
      nom: product.nom || product.Nom || "",
      prix: Number(product.prix || product.Prix || 0),
      categorie: product.categorie || product.Cathegorie || "",
      description: product.description || product.Description || "",
      image: product.image || product.Image || "",
      stock: Number(product.stock || product.Stock || 0),
      tailleChoisie: product.tailleChoisie || null,
    };

    setCart(prev => {
      // Si meme produit ET meme taille, augmente la quantite
      const cle = `${produitNormalise.id}_${produitNormalise.tailleChoisie || ""}`;
      const existe = prev.find(i => `${i.id}_${i.tailleChoisie || ""}` === cle);
      if (existe) {
        return prev.map(i =>
          `${i.id}_${i.tailleChoisie || ""}` === cle
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { ...produitNormalise, qty: 1 }];
    });
  }

  function removeFromCart(id, tailleChoisie = null) {
    const cle = `${id}_${tailleChoisie || ""}`;
    setCart(prev => prev.filter(i => `${i.id}_${i.tailleChoisie || ""}` !== cle));
  }

  function updateQty(id, qty, tailleChoisie = null) {
    const cle = `${id}_${tailleChoisie || ""}`;
    if (qty <= 0) {
      removeFromCart(id, tailleChoisie);
      return;
    }
    setCart(prev => prev.map(i =>
      `${i.id}_${i.tailleChoisie || ""}` === cle ? { ...i, qty } : i
    ));
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce((a, i) => a + i.prix * i.qty, 0);
  const count = cart.reduce((a, i) => a + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
