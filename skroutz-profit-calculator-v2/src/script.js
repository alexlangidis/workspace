$(document).ready(function () {
  function caclProfit(e) {
    e.preventDefault();

    const agoraValue = $("#agora").val().replace(/,/g, ".");
    const lianikiValue = $("#lianiki").val().replace(/,/g, ".");
    const posostoValue = $("#pososto").val();
    const fulfilledValue = $("#fulfilled").val();

    if (isNaN(agoraValue) || isNaN(lianikiValue)) {
      $(".error").css("display", "flex");
      $(".error").html(`Βαλτε Τιμ. Αγορας & Τιμ. Λιανικης`);
      return;
    }

    if ($("#checked-checkbox").is(":checked")) {
      const deals2 = Math.abs(Number(lianikiValue * 0.05 - lianikiValue));
      const ypol1 = Number(deals2) * Number(-posostoValue);
      const ypol2 = Number(deals2) + Number(ypol1);
      const ypol3 = Number(ypol2 / 1.24);

      const profit =
        Number(ypol3) - Number(agoraValue) - Number(fulfilledValue / 1.24);
      const roundProfit = profit.toFixed(2);
      $("#profit").html(`${roundProfit}`);

      checkProfit(roundProfit, lianikiValue, agoraValue);
    } else {
      const ypol1 = Number(lianikiValue) * Number(-posostoValue);
      const ypol2 = Number(lianikiValue) + Number(ypol1);
      const ypol3 = Number(ypol2 / 1.24);

      const profit =
        Number(ypol3) - Number(agoraValue) - Number(fulfilledValue / 1.24);
      const roundProfit = profit.toFixed(2);
      $("#profit").html(`${roundProfit}`);

      checkProfit(roundProfit, lianikiValue, agoraValue);
    }
  }

  function checkProfit(roundProfit, lianikiValue, agoraValue) {
    if (lianikiValue === "" || agoraValue === "") {
      $(".error").css("display", "flex");
      $(".error").html(`Βαλτε Τιμ. Αγορας & Τιμ. Λιανικης`);
    } else if (roundProfit < 0) {
      $(".error").css("display", "block");
      $("#profit").css("color", "red");
      $(".error").html(`No Profit`);
    } else if (roundProfit <= 0.7) {
      $(".error").css("display", "block");
      $("#profit").css("color", "red");
      $(".error").html(`Low Profit`);
    } else {
      $("#profit").css("color", "#b2ff00");
      $(".error").css("display", "none");
    }
  }

  $("#btn_calc").click(function (e) {
    e.preventDefault();
    caclProfit(e);
  });

  $("#btn_reset").click(function (e) {
    e.preventDefault();
    $("#form")[0].reset();
    $("#profit").html("0");
  });

  $("body").on("keypress", (e) => {
    if (e.key === "Enter") {
      caclProfit(e);
    }
  });
});
