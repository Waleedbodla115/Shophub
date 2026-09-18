
"use strict";


/* =========================================================
   SHOPHUB REGISTER
========================================================= */


// =========================================================
// CONFIG
// =========================================================

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://shophub-bice.vercel.app";


const API =
    `${API_BASE_URL}/api/auth/register`;


// =========================================================
// DOM ELEMENTS
// =========================================================

const form =
    document.getElementById("registerForm");

const message =
    document.getElementById("message");

const btn =
    document.getElementById("registerBtn");

const btnText =
    document.getElementById("registerBtnText");

const btnIcon =
    document.getElementById("registerBtnIcon");

const password =
    document.getElementById("password");

const confirm =
    document.getElementById("confirmPassword");

const strength =
    document.getElementById("strength");

const toggle =
    document.getElementById("passwordToggle");


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(
    text,
    type = "error"
) {

    if (!message) {
        return;
    }

    message.textContent = text;

    message.className =
        `message ${type}`;

    message.hidden = false;

}


// =========================================================
// LOADING STATE
// =========================================================

function loading(isLoading) {

    if (btn) {
        btn.disabled = isLoading;
    }


    if (btnText) {

        btnText.textContent =
            isLoading
                ? "Creating Account..."
                : "Create Account";

    }


    if (btnIcon) {

        btnIcon.className =
            isLoading
                ? "fas fa-spinner fa-spin"
                : "fas fa-arrow-right";

    }

}


// =========================================================
// SAVE AUTH DATA
// =========================================================

function saveAuth(data) {

    if (!data || !data.token) {
        return false;
    }


    try {

        localStorage.setItem(
            "authToken",
            data.token
        );


        localStorage.setItem(
            "authUser",
            JSON.stringify(data.user)
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
// PASSWORD STRENGTH
// =========================================================

function updateStrength() {

    if (!password || !strength) {
        return;
    }


    const p =
        password.value;


    let text =
        "Use at least 6 characters.";


    if (p.length >= 6) {

        text =
            "Good password length.";

    }


    if (
        p.length >= 10 &&
        /[A-Z]/.test(p) &&
        /[0-9]/.test(p)
    ) {

        text =
            "Strong password.";

    }


    strength.textContent =
        text;

}


// =========================================================
// PASSWORD INPUT
// =========================================================

if (password) {

    password.addEventListener(
        "input",
        updateStrength
    );

}


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

if (toggle && password) {

    toggle.addEventListener(
        "click",
        () => {

            const isPassword =
                password.type === "password";


            password.type =
                isPassword
                    ? "text"
                    : "password";


            const icon =
                toggle.querySelector("i");


            if (icon) {

                icon.className =
                    isPassword
                        ? "fas fa-eye-slash"
                        : "fas fa-eye";

            }


            toggle.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        }
    );

}


// =========================================================
// REGISTER
// =========================================================

if (form) {

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (message) {
                message.hidden = true;
            }


            const name =
                document
                    .getElementById("name")
                    ?.value
                    .trim() || "";


            const email =
                document
                    .getElementById("email")
                    ?.value
                    .trim()
                    .toLowerCase() || "";


            const p =
                password
                    ? password.value
                    : "";


            const c =
                confirm
                    ? confirm.value
                    : "";


            // -------------------------------------------------
            // VALIDATION
            // -------------------------------------------------

            if (name.length < 2) {

                showMessage(
                    "Please enter your full name."
                );

                return;

            }


            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email
                )
            ) {

                showMessage(
                    "Please enter a valid email address."
                );

                return;

            }


            if (p.length < 6) {

                showMessage(
                    "Password must be at least 6 characters."
                );

                return;

            }


            if (p !== c) {

                showMessage(
                    "Passwords do not match."
                );

                return;

            }


            // -------------------------------------------------
            // START LOADING
            // -------------------------------------------------

            loading(true);


            try {

                console.log(
                    "📝 ShopHub Registration Starting..."
                );


                console.log(
                    "🌐 Register API:",
                    API
                );


                // -------------------------------------------------
                // API REQUEST
                // -------------------------------------------------

                const response =
                    await fetch(
                        API,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name: name,
                                email: email,
                                password: p
                            })
                        }
                    );


                // -------------------------------------------------
                // READ RESPONSE
                // -------------------------------------------------

                const data =
                    await response
                        .json()
                        .catch(
                            () => ({})
                        );


                console.log(
                    "📡 Registration Response:",
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
                        "Registration failed."
                    );

                }


                // -------------------------------------------------
                // SAVE AUTH
                // -------------------------------------------------

                const saved =
                    saveAuth(data);


                if (!saved) {

                    throw new Error(
                        "Account created, but login session could not be saved."
                    );

                }


                // -------------------------------------------------
                // SUCCESS
                // -------------------------------------------------

                showMessage(
                    "Account created successfully. Redirecting to ShopHub...",
                    "success"
                );


                console.log(
                    "✅ Registration Successful"
                );


                // -------------------------------------------------
                // REDIRECT
                // -------------------------------------------------

                setTimeout(
                    () => {

                        window.location.href =
                            "../shop/index.html";

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "❌ Registration Error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to create account."
                );


            } finally {

                loading(false);

            }

        }
    );

}


// =========================================================
// INITIALIZE
// =========================================================

updateStrength();


console.log(
    "🚀 ShopHub Register Page Ready"
);


console.log(
    "🌐 Backend:",
    API_BASE_URL
);

