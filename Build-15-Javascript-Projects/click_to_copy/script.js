const btn = document.querySelector('.btn');
const coupon = document.querySelector('.coupon');

btn.addEventListener("click", copyText);

function copyText(e) {
    e.preventDefault();
    coupon.select();
    const text = coupon.value;
    navigator.clipboard.writeText(text);     // document.execCommand("copy");

    btn.innerHTML = `<i class="fas fa-copy"></i> Copied`;
    setTimeout(()=> {
        btn.innerHTML = `<i class="fas fa-copy"></i> Copy`;
    }, 2000);
}