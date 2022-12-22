const btn = document.querySelector('.btn');
const on = document.querySelector(".fa-thermometer-quarter")
const off = document.querySelector(".fa-user-circle")

btn.addEventListener("click", ()=> {
    document.body.classList.toggle("dark");
})