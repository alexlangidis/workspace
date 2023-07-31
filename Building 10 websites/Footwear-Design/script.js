const slides = document.querySelectorAll(".slide");
const carousel = document.getElementById("carousel");
const left = document.getElementById("left");
const right = document.getElementById("right");
const logo = document.querySelector('.logo');

const SLIDES_COUNT = slides.length;


let current_slide = 0;

left.addEventListener("click", () => {
    current_slide--;
    if (current_slide < 0) {
        current_slide = SLIDES_COUNT - 1;
    }

    updateCarousel();
});

right.addEventListener("click", () => {
    current_slide++;
    if (current_slide > SLIDES_COUNT -1) {
        current_slide = 0;
    }

    updateCarousel();
});

function updateCarousel() {
    carousel.style.transform = `translateX(${
        -current_slide * slides[0].offsetWidth
    }px)`;

    if(current_slide > 0){
        logo.style.color="black"}
     else {
        logo.style.color="white"
    }

    document.body.style.background = `#${slides[current_slide].getAttribute(
        "data-bg"
    )}`;


}