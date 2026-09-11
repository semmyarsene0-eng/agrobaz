
import { BrowserRouter, Routes, Route } from "react-router-dom";

// ================= COMPONENTS =================
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Commission from "./components/Commission";

// ================= PAGES =================
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import ProductDetails from "./pages/ProductDetails.jsx";
import Suppliers from "./components/Suppliers";
import Contact from "./pages/Contact";
import PriceMap from "./pages/PriceMap";
import AIDoctor from "./pages/AIDoctor";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import BuyerProfile from "./pages/BuyerProfile";
import SellerProfile from "./pages/SellerProfile";

import SellerDashboard from "./pages/SellerDashboard";
import AddProduct from "./pages/AddProduct";
import SellerMessages from "./pages/SellerMessages";
import Checkout from "./pages/Checkout";

import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";

import Revenue from "./pages/Revenue";

// ================= AFFILIATE =================
import AffiliateProducts from "./pages/AffiliateProducts";
import AffiliateDashboard from "./pages/AffiliateDashboard";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/price-map" element={<PriceMap />} />
        <Route path="/ai-doctor" element={<AIDoctor />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* BUYER */}
        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute allowedRole="buyer">
              <Dashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <RoleProtectedRoute allowedRole="buyer">
              <Checkout />
            </RoleProtectedRoute>
          }
        />

        {/* SELLER */}
        <Route
          path="/seller-dashboard"
          element={
            <RoleProtectedRoute allowedRole="seller">
              <SellerDashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/add-product"
          element={
            <RoleProtectedRoute allowedRole="seller">
              <AddProduct />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/seller-messages"
          element={
            <RoleProtectedRoute allowedRole="seller">
              <SellerMessages />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/revenue"
          element={
            <RoleProtectedRoute allowedRole="seller">
              <Revenue />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/commission"
          element={
            <RoleProtectedRoute allowedRole="seller">
              <Commission />
            </RoleProtectedRoute>
          }
        />

        {/* USER */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/tracking" element={<OrderTracking />} />
        <Route path="/order-success" element={<OrderSuccess />} />

        {/* PROFILES */}
        <Route
          path="/seller/:sellerId"
          element={<SellerProfile />}
        />

        <Route
          path="/buyer/:buyerId"
          element={<BuyerProfile />}
        />

        {/* AFFILIATE */}
        <Route
          path="/affiliate-products"
          element={<AffiliateProducts />}
        />

        <Route
          path="/affiliate-dashboard"
          element={<AffiliateDashboard />}
        />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;

