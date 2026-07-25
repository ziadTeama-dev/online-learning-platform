(function () {
  "use strict";

  /* ---------------- toast ---------------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(message, duration) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, duration || 2800);
  }

  /* ---------------- field error helpers ---------------- */
  function setError(groupId, errorId, message) {
    var group = document.getElementById(groupId);
    var error = document.getElementById(errorId);
    if (group) {
      group.classList.add("has-error");
      var input = group.querySelector("input");
      if (input) input.setAttribute("aria-invalid", "true");
    }
    if (error) {
      error.querySelector("span").textContent = message;
      error.classList.add("show");
    }
  }
  function clearError(groupId, errorId) {
    var group = document.getElementById(groupId);
    var error = document.getElementById(errorId);
    if (group) {
      group.classList.remove("has-error");
      var input = group.querySelector("input");
      if (input) input.removeAttribute("aria-invalid");
    }
    if (error) {
      error.classList.remove("show");
      error.querySelector("span").textContent = "";
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* ---------------- password visibility ---------------- */
  document.querySelectorAll(".toggle-visibility").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.getAttribute("data-target"));
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!showing));
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      btn.innerHTML = showing
        ? '<svg><use href="#icon-eye"></use></svg>'
        : '<svg><use href="#icon-eye-off"></use></svg>';
    });
  });

  /* ---------------- password strength meter ---------------- */
  var signupPassword = document.getElementById("signupPassword");
  var strengthWrap = document.getElementById("strengthWrap");
  var strengthFill = document.getElementById("strengthFill");
  var strengthLabel = document.getElementById("strengthLabel");

  function scorePassword(value) {
    if (!value) return 0;
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }

  signupPassword.addEventListener("input", function () {
    var value = signupPassword.value;
    if (!value) {
      strengthWrap.style.display = "none";
      return;
    }
    strengthWrap.style.display = "block";
    var score = scorePassword(value);
    var pct = [15, 40, 65, 85, 100][score];
    var labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
    var colors = ["#E4483F", "#E4483F", "#F79009", "#2F5DFF", "#17A672"];
    strengthFill.style.width = pct + "%";
    strengthFill.style.backgroundColor = colors[score];
    strengthLabel.textContent = "Password strength: " + labels[score];
    strengthLabel.style.color = colors[score];
    // re-check confirm match live
    validateConfirmLive();
  });

  function validateConfirmLive() {
    var confirm = document.getElementById("signupConfirm");
    if (confirm.value && confirm.value !== signupPassword.value) {
      setError("signupConfirmGroup", "signupConfirmError", "Passwords don't match.");
    } else {
      clearError("signupConfirmGroup", "signupConfirmError");
    }
  }
  document.getElementById("signupConfirm").addEventListener("input", validateConfirmLive);

  /* ---------------- mode switching ---------------- */
  var card = document.getElementById("authCard");
  var loginWrap = document.getElementById("loginWrap");
  var signupWrap = document.getElementById("signupWrap");
  var panelHeadline = document.getElementById("panelHeadline");
  var panelSub = document.getElementById("panelSub");

  var copy = {
    login: {
      headline: "Welcome back!",
      sub: "Sign in to continue your learning journey."
    },
    signup: {
      headline: "Start Learning Today!",
      sub: "Create an account and unlock thousands of courses."
    }
  };

  function refreshCopy(text) {
    panelHeadline.textContent = text.headline;
    panelSub.textContent = text.sub;
    panelHeadline.classList.remove("fade-target");
    panelSub.classList.remove("fade-target");
    // force reflow so the animation can replay
    void panelHeadline.offsetWidth;
    panelHeadline.classList.add("fade-target");
    panelSub.classList.add("fade-target");
  }

  function switchMode(mode) {
    var toShow = mode === "signup" ? signupWrap : loginWrap;
    var toHide = mode === "signup" ? loginWrap : signupWrap;
    toHide.hidden = true;
    toShow.hidden = false;
    toShow.classList.remove("fade-target");
    void toShow.offsetWidth;
    toShow.classList.add("fade-target");
    card.setAttribute("data-mode", mode);
    refreshCopy(copy[mode]);
    var firstField = toShow.querySelector("input");
    if (firstField) firstField.focus({ preventScroll: true });
  }

  document.getElementById("goToSignup").addEventListener("click", function () { switchMode("signup"); });
  document.getElementById("goToLogin").addEventListener("click", function () { switchMode("login"); });

  /* ---------------- non-functional demo actions ---------------- */
  document.getElementById("forgotPasswordBtn").addEventListener("click", function () {
    toast("Password reset isn't wired up in this demo.");
  });
  document.getElementById("loginGoogleBtn").addEventListener("click", function () {
    toast("Connect an OAuth provider to enable Google sign-in.");
  });
  document.getElementById("signupGoogleBtn").addEventListener("click", function () {
    toast("Connect an OAuth provider to enable Google sign-in.");
  });
  document.getElementById("termsLink").addEventListener("click", function (e) {
    e.preventDefault();
    toast("Terms of Use page isn't included in this demo.");
  });
  document.getElementById("privacyLink").addEventListener("click", function (e) {
    e.preventDefault();
    toast("Privacy Policy page isn't included in this demo.");
  });

  /* ---------------- login form ---------------- */
  var loginForm = document.getElementById("loginForm");
  var loginSuccess = document.getElementById("loginSuccess");
  var loginSubmit = document.getElementById("loginSubmit");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("loginEmail");
    var password = document.getElementById("loginPassword");
    var ok = true;

    if (!email.value.trim()) {
      setError("loginEmailGroup", "loginEmailError", "Enter your email.");
      ok = false;
    } else if (!isValidEmail(email.value.trim())) {
      setError("loginEmailGroup", "loginEmailError", "Enter a valid email address.");
      ok = false;
    } else {
      clearError("loginEmailGroup", "loginEmailError");
    }

    if (!password.value) {
      setError("loginPasswordGroup", "loginPasswordError", "Enter your password.");
      ok = false;
    } else {
      clearError("loginPasswordGroup", "loginPasswordError");
    }

    if (!ok) return;

    loginSubmit.disabled = true;
    loginSubmit.classList.add("is-loading");
    loginSubmit.querySelector(".btn-label").textContent = "Logging in...";

    setTimeout(function () {
      loginForm.style.display = "none";
      document.getElementById("loginSuccessMsg").textContent =
        "You've been logged in as " + email.value.trim() + ".";
      loginSuccess.classList.add("show");
    }, 900);
  });

  document.getElementById("loginResetBtn").addEventListener("click", function () {
    loginSuccess.classList.remove("show");
    loginForm.style.display = "";
    loginForm.reset();
    loginSubmit.disabled = false;
    loginSubmit.classList.remove("is-loading");
    loginSubmit.querySelector(".btn-label").textContent = "Login";
    clearError("loginEmailGroup", "loginEmailError");
    clearError("loginPasswordGroup", "loginPasswordError");
  });

  /* ---------------- signup form ---------------- */
  var signupForm = document.getElementById("signupForm");
  var signupSuccess = document.getElementById("signupSuccess");
  var signupSubmit = document.getElementById("signupSubmit");

  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("signupName");
    var email = document.getElementById("signupEmail");
    var password = document.getElementById("signupPassword");
    var confirm = document.getElementById("signupConfirm");
    var agree = document.getElementById("agreeTerms");
    var ok = true;

    if (!name.value.trim()) {
      setError("signupNameGroup", "signupNameError", "Enter your full name.");
      ok = false;
    } else {
      clearError("signupNameGroup", "signupNameError");
    }

    if (!email.value.trim()) {
      setError("signupEmailGroup", "signupEmailError", "Enter your email.");
      ok = false;
    } else if (!isValidEmail(email.value.trim())) {
      setError("signupEmailGroup", "signupEmailError", "Enter a valid email address.");
      ok = false;
    } else {
      clearError("signupEmailGroup", "signupEmailError");
    }

    if (!password.value) {
      setError("signupPasswordGroup", "signupPasswordError", "Create a password.");
      ok = false;
    } else if (password.value.length < 8) {
      setError("signupPasswordGroup", "signupPasswordError", "Use at least 8 characters.");
      ok = false;
    } else {
      clearError("signupPasswordGroup", "signupPasswordError");
    }

    if (!confirm.value) {
      setError("signupConfirmGroup", "signupConfirmError", "Confirm your password.");
      ok = false;
    } else if (confirm.value !== password.value) {
      setError("signupConfirmGroup", "signupConfirmError", "Passwords don't match.");
      ok = false;
    } else {
      clearError("signupConfirmGroup", "signupConfirmError");
    }

    var agreeError = document.getElementById("agreeError");
    if (!agree.checked) {
      agreeError.querySelector("span").textContent = "Please accept the Terms of Use and Privacy Policy.";
      agreeError.classList.add("show");
      ok = false;
    } else {
      agreeError.classList.remove("show");
    }

    if (!ok) return;

    signupSubmit.disabled = true;
    signupSubmit.classList.add("is-loading");
    signupSubmit.querySelector(".btn-label").textContent = "Creating account...";

    setTimeout(function () {
      signupForm.style.display = "none";
      document.getElementById("signupSuccessMsg").textContent =
        "Welcome, " + name.value.trim().split(" ")[0] + "! You can now log in with your new account.";
      signupSuccess.classList.add("show");
    }, 900);
  });

  document.getElementById("signupResetBtn").addEventListener("click", function () {
    signupSuccess.classList.remove("show");
    signupForm.style.display = "";
    signupForm.reset();
    signupSubmit.disabled = false;
    signupSubmit.classList.remove("is-loading");
    signupSubmit.querySelector(".btn-label").textContent = "Sign Up";
    strengthWrap.style.display = "none";
    [
      ["signupNameGroup", "signupNameError"],
      ["signupEmailGroup", "signupEmailError"],
      ["signupPasswordGroup", "signupPasswordError"],
      ["signupConfirmGroup", "signupConfirmError"]
    ].forEach(function (pair) { clearError(pair[0], pair[1]); });
    document.getElementById("agreeError").classList.remove("show");
    switchMode("login");
  });
})();
