const hex = document.querySelector('.hex-color');
const btngen = document.querySelector('.btn-gen');
const body = document.body;

function randomHexColor () {
    const randomColor = Math.random().toString(16).substring(2,8);
    hex.innerHTML = `#${randomColor}`
    body.style.backgroundColor = hex.innerHTML;
    console.log(randomColor);
}

btngen.addEventListener('click', randomHexColor);
