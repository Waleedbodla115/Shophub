"use strict";

/* =========================================================
   SHOPHUB ADMIN LOGIN
========================================================= */

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://shophub-bice.vercel.app/api";


/* =========================================================
   ELEMENTS
========================================================= */

const loginForm =
    document.getElementById("adminLoginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

/*
 * IMPORTANT:
 * HTML uses id="loginSpinner"
 */
const loginLoader =
    document.getElementById("loginSpinner");

const loginMessage =
    document.getElementById("loginMessage");


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(message, type = "error") {

    if (!loginMessage) {

        console.error(message);

        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        `login-message ${type}`;
}


/* =========================================================
   CLEAR MESSAGE
========================================================= */

function clearMessage() {

    if (!loginMessage) {

        return;
    }

    loginMessage.textContent = "";

    loginMessage.className =
        "login-message";
}


/* =========================================================
   PASSWORD SHOW / HIDE
========================================================= */

if (
    togglePassword &&
    passwordInput
) {

    togglePassword.addEventListener(
        "click",
        () => {

            const showingPassword =
                passwordInput.type === "password";


            passwordInput.type =
                showingPassword
                    ? "text"
                    : "password";


            togglePassword.innerHTML =
                showingPassword

                    ? '<i class="fas fa-eye-slash"></i>'

                    : '<i class="fas fa-eye"></i>';


            togglePassword.setAttribute(
                "aria-label",
                showingPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}


/* =========================================================
   LOADING STATE
========================================================= */

function setLoading(loading) {

    /* -----------------------------------------------------
       Disable / enable login button
    ----------------------------------------------------- */

    if (loginButton) {

        loginButton.disabled =
            loading;

    }


    /* -----------------------------------------------------
       Button text
    ----------------------------------------------------- */

    if (loginButtonText) {

        loginButtonText.style.display =
            loading
                ? "none"
                : "inline";

    }


    /* -----------------------------------------------------
       Spinner

       IMPORTANT:
       HTML has #loginSpinner
    ----------------------------------------------------- */

    if (loginLoader) {

        loginLoader.style.display =
            loading
                ? "inline"
                : "none";

    }

}


/* =========================================================
   CHECK REQUIRED ELEMENTS
========================================================= */

if (!loginForm) {

    console.error(
        "❌ Admin login form #adminLoginForm was not found."
    );

}


if (!emailInput) {

    console.error(
        "❌ Email input #email was not found."
    );

}


if (!passwordInput) {

    console.error(
        "❌ Password input #password was not found."
    );

}


if (!loginButton) {

    console.error(
        "❌ Login button #loginButton was not found."
    );

}


/* =========================================================
   ADMIN LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            clearMessage();


            /* =================================================
               GET FORM VALUES
            ================================================= */

            const email =
                emailInput
                    ? emailInput.value
                        .trim()
                        .toLowerCase()
                    : "";


            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            /* =================================================
               BASIC VALIDATION
            ================================================= */

            if (!email || !password) {

                showMessage(
                    "Please enter your admin email and password."
                );

                return;
            }


            /* =================================================
               START LOADING
            ================================================= */

            setLoading(true);


            try {

                console.log(
                    "🔐 Admin login attempt:",
                    email
                );


                /* =================================================
                   SEND LOGIN REQUEST
                ================================================= */

                const response =
                    await fetch(
                        `${API_BASE_URL}/auth/login`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );


                /* =================================================
                   READ SERVER RESPONSE
                ================================================= */

                let data = {};


                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    console.error(
                        "❌ JSON Response Error:",
                        jsonError
                    );

                    throw new Error(
                        "Server returned an invalid response."
                    );

                }


                console.log(
                    "🔐 Login response:",
                    data
                );


                /* =================================================
                   CHECK SERVER RESPONSE
                ================================================= */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Invalid email or password."
                    );

                }


                /* =================================================
                   CHECK TOKEN
                ================================================= */

                if (!data.token) {

                    throw new Error(
                        "Authentication token was not returned by the server."
                    );

                }


                /* =================================================
                   CHECK USER
                ================================================= */

                if (!data.user) {

                    throw new Error(
                        "User information was not returned by the server."
                    );

                }


                /* =================================================
                   CHECK ADMIN STATUS
                ================================================= */

                if (
                    data.user.isAdmin !== true
                ) {

                    throw new Error(
                        "Access denied. This account is not an administrator."
                    );

                }


                /* =================================================
                   SAVE AUTHENTICATION SESSION
                ================================================= */

                /*
                 * Main keys used by Admin Dashboard
                 */

                localStorage.setItem(
                    "authToken",
                    data.token
                );


                localStorage.setItem(
                    "authUser",
                    JSON.stringify(
                        data.user
                    )
                );


                /*
                 * Compatibility keys
                 */

                localStorage.setItem(
                    "shophub_token",
                    data.token
                );


                localStorage.setItem(
                    "adminToken",
                    data.token
                );


                localStorage.setItem(
                    "shophub_admin",
                    JSON.stringify(
                        data.user
                    )
                );


                /* =================================================
                   VERIFY SAVED SESSION
                ================================================= */

                console.log(
                    "✅ Admin token saved:",
                    !!localStorage.getItem(
                        "authToken"
                    )
                );


                console.log(
                    "✅ Admin user saved:",
                    JSON.parse(
                        localStorage.getItem(
                            "authUser"
                        ) || "null"
                    )
                );


                /* =================================================
                   SUCCESS MESSAGE
                ================================================= */

                showMessage(
                    "Admin login successful. Opening dashboard...",
                    "success"
                );


                console.log(
                    "✅ Admin authenticated:",
                    data.user
                );


                /* =================================================
                   REDIRECT TO ADMIN DASHBOARD
                ================================================= */

                setTimeout(
                    () => {

                        window.location.href =
                            "../admin/index.html";

                    },
                    700
                );

            }


            /* =================================================
               ERROR HANDLING
            ================================================= */

            catch (error) {

                console.error(
                    "❌ Admin Login Error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to login. Please try again."
                );

            }


            /* =================================================
               STOP LOADING
            ================================================= */

            finally {

                setLoading(false);

            }

        }
    );

}


/* =========================================================
   READY
========================================================= */

console.log(
    "✅ ShopHub Admin Login Ready"
);