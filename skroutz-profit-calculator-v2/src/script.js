$(document).ready(function () {
  const posostoSelect = $("#pososto");
  const adsToggle = $("#ads-toggle");
  const fulfilledSelect = $("#fulfilled");
  const coinsToggle = $("#coins-toggle");

  const withoutAdsOptions = [
    { value: "0.2", label: "20.00%" },
    { value: "0.18", label: "18.00%" },
    { value: "0.17", label: "17.00%" },
    { value: "0.16", label: "16.00%" },
    { value: "0.14", label: "14.00%" },
    { value: "0.13", label: "13.00%" },
    { value: "0.12", label: "12.00%" },
    { value: "0.105", label: "10.50%" },
  ];

  const withAdsOptions = [
    { value: "0.285", label: "28.50%" },
    { value: "0.26", label: "26.00%" },
    { value: "0.20", label: "20.00%" },
    { value: "0.18", label: "18.00%" },
    { value: "0.16", label: "16.00%" },
    { value: "0.155", label: "15.50%" },
  ];

  const coinsFulfilledOptions = [
    { value: "", label: "No Cost / No Coins" },
    { value: "0.35", label: "0.25 + 0.10 coins" },
    { value: "0.60", label: "0.50 + 0.10 coins" },
    { value: "1.10", label: "1.00 + 0.10 coins" },
    { value: "2.10", label: "2.00 + 0.10 coins" },
  ];

  const noCoinsFulfilledOptions = [
    { value: "", label: "No Cost / No Coins" },
    { value: "0.25", label: "0.25" },
    { value: "0.50", label: "0.50" },
    { value: "1", label: "1.00" },
    { value: "2", label: "2.00" },
  ];

  const loadSelectOptions = (selectElement, options, defaultValue) => {
    selectElement.empty();
    options.forEach(({ value, label }) => {
      const optionEl = $("<option>").attr("value", value).text(label);
      selectElement.append(optionEl);
    });
    if (defaultValue !== undefined) {
      selectElement.val(defaultValue);
    }
  };

  const refreshOptions = () => {
    const useAds = adsToggle.is(":checked");
    const defaultValue = useAds ? "0.26" : "0.16";
    loadSelectOptions(
      posostoSelect,
      useAds ? withAdsOptions : withoutAdsOptions,
      defaultValue
    );
  };

  const refreshFulfilledOptions = () => {
    const useCoins = coinsToggle.is(":checked");
    const defaultValue = useCoins ? "0.35" : "0.25";
    loadSelectOptions(
      fulfilledSelect,
      useCoins ? coinsFulfilledOptions : noCoinsFulfilledOptions,
      defaultValue
    );
  };

  adsToggle.on("change", refreshOptions);
  coinsToggle.on("change", refreshFulfilledOptions);

  refreshOptions();
  refreshFulfilledOptions();

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
