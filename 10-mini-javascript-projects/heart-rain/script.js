const start = document.querySelector("#start");
const stop1 = document.querySelector("#stop");


function heartRain() {
    const heart = document.createElement('div');
    heart.classList.add('heart');

    heart.innerHTML = "❤️"
    heart.style.left = Math.random() *100 + "vw"
    heart.style.animationDuration = Math.random() *2 + 3 + "s";

    document.body.appendChild(heart);

    setTimeout(() => {
        heart.remove();
    }, 5000);

    
} 

const runtim = setInterval(heartRain, 300);

start.addEventListener("click", ()=> {
    setTimeout(() => {
        document.location.reload();
      }, 1000);
});

stop1.addEventListener("click", ()=> {
    clearInterval(runtim);
});