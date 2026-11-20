'use strict';

/** Bloom & Petals — vanilla JavaScript storefront interactions. */
(() => {
  const config = window.BLOOM_CONFIG || {};
  const products = [
    { id: 1, name: 'Blush Romance', price: 49.99, label: 'Bestseller', image: '2.1.webp', tone: 'Romantic roses', categories: ['anniversary', 'birthday'], description: 'Soft pink roses gathered in an elegant bouquet — a lovely way to celebrate someone special.' },
    { id: 2, name: 'Pure Happiness', price: 59.99, label: 'New', image: '2.2.webp', tone: 'Timeless whites', categories: ['sympathy', 'anniversary'], description: 'A graceful arrangement of white blooms with gentle greenery and a thoughtful, classic finish.' },
    { id: 3, name: 'Sunny Delight', price: 44.99, label: '', image: '2.3.webp', tone: 'Sunshine in a vase', categories: ['congratulations', 'birthday'], description: 'Bright sunflowers that bring a little warmth and happiness to almost any occasion.' },
    { id: 4, name: 'Sweet Moments', price: 54.99, label: 'Popular', image: '2.4.webp', tone: 'Soft seasonal colour', categories: ['birthday', 'everyday'], description: 'Blush roses and pretty seasonal flowers, carefully paired for a relaxed and romantic feel.' },
    { id: 5, name: 'Timeless Love', price: 69.99, label: 'Signature', image: '2.5.webp', tone: 'Classic red roses', categories: ['anniversary'], description: 'Rich red roses wrapped with care — the familiar favourite that never goes out of style.' },
    { id: 6, name: 'Garden Whisper', price: 47.99, label: '', image: '2.6.webp', tone: 'From the garden', categories: ['everyday', 'congratulations', 'sympathy'], description: 'A fresh, natural mix of cheerful pink blooms, daisies and greenery arranged in a vase.' }
  ];
  const testimonials = [
    { name: 'Emily Johnson', place: 'New York, USA', quote: 'The bouquet was absolutely stunning and delivered right on time. The flowers stayed fresh for over two weeks! Highly recommend Bloom & Petals to anyone looking for quality arrangements.' },
    { name: 'Michael Smith', place: 'Chicago, USA', quote: 'Beautiful flowers, great packaging, and excellent customer service. Ordered for my wife’s birthday and she was in tears of joy. Will definitely be a returning customer!' },
    { name: 'Sarah Williams', place: 'Los Angeles, USA', quote: 'I’ve ordered from many florists but Bloom & Petals is by far the best. The arrangements are creative, the flowers are always fresh, and the delivery is always on time.' },
    { name: 'James Davis', place: 'Miami, USA', quote: 'Ordered a sympathy arrangement and the team was so thoughtful and caring. The flowers were gorgeous and made such a meaningful gift during a difficult time.' }
  ];

  const byId = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat(config.locale || 'en-US', {style:'currency', currency: config.currency || 'USD'}).format(value);
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const product = (id) => products.find(p => p.id === Number(id));
  const storageGet = (key, fallback) => {try {const parsed = JSON.parse(localStorage.getItem(key));return parsed === null ? fallback : parsed;}catch{return fallback;}};
  const storageSet = (key,value) => {try{localStorage.setItem(key, JSON.stringify(value));}catch{/* blocked in some local-file contexts */}};
  let cart = storageGet('bloom.cart.v1', {});
  let wishlist = storageGet('bloom.wishlist.v1', []);
  let currentFilter = 'all';
  let currentQuery = '';
  let currentReview = 0;
  let lastFocusedElement = null;
  let toastTimer;

  // Only retain valid entries from an older browser session.
  cart = Object.fromEntries(Object.entries(cart).filter(([id, qty]) => !!product(id) && Number.isInteger(qty) && qty > 0 && qty <= 50));
  wishlist = Array.isArray(wishlist) ? wishlist.filter(id => !!product(id)) : [];

  const showToast = (message) => {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3300);
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try{await navigator.clipboard.writeText(text);return true;}catch{/* continue to fallback */}
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(area);
    area.focus();area.select();
    let okay = false;
    try{okay = document.execCommand('copy');}catch{/* no clipboard */}
    area.remove();
    return okay;
  };

  const renderProducts = () => {
    const filtered = products.filter(p => (currentFilter === 'all' || p.categories.includes(currentFilter)) && `${p.name} ${p.tone} ${p.description}`.toLowerCase().includes(currentQuery));
    byId('product-grid').innerHTML = filtered.map(p => `
      <article class="product-card" data-product="${p.id}">
        <div class="product-card-media">
          <img src="assets/${p.image}" loading="lazy" alt="${p.name} flower arrangement" width="720" height="720">
          ${p.label ? `<span class="product-tag">${p.label}</span>` : ''}
          <button type="button" class="product-wish ${wishlist.includes(p.id) ? 'is-favorite':''}" data-wish="${p.id}" aria-label="${wishlist.includes(p.id) ? 'Remove':'Add'} ${p.name} ${wishlist.includes(p.id) ? 'from':'to'} favourites" aria-pressed="${wishlist.includes(p.id)}">${icon('heart')}</button>
          <button type="button" class="product-quick" data-quick="${p.id}" aria-label="See details for ${p.name}">Quick view ↗</button>
        </div>
        <p class="product-meta">${p.tone}</p>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer"><span class="product-price">${money(p.price)}</span><button type="button" class="product-add" data-add="${p.id}" aria-label="Add ${p.name} to basket">+ Add to basket</button></div>
      </article>`).join('');
    byId('no-results').hidden = filtered.length !== 0;
  };

  const setFilter = (filter) => {
    currentFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(el => {
      const active = el.dataset.filter === filter;
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  };

  const persist = () => {
    storageSet('bloom.cart.v1',cart);
    storageSet('bloom.wishlist.v1', wishlist);
  };

  const renderCart = () => {
    const entries = Object.entries(cart).map(([id,qty]) => ({p:product(id),qty})).filter(entry=>entry.p);
    const quantity = entries.reduce((sum, entry) => sum + entry.qty,0);
    const total = entries.reduce((sum, entry) => sum + entry.p.price * entry.qty,0);
    document.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=quantity;el.hidden=quantity===0;});
    byId('cart-total').textContent=money(total);
    byId('cart-enquire').disabled = quantity === 0;
    byId('cart-copy').disabled = quantity === 0;
    byId('cart-items').innerHTML = entries.length === 0 ? `<div class="cart-empty"><span>✿</span><p>Your basket is waiting for something lovely.</p><a href="#shop" class="text-link darker close-cart">Explore flowers ↗</a></div>` : entries.map(({p,qty})=>`
      <div class="cart-row"><img src="assets/${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><small>${money(p.price)} each</small><div class="qty-row"><button type="button" data-dec="${p.id}" aria-label="Remove one ${p.name}">−</button><span aria-label="Quantity">${qty}</span><button type="button" data-inc="${p.id}" aria-label="Add one ${p.name}">+</button></div></div><div><div class="cart-row-price">${money(p.price*qty)}</div><button type="button" class="cart-remove" data-remove="${p.id}" aria-label="Remove ${p.name}">×</button></div></div>`).join('');
  };

  const addToBasket = id => {
    const p=product(id);if(!p)return;
    cart[p.id] = Math.min(50,(cart[p.id]||0)+1);
    persist();renderCart();showToast(`${p.name} added to your basket.`);
  };

  const toggleFavorite = id => {
    const p=product(id);if(!p)return;
    wishlist = wishlist.includes(p.id)?wishlist.filter(n=>n!==p.id):[...wishlist,p.id];
    persist();renderProducts();showToast(wishlist.includes(p.id)?`${p.name} saved to favourites.`:`${p.name} removed from favourites.`);
  };

  const openCart = () => {
    lastFocusedElement = document.activeElement;
    byId('cart-drawer').classList.add('open');
    byId('cart-drawer').removeAttribute('inert');
    byId('cart-drawer').setAttribute('aria-hidden','false');
    byId('overlay').hidden=false;
    requestAnimationFrame(()=>byId('overlay').classList.add('show'));
    document.body.classList.add('no-scroll');
    document.querySelector('#cart-drawer .close-cart').focus();
  };
  const closeCart = () => {
    byId('cart-drawer').classList.remove('open');
    byId('cart-drawer').setAttribute('aria-hidden','true');
    byId('cart-drawer').setAttribute('inert','');
    byId('overlay').classList.remove('show');
    setTimeout(()=>{if(!byId('cart-drawer').classList.contains('open')) byId('overlay').hidden=true;},260);
    document.body.classList.remove('no-scroll');
    if(lastFocusedElement && lastFocusedElement.isConnected)lastFocusedElement.focus();
  };

  const openQuick = id => {
    const p=product(id);if(!p)return;
    const d=byId('product-modal');
    byId('modal-photo').src=`assets/${p.image}`;
    byId('modal-photo').alt=`${p.name} bouquet`;
    byId('modal-name').textContent=p.name;
    byId('modal-price').textContent=money(p.price);
    byId('modal-description').textContent=p.description;
    byId('modal-add').dataset.product=String(p.id);
    d.showModal();
  };
  const cartMessage = () => {
    const lines = ['Hello, I would like to enquire about these Bloom & Petals arrangements:', ''];
    let total=0;
    for(const [id,quantity] of Object.entries(cart)){
      const p=product(id);if(!p)continue;
      lines.push(`• ${p.name} × ${quantity} — ${money(p.price*quantity)}`);
      total+=p.price*quantity;
    }
    lines.push('',`Estimated total: ${money(total)}`,'Please confirm availability, final price and delivery options.');
    return lines.join('\n');
  };

  const updateBusiness = () => {
    byId('year').textContent=String(new Date().getFullYear());
    const phone=byId('business-phone'),mail=byId('business-email');
    phone.textContent=config.phoneDisplay || '';
    phone.href=`tel:${config.phoneLink||''}`;
    mail.textContent=config.email||'';
    mail.href=`mailto:${config.email||''}`;
    byId('business-address').textContent=config.address||'';
  };

  const renderReviews = () => {
    const single = window.matchMedia('(max-width:680px)').matches;
    const count=single?1:2;
    const max = testimonials.length-count;
    currentReview=Math.min(currentReview,max);
    byId('review-items').innerHTML=testimonials.slice(currentReview,currentReview+count).map(t=>`
      <article class="review-card"><div class="review-stars" aria-label="Five stars">★★★★★</div><blockquote>“${t.quote}”</blockquote><div class="review-person"><span class="review-avatar" aria-hidden="true">${t.name.charAt(0)}</span><div><strong>${t.name}</strong><small>${t.place}</small></div></div></article>`).join('');
    byId('review-prev').disabled=currentReview===0;
    byId('review-next').disabled=currentReview>=max;
    byId('review-dots').innerHTML=Array.from({length:max+1},(_,i)=>`<button type="button" class="${i===currentReview?'active':''}" data-review="${i}" aria-label="Show review set ${i+1}" aria-pressed="${i===currentReview}"></button>`).join('');
  };

  const closeMobile = () => {
    const menu=byId('mobile-menu');menu.hidden=true;
    const toggle=document.querySelector('.menu-toggle');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');
  };

  // Wire product actions and category filters.
  byId('product-grid').addEventListener('click',e=>{
    const add=e.target.closest('[data-add]');
    const wish=e.target.closest('[data-wish]');
    const quick=e.target.closest('[data-quick]');
    if(add)addToBasket(add.dataset.add);
    if(wish)toggleFavorite(wish.dataset.wish);
    if(quick)openQuick(quick.dataset.quick);
  });
  document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('click',()=>setFilter(el.dataset.filter)));
  document.querySelectorAll('[data-occasion]').forEach(el=>el.addEventListener('click',()=>{currentQuery='';byId('product-search').value='';setFilter(el.dataset.occasion);}));
  byId('product-search').addEventListener('input',e=>{currentQuery=e.target.value.trim().toLowerCase();renderProducts();});

  // Basket interactions.
  document.querySelectorAll('.basket-open').forEach(el=>el.addEventListener('click',openCart));
  byId('overlay').addEventListener('click',closeCart);
  byId('cart-drawer').addEventListener('click',e=>{
    if(e.target.closest('.close-cart')){closeCart();return;}
    const inc=e.target.closest('[data-inc]'),dec=e.target.closest('[data-dec]'),remove=e.target.closest('[data-remove]');
    if(inc){const id=inc.dataset.inc;cart[id]=Math.min((cart[id]||0)+1,50);}
    if(dec){const id=dec.dataset.dec;cart[id]--;if(cart[id]<=0)delete cart[id];}
    if(remove)delete cart[remove.dataset.remove];
    if(inc||dec||remove){persist();renderCart();}
  });
  byId('cart-copy').addEventListener('click',async()=>showToast(await copyText(cartMessage())?'Basket enquiry copied.':'Could not copy; please select your list manually.'));
  byId('cart-enquire').addEventListener('click',async()=>{
    const msg=cartMessage();
    if(config.whatsappNumber && /^\d{8,15}$/.test(config.whatsappNumber)){
      window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
      showToast('Opening WhatsApp enquiry. This does not confirm an order.');
    }else{
      showToast(await copyText(msg)?'Enquiry list copied. Add your WhatsApp number in js/config.js to enable direct chat.':'Enquiry prepared; no business WhatsApp number is configured.');
    }
  });
  byId('modal-add').addEventListener('click',e=>{addToBasket(e.currentTarget.dataset.product);byId('product-modal').close();});
  document.querySelector('.modal-close').addEventListener('click',()=>byId('product-modal').close());
  byId('product-modal').addEventListener('click',e=>{if(e.target===byId('product-modal'))byId('product-modal').close();});

  // Mobile navigation.
  document.querySelector('.menu-toggle').addEventListener('click',e=>{
    const menu=byId('mobile-menu');menu.hidden=!menu.hidden;
    e.currentTarget.setAttribute('aria-expanded',String(!menu.hidden));
    e.currentTarget.setAttribute('aria-label',menu.hidden?'Open navigation':'Close navigation');
  });
  byId('mobile-menu').querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMobile));
  window.addEventListener('resize',()=>{if(window.innerWidth>860)closeMobile();renderReviews();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(byId('cart-drawer').classList.contains('open'))closeCart();closeMobile();}
    if(e.key==='Tab' && byId('cart-drawer').classList.contains('open')){
      const focusable=[...byId('cart-drawer').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')];
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  // Testimonial carousel, navigable by buttons and dots.
  byId('review-prev').addEventListener('click',()=>{currentReview=Math.max(0,currentReview-1);renderReviews();});
  byId('review-next').addEventListener('click',()=>{currentReview++;renderReviews();});
  byId('review-dots').addEventListener('click',e=>{const btn=e.target.closest('[data-review]');if(btn){currentReview=Number(btn.dataset.review);renderReviews();}});

  // Honest contact flow: prepare email, never pretend a backend has sent it.
  const contactForm=byId('contact-form');
  const contactData=()=>Object.fromEntries(new FormData(contactForm));
  const contactMessage=()=>{const f=contactData();return `Name: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone||'Not supplied'}\n\n${f.message}`;};
  const validateContact=()=>{
    const f=contactData();
    const errors={
      'contact-name':f.name.trim()?'':'Please enter your name.',
      'contact-email':/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())?'':'Please enter a valid email address.',
      'contact-message':f.message.trim()?'':'Please enter your message.'
    };
    let valid=true;
    for(const [id,message] of Object.entries(errors)){
      const control=byId(id);byId(id).setAttribute('aria-invalid',String(!!message));
      document.querySelector(`[data-error-for="${id}"]`).textContent=message;
      if(message){valid=false;if(!validateContact.firstInvalid)validateContact.firstInvalid=control;}
    }
    if(!valid)validateContact.firstInvalid?.focus();
    validateContact.firstInvalid=null;
    return valid;
  };
  contactForm.addEventListener('submit',e=>{
    e.preventDefault();if(!validateContact())return;
    const subject=encodeURIComponent('Flower arrangement enquiry — Bloom & Petals');
    const body=encodeURIComponent(contactMessage());
    byId('contact-status').textContent='Opening your email app. Please review and send the email yourself.';
    window.location.href=`mailto:${config.email}?subject=${subject}&body=${body}`;
  });
  byId('copy-contact').addEventListener('click',async()=>{
    if(!validateContact())return;
    const copied=await copyText(contactMessage());
    byId('contact-status').textContent=copied?'Message copied. You can paste it into WhatsApp or email.':'Unable to copy automatically. Please use your device copy controls.';
  });
  contactForm.addEventListener('input',e=>{if(e.target.getAttribute('aria-invalid')==='true'){e.target.removeAttribute('aria-invalid');document.querySelector(`[data-error-for="${e.target.id}"]`)?.replaceChildren();}});

  // Small progressive enhancement for the nav highlight.
  if('IntersectionObserver' in window){
    const sections=['home','about','categories','shop','contact'].map(byId);
    const obs=new IntersectionObserver(entries=>{
      const current=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(current)document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${current.target.id}`));
    },{rootMargin:'-15% 0px -65% 0px',threshold:[0,.25,.5]});
    sections.forEach(x=>obs.observe(x));
  }

  updateBusiness();renderProducts();renderCart();renderReviews();
})();
