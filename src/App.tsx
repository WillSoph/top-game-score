import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuizPage from './pages/CreateQuizPage';
import HostPage from './pages/HostPage';
import PlayPage from './pages/PlayPage';
import FinishedPage from './pages/FinishedPage';
import DashboardPage from './pages/DashboardPage';
import SuccessPage from './pages/SuccessPage';
import AdminPage from './pages/AdminPage';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/create', element: <CreateQuizPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/success', element: <SuccessPage /> },
  
  { path: '/host/:groupId', element: <HostPage /> },
  { path: '/play/:groupId', element: <PlayPage /> },
  { path: '/finished/:groupId', element: <FinishedPage /> },
]);

export default function App(){
  return <RouterProvider router={router} />;
}
