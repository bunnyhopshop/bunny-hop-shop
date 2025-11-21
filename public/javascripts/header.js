var toggleOpen = document.getElementById('toggleOpen');
var toggleClose = document.getElementById('toggleClose');
var collapseMenu = document.getElementById('collapseMenu');

function handleClick() {
  if (collapseMenu.style.display === 'block') {
    collapseMenu.style.display = 'none';
  } else {
    collapseMenu.style.display = 'block';
  }
}
if (toggleOpen && toggleClose) {
toggleOpen.addEventListener('click', handleClick);
toggleClose.addEventListener('click', handleClick);
}
function isActive(url) {
  if(req.path === url) {
    active
  } else{
    white
  }
}
const searchButton = document.getElementById("searchButton");
const searchBar = document.getElementById("searchBar");
const cartIcon = document.querySelector(".cart-header");
const orderIcon = document.querySelector(".order-header");

searchButton.addEventListener("click", async () => {
  searchBar.classList.toggle("hidden");
  searchButton.classList.add("hidden");
cartIcon.classList.add("hidden");
orderIcon.classList.add('hidden')

});

