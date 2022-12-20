const pass = document.querySelector("#password");
const eye = document.querySelector("#eye");


eye.addEventListener("click", ()=> {
    if (eye.classList.contains('fa-eye')){
        pass.setAttribute("type", "text");
        eye.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        pass.setAttribute("type", "password");
        eye.classList.replace("fa-eye-slash", "fa-eye");
    }
});