

/* =========================================================
   SHOPHUB LOGIN
========================================================= */


// =========================================================
// CONFIG
// =========================================================

const API_BASE_URL = "http://localhost:5000";

const LOGIN_API =
    `${API_BASE_URL}/api/auth/login`;


// =========================================================
// DOM ELEMENTS
// =========================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const passwordToggle =
    document.getElementById("passwordToggle");

const loginBtn =
    document.getElementById("loginBtn");

const loginBtnText =
    document.getElementById("loginBtnText");

const loginBtnIcon =
    document.getElementById("loginBtnIcon");

const messageBox =
    document.getElementById("message");

const rememberMe =
    document.getElementById("rememberMe");


// =========================================================
// STORAGE KEYS
// =========================================================

const AUTH_TOKEN_KEY = "authToken";

const AUTH_USER_KEY = "authUser";

const REMEMBER_EMAIL_KEY =
    "rememberedEmail";


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(message, type = "error") {

    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;

    messageBox.className =
        `message ${type}`;

    messageBox.hidden = false;

}


// =========================================================
// HIDE MESSAGE
// =========================================================

function hideMessage() {

    if (!messageBox) {
        return;
    }

    messageBox.hidden = true;

    messageBox.textContent = "";

    messageBox.className = "message";

}


// =========================================================
// SET LOADING STATE
// =========================================================

function setLoading(isLoading) {

    if (!loginBtn) {
        return;
    }


    loginBtn.disabled = isLoading;


    if (isLoading) {

        loginBtnText.textContent =
            "Logging in...";

        loginBtnIcon.className =
            "fas fa-spinner fa-spin";

    } else {

        loginBtnText.textContent =
            "Login";

        loginBtnIcon.className =
            "fas fa-arrow-right";

    }

}


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

if (passwordToggle) {

    passwordToggle.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type === "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            const icon =
                passwordToggle.querySelector("i");


            if (icon) {

                icon.className =
                    isPassword
                        ? "fas fa-eye-slash"
                        : "fas fa-eye";

            }


            passwordToggle.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}


// =========================================================
// LOAD REMEMBERED EMAIL
// =========================================================

function loadRememberedEmail() {

    try {

        const savedEmail =
            localStorage.getItem(
                REMEMBER_EMAIL_KEY
            );


        if (
            savedEmail &&
            emailInput
        ) {

            emailInput.value =
                savedEmail;

            if (rememberMe) {
                rememberMe.checked = true;
            }

        }

    } catch (error) {

        console.error(
            "Unable to load remembered email:",
            error
        );

    }

}


// =========================================================
// SAVE REMEMBERED EMAIL
// =========================================================

function handleRememberEmail(email) {

    try {

        if (
            rememberMe &&
            rememberMe.checked
        ) {

            localStorage.setItem(
                REMEMBER_EMAIL_KEY,
                email
            );

        } else {

            localStorage.removeItem(
                REMEMBER_EMAIL_KEY
            );

        }

    } catch (error) {

        console.error(
            "Unable to save remembered email:",
            error
        );

    }

}


// =========================================================
// SAVE AUTH DATA
// =========================================================

function saveAuthData(token, user) {

    try {

        if (!token) {

            throw new Error(
                "Authentication token was not received."
            );

        }


        localStorage.setItem(
            AUTH_TOKEN_KEY,
            token
        );


        localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify(user)
        );


        return true;

    } catch (error) {

        console.error(
            "Unable to save authentication data:",
            error
        );

        return false;

    }

}


// =========================================================
// LOGIN
// =========================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            hideMessage();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            // -------------------------------------------------
            // VALIDATION
            // -------------------------------------------------

            if (!email) {

                showMessage(
                    "Please enter your email address."
                );

                emailInput.focus();

                return;

            }


            if (!password) {

                showMessage(
                    "Please enter your password."
                );

                passwordInput.focus();

                return;

            }


            if (password.length < 6) {

                showMessage(
                    "Password must be at least 6 characters."
                );

                passwordInput.focus();

                return;

            }


            // -------------------------------------------------
            // START LOADING
            // -------------------------------------------------

            setLoading(true);


            try {

                console.log(
                    "🔐 ShopHub Login Starting..."
                );


                // -------------------------------------------------
                // API REQUEST
                // -------------------------------------------------

                const response =
                    await fetch(
                        LOGIN_API,
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


                // -------------------------------------------------
                // READ RESPONSE
                // -------------------------------------------------

                let data = null;


                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    throw new Error(
                        "Invalid response received from server."
                    );

                }


                console.log(
                    "📡 Login Response:",
                    data
                );


                // -------------------------------------------------
                // API ERROR
                // -------------------------------------------------

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Login failed. Please check your credentials."
                    );

                }


                // -------------------------------------------------
                // TOKEN CHECK
                // -------------------------------------------------

                if (!data.token) {

                    throw new Error(
                        "Login successful, but authentication token is missing."
                    );

                }


                // -------------------------------------------------
                // SAVE AUTH
                // -------------------------------------------------

                const saved =
                    saveAuthData(
                        data.token,
                        data.user
                    );


                if (!saved) {

                    throw new Error(
                        "Unable to save login session."
                    );

                }


                // -------------------------------------------------
                // REMEMBER EMAIL
                // -------------------------------------------------

                handleRememberEmail(email);


                // -------------------------------------------------
                // SUCCESS
                // -------------------------------------------------

                showMessage(
                    "Login successful! Redirecting...",
                    "success"
                );


                console.log(
                    "✅ Login Successful"
                );

                console.log(
                    "👤 User:",
                    data.user
                );


                // -------------------------------------------------
                // REDIRECT
                // -------------------------------------------------

                setTimeout(
                    () => {

                        /*
                         * Normal customer:
                         * Go to Shop
                         *
                         * Admin:
                         * Go to Admin Management
                         */

                        if (
                            data.user &&
                            data.user.isAdmin === true
                        ) {

                            window.location.href =
                                "../admin/index.html";

                        } else {

                            window.location.href =
                                "../shop/index.html";

                        }

                    },
                    800
                );


            } catch (error) {

                console.error(
                    "❌ Login Error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to login. Please try again."
                );


            } finally {

                setLoading(false);

            }

        }
    );

}


// =========================================================
// INITIALIZE
// =========================================================

loadRememberedEmail();


console.log(
    "🚀 ShopHub Login Page Ready"
);