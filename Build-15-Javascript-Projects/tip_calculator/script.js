const btn = document.querySelector(".btn");
const bill = document.querySelector(".bill");
const rate = document.querySelector(".rate");
const tip = document.querySelector(".tip");
const total = document.querySelector(".total");
const error = document.querySelector(".error");
const reset = document.querySelector(".reset");

const calculateTip = () => {
    const billValue = bill.value;
    const rateValue = rate.value;

    const tip_amount = (billValue * rateValue);
    tip.innerHTML = `Tip Amount: $${tip_amount}`

    const total_amount = Number(billValue) + Number(tip_amount);
    total.innerHTML = `Total Amount: $${total_amount}`


   if (billValue === "" || rateValue == "") {
        error.style.display = "block";
        error.innerHTML = `Please enter bill and rate service.`;
    } else if (isNaN(billValue)){
        error.style.display = "block";
        error.innerHTML = `Please enter a number`;
    } else {
        error.style.display = "none";
    }
}

btn.addEventListener("click", calculateTip);

reset.addEventListener("click", ()=>{
    document.getElementById("myForm").reset();
    error.style.display = "none";
    tip.innerHTML = `Tip Amount: $0`;
    total.innerHTML = `Total Amount: $0`;
});

