import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Home from "./pages/Home";
import CreateQuizPage from "./pages/CreateQuizPage";
import HostPage from "./pages/HostPage";
import PlayPage from "./pages/PlayPage";
import FinishedPage from "./pages/FinishedPage";
import DashboardPage from "./pages/DashboardPage";
import SuccessPage from "./pages/SuccessPage";
import AdminPage from "./pages/AdminPage";

import SuperadminLoginPage from "./pages/SuperadminLoginPage";
import SuperadminDashboardPage from "./pages/SuperadminDashboardPage";

import SuperadminProtectedRoute from "./components/superadmin/SuperadminProtectedRoute";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/admin", element: <AdminPage /> },
  { path: "/create", element: <CreateQuizPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/success", element: <SuccessPage /> },
  { path: "/terms", element: <Terms /> },
  { path: "/privacy", element: <Privacy /> },

  { path: "/host/:groupId", element: <HostPage /> },
  { path: "/play/:groupId", element: <PlayPage /> },
  { path: "/finished/:groupId", element: <FinishedPage /> },

  // Superadmin
  { path: "/superadmin", element: <SuperadminLoginPage /> },
  {
    path: "/superadmin/dashboard",
    element: (
      <SuperadminProtectedRoute>
        <SuperadminDashboardPage />
      </SuperadminProtectedRoute>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
