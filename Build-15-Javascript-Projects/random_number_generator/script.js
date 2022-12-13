const count = document.querySelector('.count');
const btn = document.querySelector('.btn');



function generateNumber () {
    const randomNumber = Math.floor(Math.random()*100 ) +1 ;
    count.innerHTML = randomNumber;
}


btn.addEventListener("click", generateNumber);