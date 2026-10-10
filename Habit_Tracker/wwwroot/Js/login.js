// Очистка полей при загрузке страницы
window.addEventListener('load', () => {
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    
    // Проверка: если уже авторизован - перенаправить на главную
    checkIfLoggedIn();
});

// Проверка авторизации
async function checkIfLoggedIn() {
    const token = localStorage.getItem("token");
    
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            // Пользователь уже авторизован - перенаправляем
            window.location.href = "/index.html";
        }
    } catch (e) {
        // Токен невалиден - ничего не делаем
        console.log("Token validation failed");
    }
}

// Вход в систему
async function login() {
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    const error = document.getElementById("error");

    const email = emailField.value.trim();
    const password = passwordField.value;

    error.innerText = "";

    // Валидация
    if (!email || !password) {
        error.innerText = "Fill all fields";
        return;
    }

    // Базовая проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        error.innerText = "Invalid email format";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        // ✅ ОЧИСТКА ПОЛЕЙ СРАЗУ ПОСЛЕ ЗАПРОСА
        emailField.value = '';
        passwordField.value = '';

        if (!res.ok) {
            const text = await res.text();
            error.innerText = text || "Invalid email or password";
            return;
        }

        const data = await res.json();

        // Сохранение токена
        localStorage.setItem("token", data.token);

        // Перенаправление
        window.location.href = "/index.html";

    } catch (e) {
        console.error("Login error:", e);
        error.innerText = "Server error. Please try again.";
        
        // На случай ошибки тоже очищаем
        emailField.value = '';
        passwordField.value = '';
    }
}

// Поддержка Enter для отправки формы
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
});