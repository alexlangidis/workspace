const count = document.querySelector('.count');
const add = document.querySelector('.add');
const reset = document.querySelector('.reset');
const sub = document.querySelector('.subtract');

add.addEventListener("click", ()=> {
    count.innerHTML++;
    setColor();
})

sub.addEventListener("click", ()=> {
    count.innerHTML--;
    setColor();
})

reset.addEventListener("click", ()=> {
    count.innerHTML = 0;
    setColor();
})


function setColor() {
    if (count.innerHTML < 0) {
        count.style.color = "orange"
    } else if (count.innerHTML > 0) {
        count.style.color = "yellow"
    } else
        count.style.color = "white"
}