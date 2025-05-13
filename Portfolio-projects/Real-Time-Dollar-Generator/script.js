const amountInput = document.querySelector(".amount__value");
const timeSelect = document.querySelector(".time__select");
const counterValue = document.querySelector(".counter__value");
const counterStart = document.querySelector(".counter__button--start");
const counterStop = document.querySelector(".counter__button--stop");
const counterReset = document.querySelector(".counter__reset-button");

let earnings = 0;
let intervalId = null;

// Convert selected time period to seconds
function getSecondsFromPeriod(period) {
  switch (period) {
    case "daily":
      return 86400;
    case "weekly":
      return 604800;
    case "monthly":
      return 2592000; // ~30 days
    case "yearly":
      return 31536000;
    default:
      return 86400;
  }
}
// Start counting earnings
counterStart.addEventListener("click", () => {
  const amount = parseFloat(amountInput.value);
  const period = timeSelect.value;

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount greater than 0.");
    return;
  }

  const totalSeconds = getSecondsFromPeriod(period);
  const perSecond = amount / totalSeconds;

  clearInterval(intervalId);
  intervalId = setInterval(() => {
    earnings += perSecond;
    counterValue.textContent = `$${earnings.toFixed(5)}`;
  }, 1000);
});

// Stop counting
counterStop.addEventListener("click", () => {
  clearInterval(intervalId);
});

// Reset counter
counterReset.addEventListener("click", () => {
  clearInterval(intervalId);
  earnings = 0;
  counterValue.textContent = "$0.00";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    counterStart.click();
  }
  if (event.key === " ") {
    counterStop.click();
  }
});
