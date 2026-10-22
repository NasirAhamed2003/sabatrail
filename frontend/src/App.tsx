import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import PlaceDetailsPage from "./pages/PlaceDetailsPage";
import PlanPage from "./pages/PlanPage";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="places/:id" element={<PlaceDetailsPage />} />
        <Route path="login" element={<LoginPage />} />

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

        <Route path="admin" element={<Navigate to="/admin/places" replace />} />
        <Route
          path="admin/places"
          element={
            <RequireAdmin>
              <AdminPage tab="places" />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/categories"
          element={
            <RequireAdmin>
              <AdminPage tab="categories" />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
