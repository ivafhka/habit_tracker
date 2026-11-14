import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Habits from "./pages/Habits.jsx";
import EditHabit from "./pages/EditHabit.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

const AUTH_PAGES = ["/login", "/register"];

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="loading">Загрузка...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const showHeader = !AUTH_PAGES.includes(pathname);

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/habits" element={<RequireAuth><Habits /></RequireAuth>} />
        <Route path="/edit/:habitId" element={<RequireAuth><EditHabit /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
