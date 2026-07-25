// ===============================
// Favorite Button
// ===============================

const favButtons = document.querySelectorAll(".fav-btn");

favButtons.forEach(button => {

    button.addEventListener("click", () => {

        const icon = button.querySelector("i");

        icon.classList.toggle("bi-heart");
        icon.classList.toggle("bi-heart-fill");

    });

});

// ===============================
// Search
// ===============================

const searchInput = document.querySelector(".search-box input");

const courses = document.querySelectorAll(".course-card");

searchInput.addEventListener("keyup", function () {

    let value = this.value.toLowerCase();

    courses.forEach(course => {

        let title = course.querySelector("h4").innerText.toLowerCase();

        if(title.includes(value))
        {
            course.style.display = "block";
        }
        else
        {
            course.style.display = "none";
        }

    });

});

// ===============================
// Active Pagination
// ===============================

const pages = document.querySelectorAll(".pagination button");

pages.forEach(page=>{

    page.addEventListener("click",()=>{

        pages.forEach(btn=>btn.classList.remove("active-page"));

        page.classList.add("active-page");

    });

});

const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector(".sidebar");

menuBtn.addEventListener("click", ()=>{

    sidebar.classList.toggle("show");

});

document.addEventListener("click", (e) => {

    if(
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target)
    ){
        sidebar.classList.remove("show");
    }

});