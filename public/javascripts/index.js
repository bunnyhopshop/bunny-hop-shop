function swiperAnimation() {
  const rightButton = document.querySelector('.s-right');
  const leftButton = document.querySelector('.s-left');
  const sContainer = document.querySelector('.s-container');

  function scrollContent(amount) {
    let currentScroll = sContainer.scrollLeft;
    let newScroll = Math.min(Math.max(currentScroll + amount, 0), sContainer.scrollWidth - sContainer.clientWidth);
    function scrollStep() {
      currentScroll = Math.min(Math.max(currentScroll, 0), sContainer.scrollWidth - sContainer.clientWidth);
      const distance = Math.abs(newScroll - currentScroll);


      if (distance > 1) {
        currentScroll += (newScroll - currentScroll) / 10;
        sContainer.scrollLeft = currentScroll;
        requestAnimationFrame(scrollStep);
      }
    }

    scrollStep();
  }

  rightButton.addEventListener('click', () => scrollContent(150));
  leftButton.addEventListener('click', () => scrollContent(-150));


}
function jsTouch() {
  const cards = document.querySelectorAll('.cards')
  cards.forEach((card) => {
    const image2 = card.querySelector('.image2')
    card.addEventListener('mouseenter', (e) => {
      image2.style.opacity = 1
    })
    card.addEventListener('mouseleave', (e) => {
      image2.style.opacity = 0
    })
  })
  const container = document.querySelector('.mens-container')
  container.addEventListener('mouseover', (e) => {
    document.querySelector('.mens-text').style.color = 'white'
  })
  container.addEventListener('mouseout', (e) => {
    document.querySelector('.mens-text').style.color = 'black'
  })

}
function animations() {
  gsap.registerPlugin(ScrollTrigger)
  function scrollTriggerAnimate() {
    gsap.from('.diva-text', {
      opacity: 0,
      duration: 1,
      y: 50,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.diva-text',
        start: 'top 90%',
        end: 'bottom center',
      }
    })
    gsap.from('.scroll-men', {
      opacity: 0,
      duration: 1,
      y: 50,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.scroll-men',
        start: 'top 90%',
        end: 'bottom center',
      }
    })
scrollCard()
  }
  function timelineAnimate() {
    let tl = gsap.timeline()
    gsap.to('.link span', {
      duration: 1,
      x: 15,
      repeat: -1,
    })
    const glamText = document.querySelector('.glam-text');
    tl.from('.glam', {
      duration: 1,
      y: 20,
      opacity: 0,
    })
    tl.from(glamText, {
      duration: 1,
      opacity: 0,
      x: 50,
      stagger: 0.1,
      ease: 'expo.inOut'
    })

    tl.from('.link0', {
      opacity: 0,
      duration: 1,
      y: 20,
      ease: 'power2.out'
    })
  }
  function firstPageAnimate() {
    let mensSection = document.querySelector('.mens-section');
    mensSection.addEventListener('mouseenter', () => {
      gsap.fromTo('.link1', {
        opacity: 0,
      }, {
        opacity: 1,

      })
    })
    mensSection.addEventListener('mouseleave', () => {
      gsap.fromTo('.link1', {
        opacity: 1,
      }, {
        opacity: 0,

      })
    })

    gsap.from('.list li', {
      duration: 1,
      opacity: 0,
      y: 50,
      stagger: 0.1,
      ease: 'expo.inOut'
    })
    const box = document.querySelector('.glamdiv')
    box.addEventListener('mouseenter', (e) => {
      gsap.to('.glam', {
        duration: .5,
        y: 700,
      })
      if (window.innerWidth <= 768) {
        gsap.to('.glamhover', {
          y: -320,
          duration: .5,
          opacity: 1,
        })
      } else {
        gsap.to('.glamhover', {
          y: -400,
          duration: .5,
          opacity: 1,
        })

      }
    }
    )

    box.addEventListener('mouseleave', (e) => {
       if (window.innerWidth <= 768) {
        gsap.to('.glam', {
        duration: .5,
        y: -150,
      })
      } else{
        gsap.to('.glam', {
        duration: .5,
        y: -320,
      })
      }
      
      gsap.to('.glamhover', {
        duration: .5,
        opacity: 0,

        y: 1000
      })
    })
  }

  scrollTriggerAnimate()
  timelineAnimate()
  firstPageAnimate()
}
function scrollCard() {
  gsap.from('.scroll-card', {
    opacity: 0,
    duration: 1,
    y: 50,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.scroll-card',
      start: 'top 90%',
      end: 'bottom center',
    }
  })
}

function addToCart() {
  const addBtn = document.querySelectorAll('.add-btn');
  const quantity = document.querySelector('.quantity');

  addBtn.forEach((btn) => {
    btn.addEventListener('click', async () => {

      const id = btn.getAttribute('data-fitId');

      try {
        const res = await fetch(`/add-to-cart/${id}`, { method: 'POST' });
        const data = await res.json();

        btn.innerHTML = `<i class="ri-check-line"></i> Added to cart`;
        quantity.textContent = data.cart.length;

      } catch (error) {
        console.log(error);
      }
    });
  });
}



async function addToCookieCart(productId, btn, quantityElement) {

  const res = await fetch(`/product-json/${productId}`);
  const product = await res.json();

  let cart = [];

  const cookieValue = document.cookie
    .split("; ")
    .find(row => row.startsWith("guestCart="));

  if (cookieValue) {
    try {
      cart = JSON.parse(decodeURIComponent(cookieValue.split("=")[1]));
    } catch (e) {
      cart = [];
    }
  }

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: productId,
      title: product.title,
      quantity: 1,
      price: product.finalPrice ?? product.price,
      image: product.image
    });
  }

  // write updated cart back to persistent cookie (7 days expiry)
  document.cookie = `guestCart=${encodeURIComponent(JSON.stringify(cart))}; path=/; max-age=${7 * 24 * 60 * 60}`;

  // UI update
  btn.innerHTML = `<i class="ri-check-line"></i> Added to cart`;
  quantityElement.textContent = cart.length;
}


function showCancelPopup(orderId) {
  document.getElementById('cancelOrderPopup').classList.remove('hidden');
  document.getElementById('confirmCancelButton').setAttribute('onclick', `cancelOrder('${orderId}')`);
}
function hideCancelPopup() {
  document.getElementById('cancelOrderPopup').classList.add('hidden');
}
function redirectToHomepage() {
    window.location.href = "/"
}

function cartAnimation() {
  gsap.to('.cart-done', {
    opacity: 1,
    y:20,
    duration: 2,
    ease: 'power2.out',
  })
  gsap.to('.success-msg', {
    opacity: 1,
    duration: 2,
    delay: .5,
    y: -40,
    ease: 'expo.inOut'
  })
  
}



