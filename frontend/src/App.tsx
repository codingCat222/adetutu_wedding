import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AccessCodePage from "./pages/AccessCodePage";
import RsvpPage from "./pages/RsvpPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import { AuthProvider, RequireAdmin } from "./admin/AuthContext";
import AdminLayout from "./admin/AdminLayout";
import AdminLoginPage from "./admin/LoginPage";
import CodesPage from "./admin/CodesPage";
import GuestsPage from "./admin/GuestsPage";
import GuestDetailPage from "./admin/GuestDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/invitation" element={<AccessCodePage />} />
        <Route path="/rsvp" element={<RsvpPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />

        <Route path="/admin" element={<AuthProvider><AdminRoutes /></AuthProvider>}>
          <Route path="login" element={<AdminLoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="guests" replace />} />
              <Route path="codes" element={<CodesPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="guests/:id" element={<GuestDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { Outlet } from "react-router-dom";
function AdminRoutes() {
  return <Outlet />;
}
