(() => {
  'use strict';

  const app = document.querySelector('#app');
  const dialog = document.querySelector('#dialog');
  const assets = 'assets/';
  const routes = [
    { name: 'Berlin – Copenhagen', image: 'e2526.png', price: 995 },
    { name: 'Oslo – Copenhagen', image: 'e1d27.png', price: 1195 },
    { name: 'Gothenburg – Copenhagen', image: '14685.png', price: 895 }
  ];
  const bikes = [
    { name: 'Touring Bike', image: 'fa775.png', price: 300, from: 200, description: 'A lightweight and comfortable trekking bike, perfect for city rides and longer tours.' },
    { name: 'Gravel Bike', image: 'f3121.png', price: 350, from: 250, description: 'A versatile bike for gravel paths and quiet roads. Comfortable, capable, and ready for a longer adventure.' },
    { name: 'E-Bike', image: '6fa18.png', price: 450, from: 350, description: 'A little extra help for the hills. Enjoy a comfortable ride with electric assistance along the way.' }
  ];
  const equipment = [
    { id: 'helmet', name: 'Helmet', description: 'Adjustable touring helmet', price: 45 },
    { id: 'pannier', name: 'Rear pannier', description: 'Waterproof · 20 L', price: 75 },
    { id: 'frontbag', name: 'Front bag', description: 'Keep your essentials close', price: 50 },
    { id: 'phone', name: 'Phone mount', description: 'Universal handlebar mount', price: 25 }
  ];
  const questions = {
    terrain: { title: 'What is your preferable terrain?', options: ['I prefer paved roads', 'I prefer gravel roads', 'I prefer roads with hills'], next: 'routes', back: 'welcome' },
    duration: { title: 'How long is your planned bike tour?', options: ['A few hours', 'One day', '2–3 days', '4 days or longer'], next: 'distance', back: 'date' },
    distance: { title: 'How many kilometres do you plan to cycle per day?', options: ['Less than 30 km', '30–60 km', '60–90 km', 'More than 90 km'], next: 'luggage', back: 'duration' },
    luggage: { title: 'Will you be carrying luggage during your ride?', options: ['No luggage', 'A small backpack', 'Some luggage on the bike', 'A lot of luggage'], next: 'company', back: 'distance' },
    company: { title: 'Will you be cycling alone or with others?', options: ['Alone', 'With one other person', 'With a group'], next: 'bikes', back: 'luggage' }
  };
  const pages = ['welcome', 'login', 'register', 'terrain', 'routes', 'date', 'duration', 'distance', 'luggage', 'company', 'bikes', 'bike', 'basket', 'details', 'extras', 'payment', 'confirmation'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const addDays = (date, amount) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
  const defaults = () => ({ route: 0, bike: 0, size: 'M', answers: {}, custom: {}, start: dateKey(addDays(today, 4)), end: dateKey(addDays(today, 8)), hour: 13, extras: [], protection: false });
  let state = defaults();
  // Persist tour choices only. Credentials, contact details and payment data are never stored.
  try {
    const saved = JSON.parse(sessionStorage.getItem('oneway-tour') || 'null');
    if (saved && typeof saved === 'object') {
      for (const key of ['route', 'bike']) if (Number.isInteger(saved[key]) && saved[key] >= 0 && saved[key] < 3) state[key] = saved[key];
      if (['S', 'M', 'L+'].includes(saved.size)) state.size = saved.size;
      if (Number.isInteger(saved.hour) && saved.hour >= 8 && saved.hour <= 20) state.hour = saved.hour;
      if (Array.isArray(saved.extras)) state.extras = [...new Set(saved.extras.filter(id => equipment.some(item => item.id === id)))];
      state.protection = saved.protection === true;
      for (const key of ['start', 'end']) if (typeof saved[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved[key]) && Number.isFinite(parseDate(saved[key]).getTime()) && saved[key] >= dateKey(today)) state[key] = saved[key];
      if (state.end < state.start) state.end = dateKey(addDays(parseDate(state.start), 4));
      for (const key of Object.keys(questions)) {
        if (questions[key].options.concat('custom').includes(saved.answers?.[key])) state.answers[key] = saved.answers[key];
        if (typeof saved.custom?.[key] === 'string') state.custom[key] = saved.custom[key].slice(0, 200);
      }
    }
  } catch { /* Storage may be unavailable for local files or private browsing. */ }
  let details = {};
  let calendarMonth = new Date(parseDate(state.start).getFullYear(), parseDate(state.start).getMonth(), 1);
  let choosingEnd = false;
  let paymentMethod = 'apple';
  let completed = false;
  let confirmationId = '';
  let lastScreen = '';
  let carouselStartX = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = value => `${value.toLocaleString('en-GB')} kr`;
  const save = () => { try { sessionStorage.setItem('oneway-tour', JSON.stringify(state)); } catch { /* In-memory use still works. */ } };
  const announce = message => { document.querySelector('#announcer').textContent = message; };
  const img = (name, alt = '', cls = '') => `<img src="${assets}${name}" alt="${escape(alt)}"${cls ? ` class="${cls}"` : ''}>`;
  const primary = (label, target, cls = '') => `<a class="primary ${cls}" href="#${target}">${label}</a>`;
  const back = (target, label = 'back') => `<a class="back" href="#${target}">${img('arrow-back.svg')}${label}</a>`;
  const skip = target => `<a class="skip" href="#${target}">Skip ${img('arrow-right.svg')}</a>`;
  const total = () => routes[state.route].price + bikes[state.bike].price + equipment.filter(item => state.extras.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
  const days = () => Math.max(1, Math.round((parseDate(state.end) - parseDate(state.start)) / 86400000));
  const dateLabel = () => {
    const start = parseDate(state.start), end = parseDate(state.end);
    if (state.start === state.end) return start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) return `${start.getDate()}–${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };
  const bookingMeta = () => `${dateLabel()} · 1 traveller`;
  const summary = () => `<section class="booking-summary" aria-label="Your booking"><p class="eyebrow">Your booking</p><h2>${routes[state.route].name}</h2><div class="summary-meta"><span>${bookingMeta()}</span><strong data-total>${money(total())}</strong></div></section>`;
  const progress = stage => {
    const names = ['d8766.png', 'f07a9.png', '56818.png', '3f9c2.png', '87c09.png', 'd7751.png'];
    return `<div class="route-progress" aria-label="Your journey, step ${stage + 1} of 6">${img(names[stage])}</div>`;
  };
  const header = () => `<header class="topbar"><a class="site-logo" href="#welcome" aria-label="One way bike tours — home"><strong>one way<span>®</span></strong><small>bike tours</small></a><button class="menu-toggle" data-action="menu" aria-controls="site-nav" aria-expanded="false">Menu</button><nav id="site-nav" class="site-nav" aria-label="Main navigation"><a href="#routes">Our routes</a><a href="#bikes">Our bikes</a><button data-action="how">How it works</button><a href="#login">Log in</a>${primary('Plan your ride', 'terrain')}</nav><button class="help" data-action="help" aria-label="Help"><span>${img('c06fc.svg')}<b>?</b></span></button></header>`;
  const checkoutTitle = (title, step) => `<div class="checkout-heading"><h1 tabindex="-1">${title}</h1><span class="checkout-step">STEP ${step} OF 4</span></div>`;
  const journeyAside = stage => `<aside class="journey-aside"><p class="eyebrow">A little further. A little freer.</p><h2>Your next<br>adventure starts here.</h2><p>One route, your favourite bike, and the freedom to go your own way.</p><ol>${[['Your preferences', 'terrain'], ['Choose a route', 'routes'], ['Pick your dates', 'date'], ['Find your bike', 'duration'], ['Make it yours', 'bike'], ['Your booking', 'basket']].map(([label, target], index) => `<li class="${index === stage ? 'current' : ''}"><a href="#${target}" ${index === stage ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span>${label}</a></li>`).join('')}</ol><div class="aside-photo">${img(routes[state.route].image, '')}<span>${routes[state.route].name}</span></div></aside>`;
  const footer = () => `<footer class="site-footer"><a class="footer-brand" href="#welcome">one way bike tours</a><p>A different way to see the world.</p><div><button data-action="help">Help & information</button><button data-action="terms">Demo & booking terms</button></div><small>Team 10 · Interactive website prototype</small></footer>`;
  const shell = (content, cls = '', stage = null) => `<section class="surface ${cls} ${stage !== null ? 'booking-layout' : ''}">${header()}${stage !== null ? journeyAside(stage) : ''}${content}${stage !== null ? progress(stage) : ''}</section>${footer()}`;

  function welcome() {
    return shell(`<main id="main" class="homepage"><section class="home-hero"><div class="hero-copy"><p class="eyebrow">Denmark & beyond · At your own pace</p><h1 tabindex="-1" aria-label="One way bike tours">One way.<br><span>Endless possibilities.</span></h1><p class="hero-description">Explore a growing range of one-way and round-trip bike tours in Denmark and across Europe. A new perspective, one pedal at a time.</p><div class="hero-actions">${primary('Find your adventure', 'terrain')}<a class="text-link" href="#routes">Explore the routes ${img('arrow-right.svg')}</a></div><div class="hero-footnote"><span>Make the journey your own.</span><span>No account needed.</span></div></div><div class="hero-visual">${img('e2526.png', 'Cyclists following a winding road through the landscape')}<div class="hero-caption"><span>LESS PLANNING. MORE PEDALLING.</span><strong>The road is yours.</strong></div><span class="photo-label">01 / The start of something good</span></div></section><section class="home-benefits" aria-label="Why ride with us"><span>One-way freedom</span><span>Bikes for every journey</span><span>Denmark & across Europe</span><span>Your own pace</span></section><section class="home-routes" aria-labelledby="routes-title"><div class="section-heading"><div><p class="eyebrow">Find your next horizon</p><h2 id="routes-title">Which way will you go?</h2></div><a class="text-link" href="#routes">Explore all routes ${img('arrow-right.svg')}</a></div><div class="tour-grid">${routes.map((route, i) => `<a class="tour-tile" href="#date" data-action="choose-tour" data-index="${i}"><div>${img(route.image, `Cycling landscape on the ${route.name} route`, 'tour-tile-image')}<span class="tour-number">0${i + 1}</span></div><p class="eyebrow">One-way adventure</p><h3>${route.name}</h3><span class="tour-cta">Discover this route ${img('arrow-right.svg')}</span></a>`).join('')}</div></section><section class="how-section" id="how-it-works" aria-labelledby="how-title"><div><p class="eyebrow">A simple start to a great journey</p><h2 id="how-title">Your ride.<br>Your rules.</h2><p>From the first idea to the first pedal. Put together a trip that feels like you.</p>${primary('Let’s get started', 'terrain')}</div><ol><li><span>01</span><div><h3>Choose your direction</h3><p>Coastal roads, forest paths or a new city. Find the route that calls to you.</p></div></li><li><span>02</span><div><h3>Find your perfect ride</h3><p>Choose a touring bike, gravel bike or e-bike, then make it yours with the right equipment.</p></div></li><li><span>03</span><div><h3>Make room for adventure</h3><p>Pick your dates, plan your journey and look forward to the open road.</p></div></li></ol></section><section class="home-account"><div><h2>Already part of the journey?</h2><p>Start your next adventure from here.</p></div><div>${primary('Log in', 'login')}${primary('Register', 'register')}</div></section></main>`, 'welcome');
  }

  function auth(register = false) {
    return shell(`<main id="main" class="auth"><h1 tabindex="-1">${register ? 'Start your next adventure' : 'Hey, Welcome Back'}</h1><form class="auth-form" id="auth-form">${register ? '<label class="sr-only" for="auth-name">Name</label><input id="auth-name" name="name" placeholder="Name" autocomplete="name" required maxlength="80">' : ''}<label class="sr-only" for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="Email" autocomplete="email" required maxlength="120"><div class="password-wrap"><label class="sr-only" for="auth-password">Password</label><input id="auth-password" name="password" type="password" placeholder="Password" autocomplete="${register ? 'new-password' : 'current-password'}" required minlength="8"><button type="button" class="show-password" data-action="password" aria-controls="auth-password" aria-pressed="false">Show</button></div><div class="auth-actions"><button class="primary" type="submit">${register ? 'Register' : 'Log in'}</button>${primary(register ? 'Log in' : 'Register', register ? 'login' : 'register')}</div></form><p class="demo-note">Demo only. Use fictional details. No account is created, and your password is never saved or sent.</p><div class="question-skip">${skip('terrain')}</div>${back('welcome')}</main>`);
  }

  function question(key) {
    const q = questions[key];
    const current = state.answers[key];
    const options = q.options.concat('custom').map((option, i) => `<label class="choice"><input type="radio" name="${key}" value="${escape(option)}" ${current === option ? 'checked' : ''}><span>${option === 'custom' ? 'Add Your Own Response' : escape(option)}</span></label>`).join('');
    return shell(`<main id="main" class="question-main ${key === 'terrain' ? 'terrain' : ''}"><p class="eyebrow">Personal questions</p><h1 tabindex="-1" id="question-title" class="question-title">${q.title}</h1><fieldset class="choices" aria-labelledby="question-title">${options}</fieldset><input class="custom-answer" id="custom-answer" aria-label="Your own response" placeholder="Tell us a little more…" maxlength="200" value="${escape(state.custom[key] || '')}" ${current === 'custom' ? '' : 'hidden'}><div class="question-skip">${skip(q.next)}</div><div class="actions">${back(q.back)}<button class="primary" data-action="question-next" data-question="${key}">Continue</button></div></main>`, '', key === 'terrain' ? 0 : 3);
  }

  function routePicker() {
    const route = routes[state.route];
    const next = routes[(state.route + 1) % routes.length];
    return shell(`<main id="main" class="route-main"><h1 tabindex="-1" class="route-heading">${route.name.replace(' – ', ' –<br>')}</h1><div class="route-carousel" aria-roledescription="carousel" aria-label="Choose your route"><a class="route-card" href="#date" aria-label="Choose ${route.name}">${img(route.image, `Cycling on the ${route.name} route`, 'route-photo')}<span class="small">choose your route</span></a>${img(next.image, '', 'route-peek')}<button class="carousel-arrow prev" data-action="route-prev" aria-label="Previous route">${img('arrow-back.svg')}</button><button class="carousel-arrow next" data-action="route-next" aria-label="Next route">${img('arrow-back.svg')}</button></div>${back('terrain')}</main>`, '', 1);
  }

  function calendar() {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => `<span class="weekday" aria-hidden="true">${day}</span>`).join('');
    cells += '<span></span>'.repeat(offset);
    for (let day = 1; day <= count; day++) {
      const date = new Date(year, month, day), key = dateKey(date);
      const selected = key === state.start || key === state.end;
      const inRange = key > state.start && key < state.end;
      cells += `<button type="button" class="day${selected ? ' selected' : ''}${inRange ? ' in-range' : ''}${key === dateKey(today) ? ' today' : ''}" data-action="date" data-date="${key}" aria-label="${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${key === state.start ? ', pickup' : ''}${key === state.end ? ', return' : ''}" aria-pressed="${selected || inRange}" ${date < today ? 'disabled' : ''}>${day}</button>`;
    }
    const atStart = year === today.getFullYear() && month === today.getMonth();
    return `<div class="calendar-header"><h2>${calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2><div class="month-controls"><button data-action="month-prev" aria-label="Previous month" ${atStart ? 'disabled' : ''}>‹</button><button data-action="month-next" aria-label="Next month">›</button></div></div><div class="calendar-grid">${cells}</div>`;
  }

  function datePicker() {
    return shell(`<main id="main" class="date-main"><h1 tabindex="-1">Let us know what time you would like<br>to pick up your bike.</h1><p class="date-caption">⌄ &nbsp; pick up</p><div class="time-controls"><button class="round-control" data-action="time-minus" aria-label="Earlier pickup time" ${state.hour === 8 ? 'disabled' : ''}>−</button><output id="time-output" for="pickup-time">${state.hour}:00</output><button class="round-control" data-action="time-plus" aria-label="Later pickup time" ${state.hour === 20 ? 'disabled' : ''}>+</button></div><input id="pickup-time" aria-label="Pickup time" type="range" min="8" max="20" step="1" value="${state.hour}" aria-valuetext="${state.hour}:00"><section class="calendar" aria-label="Choose pickup and return dates">${calendar()}</section><p class="date-status" role="status">${choosingEnd ? 'Now choose your return date.' : `${dateLabel()} · ${days()} ${days() === 1 ? 'day' : 'days'} · Select a date to change pickup.`}</p><div class="actions">${back('routes')}<button class="primary" data-action="date-next">Continue</button></div></main>`, '', 2);
  }

  function bikePicker() {
    const bike = bikes[state.bike];
    return shell(`<main id="main" class="bike-main"><p class="eyebrow">${state.bike === recommendation() ? 'Our suggestion' : 'Find your bike'}</p><h1 tabindex="-1">${bike.name}</h1><div class="bike-carousel" aria-roledescription="carousel" aria-label="Choose your bike"><a href="#bike" class="bike-card" aria-label="Choose ${bike.name}">${img(bike.image, bike.name)}</a><button class="carousel-arrow prev" data-action="bike-prev" aria-label="Previous bike">${img('arrow-back.svg')}</button><button class="carousel-arrow next" data-action="bike-next" aria-label="Next bike">${img('arrow-back.svg')}</button></div><div class="carousel-dots" aria-label="Bike selection">${bikes.map((item, i) => `<button class="dot" data-action="bike-dot" data-index="${i}" aria-label="Show ${item.name}" aria-current="${state.bike === i}"></button>`).join('')}</div><p class="bike-intro">Based on your answers we suggest this bike. But if we’re wrong you can always choose a different one.</p>${back('company')}</main>`, '', 4);
  }

  function bikeDetail() {
    const bike = bikes[state.bike];
    return shell(`<main id="main" class="bike-detail"><div class="detail-image">${img(bike.image, bike.name)}<button class="hotspot" data-action="bike-info" aria-label="About the handlebars">+</button><button class="hotspot second" data-action="bike-frame" aria-label="About the bike frame">+</button></div><div class="bike-title"><h1 tabindex="-1">${bike.name}</h1><span>from ${money(bike.from)}</span></div><p class="bike-description">${bike.description}</p><fieldset><legend class="small">Size</legend><div class="size-options">${['S', 'M', 'L+'].map(size => `<label class="size-option"><input type="radio" name="size" value="${size}" ${state.size === size ? 'checked' : ''}><span>${size === 'L+' ? 'L +' : size}</span></label>`).join('')}</div></fieldset><button class="size-guide" data-action="size-guide">size guide</button><p class="size-note">If you're between sizes, we recommend selecting the larger size for longer rides, or the smaller one for better control and agility.</p><fieldset class="addons"><legend class="small">Add ons</legend><div class="addon-list">${equipment.map(item => `<label><input type="checkbox" name="extra" value="${item.id}" ${state.extras.includes(item.id) ? 'checked' : ''}>${item.id === 'pannier' ? 'Panniers / bags' : item.id === 'phone' ? 'Phone holder' : item.name}</label>`).join('')}</div></fieldset><div class="detail-continue">${primary('Continue', 'basket')}</div><div class="detail-back">${back('bikes')}</div></main>`, '', 4);
  }

  function basket() {
    const bike = bikes[state.bike];
    return shell(`<main id="main" class="checkout">${checkoutTitle('Your basket', 1)}${summary()}<h2 class="section-title">Basket overview</h2><div class="basket-row"><div class="row-heading"><span>One-way bike tour</span><span>${money(routes[state.route].price)}</span></div><p>${routes[state.route].name} · ${dateLabel()}</p></div><div class="basket-row"><div class="row-heading"><span>${bike.name}</span><span>${money(bike.price)}</span></div><p>Size ${state.size} · ${days()} ${days() === 1 ? 'day' : 'days'}</p></div>${equipment.filter(item => state.extras.includes(item.id)).map(item => `<div class="basket-row"><div class="row-heading"><span>${item.name}</span><span>${money(item.price)}</span></div></div>`).join('')}<div class="basket-row"><div class="row-heading"><span>Included in your booking</span></div><p>Route support · Emergency assistance · Flexible pickup</p></div><div class="total"><span>Total</span><span>${money(total())}</span></div><p class="policy">By continuing, you accept the <button data-action="terms">terms of policy</button>.</p><div class="checkout-continue">${primary('Continue with personal information', 'details', 'wide')}</div><div class="checkout-back">${back('bike')}</div></main>`, '', 5);
  }

  function detailField(name, label, placeholder, type = 'text', autocomplete = name) {
    return `<label class="field">${label}<input name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" value="${escape(details[name] || '')}" required maxlength="120"></label>`;
  }

  function personalDetails() {
    return shell(`<main id="main" class="checkout long">${checkoutTitle('Your details', 2)}${summary()}<h2 class="section-title">Personal information</h2><form id="details-form" class="details-form"><div class="form-row">${detailField('firstName', 'FIRST NAME', 'Alex', 'text', 'given-name')}${detailField('lastName', 'LAST NAME', 'Morgan', 'text', 'family-name')}</div>${detailField('email', 'EMAIL', 'alex@example.com', 'email', 'email')}${detailField('phone', 'PHONE', '+45 12 34 56 78', 'tel', 'tel')}${detailField('address', 'STREET ADDRESS', 'Nørrebrogade 24', 'text', 'street-address')}<div class="form-row">${detailField('city', 'CITY', 'Copenhagen', 'text', 'address-level2')}${detailField('country', 'COUNTRY', 'Denmark', 'text', 'country-name')}</div><div class="checkout-continue"><button class="primary wide" type="submit">Continue with extras and cover</button></div></form><div class="checkout-back">${back('basket')}</div></main>`, '', 5);
  }

  function extras() {
    return shell(`<main id="main" class="checkout long">${checkoutTitle('Extras & cover', 3)}${summary()}<h2 class="section-title">Equipment & insurance</h2><fieldset><legend class="extras-subtitle">BIKE PROTECTION</legend><div class="protection-options"><label class="choice"><input type="radio" name="protection" value="yes" ${state.protection ? 'checked' : ''}>Yes, protect it</label><label class="choice"><input type="radio" name="protection" value="no" ${state.protection ? '' : 'checked'}>No thanks</label></div></fieldset><div class="basket-row extras-info"><div class="row-heading"><span>Protection includes</span></div><p>Theft and accidental damage · 24/7 support</p><p>Included at no extra charge in this demo.</p></div><fieldset><legend class="extras-subtitle">ADD EQUIPMENT</legend><div class="equipment">${equipment.map(item => `<label class="choice"><input type="checkbox" name="extra" value="${item.id}" ${state.extras.includes(item.id) ? 'checked' : ''}><span class="equipment-info"><strong>${item.name}</strong><small>${item.description}</small></span><span class="equipment-price">+${money(item.price)}</span></label>`).join('')}</div></fieldset><div class="checkout-continue extras-checkout">${primary('Continue with payment', 'payment', 'wide')}</div><div class="checkout-back">${back('details')}</div></main>`, '', 5);
  }

  function payment() {
    return shell(`<main id="main" class="checkout">${checkoutTitle('Payment', 4)}${summary()}<h2 class="section-title">Payment method</h2><fieldset class="protection-options" aria-label="Payment method"><label class="choice"><input type="radio" name="payment" value="card" ${paymentMethod === 'card' ? 'checked' : ''}>Card</label><label class="choice"><input type="radio" name="payment" value="apple" ${paymentMethod === 'apple' ? 'checked' : ''}>Apple Pay</label></fieldset><div class="payment-card"><div class="payment-card-title"><h2>${paymentMethod === 'apple' ? 'Apple Pay' : 'Card'}</h2><small>DEMO</small></div><div class="payment-route"><strong>${routes[state.route].name}</strong><p>${bookingMeta()}</p></div><div class="payment-line"><span class="muted">Pay with</span><span>Demo card · •••• 4242</span></div><div class="payment-line total"><span class="muted">Total</span><strong>${money(total())}</strong></div></div><p class="demo-note">Preview only. No payment will be taken and no actual booking will be made. All prices are demo prices.</p><button class="pay-button" data-action="complete">Complete demo booking</button><div class="payment-back">${back('extras', 'back to extras')}</div></main>`, '', 5);
  }

  function confirmation() {
    return shell(`<main id="main" class="confirmation"><p class="eyebrow">Your next adventure</p><h1 tabindex="-1">You're ready<br>to ride${details.firstName ? `, ${escape(details.firstName)}` : ''}.</h1><p>Your demo itinerary is ready.</p><p class="small muted">${escape(confirmationId)}</p>${summary()}<div class="basket-row"><h3>${bikes[state.bike].name} · Size ${state.size}</h3><p>Pickup at ${state.hour}:00 · ${days()} ${days() === 1 ? 'day' : 'days'}</p>${state.extras.length ? `<p>${equipment.filter(item => state.extras.includes(item.id)).map(item => item.name).join(' · ')}</p>` : ''}<p>${state.protection ? 'Bike protection included' : 'No bike protection selected'}</p></div><p class="demo-note">This is a demo confirmation, not a reservation. Nothing has been charged and no email has been sent.</p><button class="primary wide" data-action="download">Download your itinerary</button><button class="back" data-action="restart">Plan another adventure</button></main>`, '', 5);
  }

  function recommendation() {
    if (state.answers.terrain === 'I prefer roads with hills' || state.answers.distance === 'More than 90 km') return 2;
    if (state.answers.terrain === 'I prefer gravel roads') return 1;
    return 0;
  }
  function currentPage() { const key = location.hash.slice(1); return pages.includes(key) ? key : 'welcome'; }
  function go(page) { if (currentPage() === page) render(); else location.hash = page; }
  function render(keepFocus = false) {
    let page = currentPage();
    if (page === 'confirmation' && !completed) { location.replace('#payment'); return; }
    const views = { welcome, login: () => auth(false), register: () => auth(true), routes: routePicker, date: datePicker, bikes: bikePicker, bike: bikeDetail, basket, details: personalDetails, extras, payment, confirmation };
    const oldFocus = keepFocus ? document.activeElement : null;
    const focusSelector = oldFocus?.dataset.action ? `[data-action="${oldFocus.dataset.action}"]${oldFocus.dataset.date ? `[data-date="${oldFocus.dataset.date}"]` : ''}${oldFocus.dataset.index ? `[data-index="${oldFocus.dataset.index}"]` : ''}` : oldFocus?.name ? `[name="${oldFocus.name}"][value="${oldFocus.value}"]` : null;
    app.innerHTML = questions[page] ? question(page) : views[page]();
    document.title = `${page === 'welcome' ? 'One way bike tours' : (app.querySelector('h1')?.textContent || 'Your tour') + ' · One way bike tours'}`;
    if (page !== lastScreen) {
      window.scrollTo(0, 0);
      if (lastScreen) app.querySelector('h1')?.focus({ preventScroll: true });
    } else if (focusSelector) app.querySelector(focusSelector)?.focus({ preventScroll: true });
    lastScreen = page;
  }
  function openDialog(title, content) {
    document.querySelector('#dialog-title').textContent = title;
    document.querySelector('#dialog-content').innerHTML = content;
    dialog.showModal();
  }
  function updateTotals() { app.querySelectorAll('[data-total]').forEach(el => { el.textContent = money(total()); }); }
  function moveCarousel(kind, direction) {
    const list = kind === 'route' ? routes : bikes;
    state[kind] = (state[kind] + direction + list.length) % list.length;
    save(); render(true); announce(list[state[kind]].name);
  }
  function updateTime(value) {
    state.hour = Math.max(8, Math.min(20, Number(value)));
    save();
    const slider = document.querySelector('#pickup-time');
    slider.value = state.hour;
    slider.setAttribute('aria-valuetext', `${state.hour}:00`);
    document.querySelector('#time-output').textContent = `${state.hour}:00`;
    document.querySelector('[data-action="time-minus"]').disabled = state.hour === 8;
    document.querySelector('[data-action="time-plus"]').disabled = state.hour === 20;
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'menu') { const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(expanded)); document.querySelector('#site-nav').classList.toggle('is-open', expanded); }
    if (action === 'how') { if (currentPage() !== 'welcome') { history.pushState(null, '', '#welcome'); render(); } document.querySelector('#site-nav').classList.remove('is-open'); document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false'); document.querySelector('#how-it-works').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
    if (action === 'choose-tour') { state.route = Number(button.dataset.index); save(); }
    if (action === 'help') openDialog('A little help along the way', '<p>Choose your terrain and route, set your pickup and return dates, then find your bike. You can skip the personal questions or go back to change your choices.</p><p>Tap a route photo or a bike to select it. Your tour choices stay available in this browser tab.</p><p>This is an interactive demo of One way bike tours. Accounts, prices, insurance and payments are previews; no real reservation is made.</p>');
    if (action === 'terms') openDialog('Demo booking terms', '<p>This app is a booking prototype. Routes, prices, equipment and protection are illustrative and do not constitute an offer or confirmed availability.</p><p>No payment is collected and no reservation is sent. Personal information stays in memory and disappears when the page is reloaded.</p>');
    if (action === 'size-guide') openDialog('Find your size', '<p>Use this indicative guide to choose a comfortable frame. Exact sizing depends on the bike model.</p><table><thead><tr><th>Size</th><th>Rider height</th></tr></thead><tbody><tr><td>S</td><td>155–170 cm</td></tr><tr><td>M</td><td>170–185 cm</td></tr><tr><td>L +</td><td>185–200 cm</td></tr></tbody></table><p>Between sizes? A larger frame suits longer rides; a smaller frame offers more control.</p>');
    if (action === 'bike-info') openDialog('Made for the journey', `<p>${bikes[state.bike].description}</p><p>Choose your size, then add the equipment you need for your ride.</p>`);
    if (action === 'bike-frame') openDialog('A comfortable fit', '<p>Your frame size makes all the difference. Check the size guide before continuing and choose the size that matches your height.</p>');
    if (action === 'password') { const input = document.querySelector('#auth-password'); const visible = input.type === 'password'; input.type = visible ? 'text' : 'password'; button.textContent = visible ? 'Hide' : 'Show'; button.setAttribute('aria-pressed', String(visible)); }
    if (action === 'question-next') {
      const key = button.dataset.question;
      const custom = document.querySelector('#custom-answer');
      if (state.answers[key] === 'custom' && !custom.value.trim()) { custom.setCustomValidity('Please add your response or select another option.'); custom.reportValidity(); return; }
      if (key === 'company') state.bike = recommendation();
      save(); go(questions[key].next);
    }
    if (action === 'route-prev' || action === 'route-next') moveCarousel('route', action.endsWith('next') ? 1 : -1);
    if (action === 'bike-prev' || action === 'bike-next') moveCarousel('bike', action.endsWith('next') ? 1 : -1);
    if (action === 'bike-dot') { state.bike = Number(button.dataset.index); save(); render(true); announce(bikes[state.bike].name); }
    if (action === 'month-prev' || action === 'month-next') { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + (action.endsWith('next') ? 1 : -1), 1); render(true); announce(calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })); }
    if (action === 'date') {
      const key = button.dataset.date;
      if (!choosingEnd || key < state.start) { state.start = key; state.end = key; choosingEnd = true; }
      else { state.end = key; choosingEnd = false; }
      save(); render(true);
    }
    if (action === 'date-next') { choosingEnd = false; go('duration'); }
    if (action === 'time-minus' || action === 'time-plus') updateTime(state.hour + (action.endsWith('plus') ? 1 : -1));
    if (action === 'complete') {
      if (!details.firstName || !details.lastName || !details.email) {
        openDialog('Your details are still missing', '<p>Please add your personal information before completing the demo booking.</p><a class="primary" href="#details" data-close-dialog>Go to your details</a>');
        return;
      }
      completed = true; confirmationId = `DEMO-${Date.now().toString(36).toUpperCase()}`; go('confirmation');
    }
    if (action === 'download') {
      const text = ['ONE WAY BIKE TOURS — DEMO ITINERARY', confirmationId, '', routes[state.route].name, `${bookingMeta()} ${parseDate(state.start).getFullYear()}`, `Pickup: ${state.hour}:00`, `${bikes[state.bike].name} · Size ${state.size}`, `Equipment: ${equipment.filter(item => state.extras.includes(item.id)).map(item => item.name).join(', ') || 'None'}`, `Bike protection: ${state.protection ? 'Included' : 'Not selected'}`, `Demo total: ${money(total())}`, '', 'This is not a reservation. No payment was taken.'].join('\n');
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'one-way-demo-itinerary.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (action === 'restart') { state = defaults(); details = {}; completed = false; choosingEnd = false; calendarMonth = new Date(parseDate(state.start).getFullYear(), parseDate(state.start).getMonth(), 1); save(); go('terrain'); }
  });

  app.addEventListener('change', event => {
    const input = event.target;
    if (questions[input.name]) {
      state.answers[input.name] = input.value;
      const custom = document.querySelector('#custom-answer');
      custom.hidden = input.value !== 'custom';
      custom.setCustomValidity('');
      if (input.value === 'custom') custom.focus();
      if (input.name === 'terrain') state.bike = recommendation();
    }
    if (input.name === 'size') state.size = input.value;
    if (input.name === 'extra') { state.extras = input.checked ? [...new Set([...state.extras, input.value])] : state.extras.filter(id => id !== input.value); updateTotals(); announce(`Total ${money(total())}`); }
    if (input.name === 'protection') state.protection = input.value === 'yes';
    if (input.name === 'payment') { paymentMethod = input.value; render(true); }
    save();
  });
  app.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'pickup-time') updateTime(input.value);
    if (input.id === 'custom-answer') { state.custom[currentPage()] = input.value; input.setCustomValidity(''); save(); }
    if (input.closest('#details-form')) { details[input.name] = input.value; input.setCustomValidity(''); }
  });
  app.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'auth-form') { event.target.reset(); go('terrain'); announce('Demo session started. No account was created.'); }
    if (event.target.id === 'details-form') {
      const data = new FormData(event.target);
      for (const [key, value] of data) {
        if (!String(value).trim()) { const input = event.target.elements.namedItem(key); input.setCustomValidity('Please complete this field.'); input.reportValidity(); return; }
        details[key] = String(value).trim();
      }
      go('extras');
    }
  });
  app.addEventListener('keydown', event => {
    if (!event.target.closest('.route-carousel,.bike-carousel') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); moveCarousel(currentPage() === 'routes' ? 'route' : 'bike', event.key === 'ArrowRight' ? 1 : -1);
  });
  app.addEventListener('touchstart', event => { if (event.target.closest('.route-carousel,.bike-carousel')) carouselStartX = event.touches[0].clientX; }, { passive: true });
  app.addEventListener('touchend', event => {
    if (carouselStartX === null) return;
    const distance = event.changedTouches[0].clientX - carouselStartX;
    carouselStartX = null;
    if (Math.abs(distance) > 45) moveCarousel(currentPage() === 'routes' ? 'route' : 'bike', distance < 0 ? 1 : -1);
  }, { passive: true });
  dialog.addEventListener('click', event => { if (event.target.closest('[data-close-dialog]') || event.target === dialog) dialog.close(); });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); render(); });
  render();
})();
