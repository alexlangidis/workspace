// VARIABLES
const modal = document.querySelector(".modal");
const openbtn = document.querySelector(".btn");
const closebtn = document.querySelector(".close");

openbtn.addEventListener("click", openModal);
closebtn.addEventListener("click", closeModal);
modal.addEventListener("click", closeModal);


// OPEN MODAL
function openModal(e) {
  e.preventDefault();
  modal.style.display = "block";
}

// CLOSE MODAL
function closeModal() {
  modal.style.display = "none";
}