const input = document.querySelector("input");
const count = document.querySelector(".count");


input.addEventListener("keyup", () => {
    count.innerHTML = input.value.length;
});