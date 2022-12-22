
const btn = document.querySelector("#btn");
const container = document.querySelector(".container");
const rgbColor = document.querySelector("#rgb-color");

btn.addEventListener("click", changeBackground);


function changeBackground() {
    const r = Math.round(Math.random() * 256 );
    const g = Math.round(Math.random() * 256 );
    const b = Math.round(Math.random() * 256 );

    const rgb = document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    const addActive = container.classList.add('active')
    rgbColor.innerHTML =`Your background color is: 🎨 ${rgb}`;
}