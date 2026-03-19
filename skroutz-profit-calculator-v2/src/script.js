$(document).ready(function () {
  const posostoSelect = $("#pososto");
  const adsToggle = $("#ads-toggle");
  const fulfilledSelect = $("#fulfilled");
  const fulfilledAutoToggle = $("#fulfilled-auto-toggle");
  const coinsToggle = $("#coins-toggle");
  const lianikiInput = $("#lianiki");
  let autoFulfilledSyncEnabled = true;

  const withoutAdsOptions = [
    { value: "0.2", label: "20.00%" },
    { value: "0.185", label: "18.50%" },
    { value: "0.18", label: "18.00%" },
    { value: "0.165", label: "16.50%" },
    { value: "0.145", label: "14.50%" },
    { value: "0.13", label: "13.00%" },
    { value: "0.11", label: "11.00%" },
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
    { value: "0.50", label: "0.40 + 0.10 coins" },
    { value: "0.85", label: "0.75 + 0.10 coins" },
    { value: "1.30", label: "1.20 + 0.10 coins" },
  ];

  const noCoinsFulfilledOptions = [
    { value: "", label: "No Cost / No Coins" },
    { value: "0.40", label: "0.40" },
    { value: "0.75", label: "0.75" },
    { value: "1.20", label: "1.20" },
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

  const getDefaultFulfilledValue = () =>
    coinsToggle.is(":checked") ? "0.50" : "0.40";

  const getAutoFulfilledValue = () =>
    coinsToggle.is(":checked") ? "0.85" : "0.75";

  const renderAutoFulfilledToggle = () => {
    fulfilledAutoToggle.text(
      autoFulfilledSyncEnabled ? "Auto change: ON" : "Auto change: OFF",
    );
    fulfilledAutoToggle.attr("aria-pressed", String(autoFulfilledSyncEnabled));
    fulfilledAutoToggle.toggleClass("bg-orange-600", autoFulfilledSyncEnabled);
    fulfilledAutoToggle.toggleClass("bg-red-600", !autoFulfilledSyncEnabled);
  };

  const syncFulfilledOptionByPrice = () => {
    if (!autoFulfilledSyncEnabled) {
      return;
    }

    const lianikiValue = Number.parseFloat(
      String(lianikiInput.val() || "").replace(/,/g, "."),
    );

    if (Number.isNaN(lianikiValue)) {
      fulfilledSelect.val(getDefaultFulfilledValue());
      return;
    }

    fulfilledSelect.val(
      lianikiValue >= 20 ? getAutoFulfilledValue() : getDefaultFulfilledValue(),
    );
  };

  const refreshOptions = () => {
    const useAds = adsToggle.is(":checked");
    const defaultValue = useAds ? "0.26" : "0.165";
    loadSelectOptions(
      posostoSelect,
      useAds ? withAdsOptions : withoutAdsOptions,
      defaultValue,
    );
  };

  const refreshFulfilledOptions = () => {
    const previousValue = fulfilledSelect.val();
    const options = coinsToggle.is(":checked")
      ? coinsFulfilledOptions
      : noCoinsFulfilledOptions;

    loadSelectOptions(fulfilledSelect, options, getDefaultFulfilledValue());

    if (autoFulfilledSyncEnabled) {
      syncFulfilledOptionByPrice();
      return;
    }

    if (options.some(({ value }) => value === previousValue)) {
      fulfilledSelect.val(previousValue);
    }
  };

  adsToggle.on("change", refreshOptions);
  coinsToggle.on("change", refreshFulfilledOptions);
  fulfilledAutoToggle.on("click", () => {
    autoFulfilledSyncEnabled = !autoFulfilledSyncEnabled;
    renderAutoFulfilledToggle();

    if (autoFulfilledSyncEnabled) {
      syncFulfilledOptionByPrice();
    }
  });
  lianikiInput.on("input change", () => {
    if (autoFulfilledSyncEnabled) {
      syncFulfilledOptionByPrice();
    }
  });

  refreshOptions();
  refreshFulfilledOptions();
  renderAutoFulfilledToggle();

  function caclProfit(e) {
    e.preventDefault();

    if (autoFulfilledSyncEnabled) {
      syncFulfilledOptionByPrice();
    }

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
    autoFulfilledSyncEnabled = true;
    $("#form")[0].reset();
    refreshOptions();
    refreshFulfilledOptions();
    renderAutoFulfilledToggle();
    $("#profit").html("0");
  });

  $("body").on("keypress", (e) => {
    if (e.key === "Enter") {
      caclProfit(e);
    }
  });
});
