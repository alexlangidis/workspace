const forgot = document.querySelector(".forgot")
const register = document.querySelector(".register")
const login = document.querySelector(".login")
const forgotBtn = document.querySelector(".forgot-link")
const registerBtn = document.querySelector(".register-link")
const loginBtn = document.querySelector(".login-link")
const backBtn = document.querySelector(".backBtn")



registerBtn.addEventListener("click", ()=> {
    register.style.display= "flex";
    login.style.display= "none";
})

loginBtn.addEventListener("click", ()=> {
    login.style.display= "flex";
    register.style.display= "none";
})

forgotBtn.addEventListener("click", ()=> {
    forgot.style.display= "flex";
    login.style.display= "none";
})

backBtn.addEventListener("click", ()=> {
    login.style.display= "flex";
    forgot.style.display= "none";
})