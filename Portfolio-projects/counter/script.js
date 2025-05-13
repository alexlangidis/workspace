const counterValue = document.querySelector(".counter__value");
const counterReset = document.querySelector(".counter__reset-button");
const counterIncrease = document.querySelector(".counter__button--increase");
const counterDecrease = document.querySelector(".counter__button--decrease");
const counterTitle = document.querySelector(".counter__title");
const versionLite = document.querySelector(".version__lite");
const versionPro = document.querySelector(".version__pro");

let counter = 0;
let user = "regular";

function resetCounter() {
  counter = 0;
  updateCounterDisplay();
  counterTitle.textContent = `Fancy Counter`;
}

function updateCounterDisplay() {
  counterValue.textContent = counter;
}

function setUserVersion(type) {
  resetCounter();
  versionLite.classList.remove("active");
  versionPro.classList.remove("active");

  if (type === "pro") {
    versionPro.classList.add("active");
    user = "pro";
  } else {
    versionLite.classList.add("active");
    user = "regular";
  }
}

versionLite.addEventListener("click", () => setUserVersion("regular"));
versionPro.addEventListener("click", () => setUserVersion("pro"));

counterIncrease.addEventListener("click", () => {
  if (counter >= 5 && user !== "pro") {
    counterTitle.innerHTML = `Limit! Buy <b>Pro</b> Version For > 5`;
    return;
  }

  counter++;
  updateCounterDisplay();
  if (counter === 5 && user !== "pro") {
    counterTitle.innerHTML = `Limit! Buy <b>Pro</b> Version For > 5`;
  } else {
    counterTitle.textContent = "Fancy Counter";
  }
});

counterDecrease.addEventListener("click", () => {
  counter--;
  updateCounterDisplay();
  if (counter < 0) {
    counter = 0;
    counterValue.textContent = 0;
  }

  if (counter < 5) {
    counterTitle.textContent = `Fancy Counter`;
  }
});

counterReset.addEventListener("click", resetCounter);

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    counterIncrease.click();
  } else if (event.key === "ArrowDown") {
    counterDecrease.click();
  } else if (event.key === "r") {
    counterReset.click();
  }
});
