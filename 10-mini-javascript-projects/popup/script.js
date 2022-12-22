const openBtn = document.querySelector("#open");
const closeBtn = document.querySelector("#close");
const popupContainer = document.querySelector(".popup-container");
//  const body = document.querySelector("#body");



openBtn.addEventListener("click", popOpen);
closeBtn.addEventListener("click", popClose);
body.addEventListener("mousedown", popClose);

function popOpen() {
    popupContainer.classList.add('active');
}

function popClose() {
    popupContainer.classList.remove('active');
};