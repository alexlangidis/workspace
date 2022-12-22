const btn = document.querySelector('#btn');
const container = document.querySelector('#container');
const close1 = document.querySelector('.fa-times');

btn.addEventListener('click', ()=> {
    createNotification();
})

close1.addEventListener ('click',  ()=> {
    closeBtn();
})


function createNotification () {
    const notif = document.createElement('div');
    notif.classList.add("toast");
    notif.innerHTML = `This is a notification`;

    container.appendChild(notif);
    container.style.display = "block";

    setTimeout(() => {
        notif.remove();
    }, 2000);

}

function closeBtn () {
    container.style.display = "none";
}



