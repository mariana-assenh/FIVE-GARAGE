import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import VehicleDetail from "@/pages/VehicleDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPasword";
import ResetPassword from "@/pages/ResetPassword";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/veiculo/:id" element={<VehicleDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
      <Toaster />
    </>
  );
}