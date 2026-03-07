document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const role = document.getElementById("role").value;

    if (role === "user") {
      window.location.href = "user.html";
    }
    else if (role === "admin") {
      window.location.href = "admins.html";
    }
    else if (role === "super-admin") {
      window.location.href = "super.html";
    }
    else {
      alert("please select a valid role:");
    }
  });
});