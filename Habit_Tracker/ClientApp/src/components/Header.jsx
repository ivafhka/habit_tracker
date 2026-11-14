import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="header">
      <Link to="/" className="header-title" style={{ color: "white", textDecoration: "none" }}>
        Habit_Tracker
      </Link>

      <div className="header-buttons">
        {user ? (
          <>
            <span className="username">{user.username}</span>
            <button onClick={handleLogout} className="btn ghost">Выход</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn orange">Вход</Link>
            <Link to="/register" className="btn ghost">Регистрация</Link>
          </>
        )}
      </div>
    </header>
  );
}
