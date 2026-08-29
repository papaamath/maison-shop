import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ClientRoute from "./components/ClientRoute";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Suivi from "./pages/Suivi";
import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminLogin from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminPromos from "./pages/admin/Promos";
import Contact from "./pages/Contact";
import Caisse from "./pages/admin/Caisse"
import Associes from "./pages/admin/Associes";
import Journal from "./pages/admin/Journal";
import StockValeur from "./pages/admin/StockValeur";
import Photocopie from "./pages/admin/Photocopie";
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/suivi" element={<Suivi />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/confirmation" element={<Confirmation />} />

            {/* Routes protégées client */}
            <Route path="/checkout" element={<ClientRoute><Checkout /></ClientRoute>} />

            {/* Routes admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/promos" element={<ProtectedRoute><AdminPromos /></ProtectedRoute>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin/caisse" element={<ProtectedRoute><Caisse /></ProtectedRoute>} />
            <Route path="/admin/associes" element={<ProtectedRoute><Associes /></ProtectedRoute>} />
            <Route path="/admin/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/admin/stock" element={<ProtectedRoute><StockValeur /></ProtectedRoute>} />
            <Route path="/admin/photocopie" element={<ProtectedRoute><Photocopie /></ProtectedRoute>} />
            
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}