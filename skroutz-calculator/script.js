const agora = document.querySelector(".agora");
const lianiki = document.querySelector(".lianiki");
const pososto = document.querySelector(".pososto");
const reset = document.querySelector(".reset");
const btn = document.querySelector(".btn");
const profit1 = document.querySelector(".profit1");
const error = document.querySelector(".error");
const input = document.querySelector("input");


function caclProfit (e) {
    e.preventDefault();
    const lianikiValue = lianiki.value.replace(/,/g, ".");
    const agoraValue = agora.value.replace(/,/g, ".");
    const posostoValue = pososto.value;


    const ypol1 = Number(lianikiValue) * Number(-posostoValue);
    const ypol2 = Number(lianikiValue) + Number(ypol1);
    const ypol3 = Number(ypol2 / 1.24);

    const profit = Number(ypol3) - Number(agoraValue);
    const roundProfit = profit.toFixed(2);
    profit1.innerHTML= `${roundProfit}`;




    if (lianikiValue === "" || agoraValue === "") {
        error.style.display = "block";
        error.innerHTML = `Βαλτε Τιμ. Αγορας & Λιανικης`;
    } else if (isNaN((lianikiValue) || isNaN(agoraValue))){
        error.style.display = "block";
        error.innerHTML = `Παρακαλω βαλτε αριθμο`;
    }  else if (roundProfit <= 0.7){
        error.style.display = "block";
        profit1.style.color = "red";
        error.innerHTML = `Low Profit`;
    } else {
        profit1.style.color = "white";
        error.style.display = "none";
    }

}



btn.addEventListener("click", caclProfit);

document.body.addEventListener('keypress', (e) =>{
    if(e.key === "Enter") {
      caclProfit(e);
    }
  });


reset.addEventListener("click", ()=>{
    document.querySelector(".form1").reset();
    profit1.innerHTML= `0`;
    profit1.style.color = "white";
    error.style.display = "none";
});