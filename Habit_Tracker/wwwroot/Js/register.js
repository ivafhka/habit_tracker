
async function register() {

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const error = document.getElementById("error");

    error.innerText = "";

    if (!username || !email || !password) {
        error.innerText = "Fill all fields";
        return;
    }

    try {

        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        if (!res.ok) {
            const text = await res.text();
            error.innerText = text || "Registration failed";
            return;
        }

        const data = await res.json();

        localStorage.setItem("token", data.token);

        window.location.href = "/index.html";

    } catch (e) {
        error.innerText = "Server error";
    }
} 