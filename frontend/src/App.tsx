import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminPlacesPage from "./pages/admin/AdminPlacesPage";
import PlaceFormPage from "./pages/admin/PlaceFormPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import PlaceDetailsPage from "./pages/PlaceDetailsPage";
import PlanPage from "./pages/PlanPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="places/:id" element={<PlaceDetailsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route
          path="plan"
          element={
            <RequireAuth>
              <PlanPage />
            </RequireAuth>
          }
        />
        <Route
          path="plan/:planId"
          element={
            <RequireAuth>
              <PlanPage />
            </RequireAuth>
          }
        />

        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/places" replace />} />
          <Route path="places" element={<AdminPlacesPage />} />
          <Route path="places/new" element={<PlaceFormPage />} />
          <Route path="places/:id/edit" element={<PlaceFormPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
