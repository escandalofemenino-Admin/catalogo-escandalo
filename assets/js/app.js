(() => {
  "use strict";

  const CONFIG = {
    whatsapp: "573046425299",
    instagram: "escandalo.femenino",
    leadEndpoint: "",
    metaPixelId: "",
    benefit: "acceso VIP a novedades y lanzamientos",
    duoDiscount: 0.10
  };

  const STORAGE = {
    registered: "escandalo_registered_v1",
    lead: "escandalo_lead_v1",
    queue: "escandalo_lead_queue_v1"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const source = new URLSearchParams(window.location.search).get("utm_source") || "directo";
  const campaign = new URLSearchParams(window.location.search).get("utm_campaign") || "";
  const lineOrder = { pantalon: 0, athleisure: 1, sexys: 2, swim: 3 };
  const productos = (window.PRODUCTOS_ESCANDALO || [])
    .filter((product) => product.activo)
    .sort((a, b) => (lineOrder[a.linea] ?? 9) - (lineOrder[b.linea] ?? 9));

  function money(value) {
    return value == null ? "Precio por confirmar" : `$${new Intl.NumberFormat("es-CO").format(value)}`;
  }

  function picture(path, alt, className = "", loading = "lazy", width = 1400, height = 1750) {
    if (!path) return "";
    return `
      <picture>
        <source srcset="${path}.webp" type="image/webp">
        <img class="${className}" src="${path}.jpg" alt="${alt}" loading="${loading}" width="${width}" height="${height}">
      </picture>`;
  }

  function cardPicture(path, alt, className, deferred = false) {
    if (!path) return "";
    const cardPath = `${path}-card`;
    if (!deferred) return picture(cardPath, alt, className, "lazy", 480, 600);
    return `
      <picture data-deferred-picture>
        <source data-srcset="${cardPath}.webp" type="image/webp">
        <img class="${className}" data-src="${cardPath}.jpg" alt="" aria-hidden="true" width="480" height="600">
      </picture>`;
  }

  function loadSecondary(media) {
    const deferred = $("[data-deferred-picture]", media);
    const image = $(".product-image--secondary", media);
    if (!deferred || !image) return Promise.resolve();
    const sourceElement = $("source", deferred);
    if (sourceElement.dataset.srcset) {
      sourceElement.srcset = sourceElement.dataset.srcset;
      delete sourceElement.dataset.srcset;
    }
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
    if (image.complete && image.naturalWidth) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  function waUrl(message) {
    const origin = `Origen: catálogo web${source !== "directo" ? ` · ${source}` : ""}${campaign ? ` · ${campaign}` : ""}`;
    const withSource = `${message}\n\n${origin}`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(withSource)}`;
  }

  function openWhatsApp(message) {
    window.open(waUrl(message), "_blank", "noopener");
  }

  function productMessage(product, size, quantity) {
    const total = product.precio == null ? "Por confirmar" : money(product.precio * quantity);
    return `Hola, Escándalo 💋 Quiero pedir este look:\n\n` +
      `• ${product.nombre} (${product.codigo})\n` +
      `• Talla: ${size}\n` +
      `• Cantidad: ${quantity}\n` +
      `• Precio unitario: ${money(product.precio)}\n` +
      `• Total estimado: ${total}\n\n` +
      `¿Está disponible? También quisiera confirmar el envío a mi ciudad y las formas de pago.`;
  }

  function safeGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // El catálogo nunca se bloquea si el navegador impide el almacenamiento.
    }
  }

  function normalizePhone(value) {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  function validPhone(value) {
    return /^3\d{9}$/.test(normalizePhone(value));
  }

  async function transmitLead(payload) {
    if (!CONFIG.leadEndpoint) return false;
    try {
      await fetch(CONFIG.leadEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        keepalive: true
      });
      return true;
    } catch {
      return false;
    }
  }

  async function saveLead(phone, name = "") {
    const payload = {
      telefono: `57${normalizePhone(phone)}`,
      nombre: name.trim(),
      fecha: new Date().toISOString(),
      utm_source: source,
      utm_campaign: campaign
    };
    safeSet(STORAGE.registered, true);
    safeSet(STORAGE.lead, payload);
    const sent = await transmitLead(payload);
    if (!sent && CONFIG.leadEndpoint) {
      const queue = safeGet(STORAGE.queue, []);
      queue.push(payload);
      safeSet(STORAGE.queue, queue.slice(-20));
    }
    if (typeof window.fbq === "function") window.fbq("track", "Lead");
    return payload;
  }

  async function retryQueue() {
    if (!CONFIG.leadEndpoint) return;
    const queue = safeGet(STORAGE.queue, []);
    if (!queue.length) return;
    const pending = [];
    for (const lead of queue) {
      if (!(await transmitLead(lead))) pending.push(lead);
    }
    safeSet(STORAGE.queue, pending);
  }

  function setupWhatsAppLinks() {
    $$('[data-whatsapp="general"]').forEach((link) => {
      link.href = waUrl("Hola, equipo Escándalo 💋 Estoy viendo la colección y quiero ayuda para elegir talla y confirmar disponibilidad.");
      link.target = "_blank";
      link.rel = "noopener";
    });
    $$('[data-whatsapp="vip"]').forEach((link) => {
      link.href = waUrl("Hola, equipo Escándalo 💋 Quiero entrar a la lista privada y recibir primero las nuevas referencias.");
      link.target = "_blank";
      link.rel = "noopener";
    });
    const floating = $('[data-whatsapp="button"]');
    if (floating) {
      floating.addEventListener("click", () => openWhatsApp("Hola, equipo Escándalo 💋 Quiero asesoría para elegir mi look y mi talla."));
    }
  }

  function setupLeadGate() {
    const form = $("#leadForm");
    if (!form) return;
    if (safeGet(STORAGE.registered, false)) {
      window.location.replace(`catalogo.html${window.location.search}`);
      return;
    }

    const phone = $("#telefono");
    const consent = $("#consentimiento");
    const phoneError = $("#phoneError");
    const consentError = $("#consentError");
    const name = $("#nombre");

    phone.addEventListener("input", () => {
      phone.value = normalizePhone(phone.value);
      phoneError.textContent = "";
    });
    consent.addEventListener("change", () => {
      consentError.textContent = "";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const phoneIsValid = validPhone(phone.value);
      const consentIsValid = consent.checked;
      phoneError.textContent = phoneIsValid ? "" : "Revisa el número: debe tener 10 dígitos y empezar por 3.";
      consentError.textContent = consentIsValid ? "" : "Necesitamos tu autorización para guardar el número.";
      if (!phoneIsValid || !consentIsValid) return;
      await saveLead(phone.value, name ? name.value : "");
      window.location.assign(`catalogo.html${window.location.search}`);
    });
  }

  function card(product) {
    const priceClass = product.precio == null ? " product-price--pending" : "";
    const sizeNote = product.tallaUnica ? "Talla única" : "Tallas S · M · L";
    return `
      <article class="product-card product-card--v2" data-line="${product.linea}" data-code="${product.codigo}">
        <button class="product-media" type="button" data-open="${product.codigo}" aria-label="Ver detalles de ${product.nombre}">
          ${cardPicture(product.foto1, product.alt, "product-image--primary")}
          ${cardPicture(product.foto2, `${product.alt}, vista de producto`, "product-image--secondary", true)}
          ${product.etiqueta ? `<span class="product-tag">${product.etiqueta}</span>` : ""}
          <span class="image-hint" aria-hidden="true">＋</span>
        </button>
        <div class="product-info">
          <p class="product-line">${product.lineaNombre}</p>
          <h3>${product.nombre}</h3>
          <p class="product-price${priceClass}">${money(product.precio)}</p>
          <p class="product-size-note">${sizeNote}</p>
          <button class="button button--wine order-button card-open" type="button" data-open="${product.codigo}">
            <span>Ver y pedir</span><span class="order-button-icon" aria-hidden="true">↗</span>
          </button>
        </div>
      </article>`;
  }

  const duo = { items: [] };

  function loadDuo() {
    try {
      const saved = JSON.parse(sessionStorage.getItem("escandalo_duo_v1") || "[]");
      duo.items = saved.filter((item) => findProduct(item.codigo)).slice(0, 2);
    } catch (_) {
      duo.items = [];
    }
  }

  function saveDuo() {
    try {
      sessionStorage.setItem("escandalo_duo_v1", JSON.stringify(duo.items));
    } catch (_) {
      // El Dúo funciona en memoria si el navegador bloquea el almacenamiento.
    }
  }

  function duoTotals() {
    const products = duo.items.map((item) => findProduct(item.codigo));
    const subtotal = products.reduce((sum, product) => sum + (product.precio || 0), 0);
    const discount = duo.items.length === 2 ? Math.round(subtotal * CONFIG.duoDiscount) : 0;
    return { products, subtotal, discount, total: subtotal - discount };
  }

  function addToDuo(product, size) {
    if (duo.items.length >= 2) duo.items.shift();
    duo.items.push({ codigo: product.codigo, talla: size });
    saveDuo();
    renderDuo();
    showToast(duo.items.length === 2 ? "¡Tu Dúo está listo! Pídelo con el 10%." : "Agregado. Elige una prenda más para tu Dúo.");
  }

  function removeFromDuo(index) {
    duo.items.splice(index, 1);
    saveDuo();
    renderDuo();
  }

  function duoMessage() {
    const { products, subtotal, discount, total } = duoTotals();
    const lines = products.map((product, i) => `• ${product.nombre} (${product.codigo}) · Talla ${duo.items[i].talla} · ${money(product.precio)}`).join("\n");
    return `Hola, Escándalo 💋 Quiero pedir mi Dúo:\n\n${lines}\n\nSubtotal: ${money(subtotal)}\nDescuento Dúo (${Math.round(CONFIG.duoDiscount * 100)}%): −${money(discount)}\nTotal estimado: ${money(total)}\n\n¿Están disponibles? Quisiera confirmar envío y formas de pago.`;
  }

  function renderDuo() {
    let bar = $("#duoBar");
    if (!bar) {
      bar = document.createElement("aside");
      bar.id = "duoBar";
      bar.className = "duo-dock";
      bar.setAttribute("aria-label", "Tu Dúo");
      document.body.appendChild(bar);
      bar.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-duo-remove]");
        if (remove) removeFromDuo(Number(remove.dataset.duoRemove));
        if (event.target.closest("[data-duo-order]")) openWhatsApp(duoMessage());
      });
    }
    if (!duo.items.length) {
      bar.hidden = true;
      document.body.classList.remove("has-duo");
      return;
    }
    const { products, total, discount } = duoTotals();
    bar.hidden = false;
    document.body.classList.add("has-duo");
    const chips = products.map((product, i) => `<span class="duo-chip">${product.nombre}<button type="button" data-duo-remove="${i}" aria-label="Quitar ${product.nombre}">×</button></span>`).join("");
    bar.innerHTML = duo.items.length === 2
      ? `<div class="duo-dock-copy"><strong>Tu Dúo · ${money(total)}</strong><small>Ahorras ${money(discount)}</small><div class="duo-chips">${chips}</div></div>
         <button class="button button--pink" type="button" data-duo-order>Pedir mi Dúo <span aria-hidden="true">↗</span></button>`
      : `<div class="duo-dock-copy"><strong>Tu Dúo · 1 de 2</strong><small>Elige otra prenda y llévalas con ${Math.round(CONFIG.duoDiscount * 100)}%</small><div class="duo-chips">${chips}</div></div>
         <a class="button button--outline-cream" href="#productos">Elegir otra</a>`;
  }

  function findProduct(code) {
    return productos.find((product) => product.codigo === code);
  }

  function setupCatalog() {
    const grid = $("#productGrid");
    if (!grid) return;
    grid.innerHTML = productos.map(card).join("");
    observeReveals();

    $$(".filter").forEach((filter) => {
      filter.addEventListener("click", () => {
        $$(".filter").forEach((item) => {
          const selected = item === filter;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        const line = filter.dataset.filter;
        $$(".product-card", grid).forEach((item) => {
          const show = line === "all" || item.dataset.line === line;
          item.hidden = !show;
        });
      });
    });

    let pointerStart = null;
    grid.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      const media = event.target.closest(".product-media");
      if (!media || media.contains(event.relatedTarget)) return;
      loadSecondary(media).then(() => media.classList.add("is-hovered"));
    });
    grid.addEventListener("pointerout", (event) => {
      const media = event.target.closest(".product-media");
      if (!media || media.contains(event.relatedTarget)) return;
      media.classList.remove("is-hovered");
    });
    grid.addEventListener("pointerdown", (event) => {
      const media = event.target.closest(".product-media");
      if (media) pointerStart = { x: event.clientX, media };
    });
    grid.addEventListener("pointerup", (event) => {
      if (!pointerStart) return;
      const distance = event.clientX - pointerStart.x;
      if (Math.abs(distance) > 42) {
        const media = pointerStart.media;
        loadSecondary(media).then(() => media.classList.toggle("is-flipped", distance < 0));
        media.dataset.swiped = "true";
      }
      pointerStart = null;
    });

    grid.addEventListener("click", (event) => {
      const quantityButton = event.target.closest("[data-quantity-change]");
      if (quantityButton) {
        changeQuantity(quantityButton);
        return;
      }
      const media = event.target.closest("[data-open]");
      if (media) {
        if (media.dataset.swiped === "true") {
          delete media.dataset.swiped;
          return;
        }
        openProduct(media.dataset.open);
        return;
      }
    });
  }

  function productSizes(product) {
    return product.tallaUnica ? ["Única"] : ["S", "M", "L"];
  }

  function sizePicker(product, name = "product-size", compact = false) {
    const sizes = productSizes(product);
    const singleClass = sizes.length === 1 ? " size-picker--single" : "";
    return `<fieldset class="size-picker${compact ? " size-picker--compact" : ""}${singleClass}" data-size-picker>
      <legend>${sizes.length === 1 ? "Talla" : "Elige tu talla"}</legend>
      <div class="size-options">
        ${sizes.map((size) => `<label><input type="radio" name="${name}" value="${size}" ${sizes.length === 1 ? "checked" : ""}><span>${size}</span></label>`).join("")}
      </div>
      ${compact ? "" : '<p class="size-error" role="alert"></p>'}
    </fieldset>`;
  }

  function quantityPicker() {
    return `<div class="quantity-picker" data-quantity-picker>
      <span>Cantidad</span>
      <div class="quantity-controls">
        <button type="button" data-quantity-change="-1" aria-label="Restar una unidad">−</button>
        <output data-quantity-value aria-live="polite">1</output>
        <button type="button" data-quantity-change="1" aria-label="Sumar una unidad">+</button>
      </div>
    </div>`;
  }

  function quantityValue(root) {
    return Number($("[data-quantity-value]", root)?.textContent || 1);
  }

  function changeQuantity(button) {
    const picker = button.closest("[data-quantity-picker]");
    const output = $("[data-quantity-value]", picker);
    const next = Math.min(9, Math.max(1, Number(output.textContent) + Number(button.dataset.quantityChange)));
    output.textContent = String(next);
  }

  function openProduct(code, focusSize = false) {
    const product = findProduct(code);
    const dialog = $("#productDialog");
    const content = $("#dialogContent");
    if (!product || !dialog || !content) return;
    content.innerHTML = `
      <div class="dialog-layout">
        <div class="dialog-gallery">
          ${picture(product.foto1, product.alt, "dialog-image", "eager")}
          <div class="gallery-nav" ${product.foto1 === product.foto2 ? "hidden" : ""}>
            <button type="button" data-gallery="prev" aria-label="Foto anterior">←</button>
            <button type="button" data-gallery="next" aria-label="Foto siguiente">→</button>
          </div>
        </div>
        <div class="dialog-info">
          <p class="eyebrow eyebrow--wine">${product.codigo} · ${product.lineaNombre}</p>
          <h2 id="dialogTitle">${product.nombre}</h2>
          <p class="dialog-price">${money(product.precio)}</p>
          <p class="dialog-description">${product.descripcion}</p>
          <ul class="dialog-detail-list">
            <li><span>Incluye</span><strong>${product.detalle.split(" · ")[0]}</strong></li>
            <li><span>Entrega</span><strong>Envíos a Colombia</strong></li>
            <li><span>Asesoría</span><strong>Por WhatsApp</strong></li>
          </ul>
          <div class="dialog-purchase-options">
            ${sizePicker(product)}
            ${quantityPicker()}
          </div>
          <div class="dialog-actions">
            <button class="button button--wine button--wide order-button order-button--dialog" type="button" data-dialog-buy>
              <span>Pedir por WhatsApp</span><span class="order-button-icon" aria-hidden="true">↗</span>
            </button>
            <button class="button button--outline-wine button--wide dialog-duo-add" type="button" data-dialog-duo>＋ Agregar a mi Dúo <small>(2 prendas con ${Math.round(CONFIG.duoDiscount * 100)}%)</small></button>
            <button class="size-guide-button" type="button" data-size-guide>Ver guía de tallas</button>
          </div>
          <picture class="size-guide" hidden>
            <source srcset="assets/img/guia-tallas.webp" type="image/webp">
            <img src="assets/img/guia-tallas.jpg" alt="Guía de tallas de Escándalo Boutique" loading="lazy" width="1080" height="1350">
          </picture>
        </div>
      </div>`;

    let imageIndex = 0;
    const image = $(".dialog-image", content);
    const sourceElement = $(".dialog-gallery source", content);
    const images = [product.foto1, product.foto2];
    const showImage = (index) => {
      imageIndex = (index + images.length) % images.length;
      image.classList.remove("is-zoomed");
      image.src = `${images[imageIndex]}.jpg`;
      sourceElement.srcset = `${images[imageIndex]}.webp`;
    };
    $$('[data-gallery]', content).forEach((button) => {
      button.addEventListener("click", () => showImage(imageIndex + (button.dataset.gallery === "next" ? 1 : -1)));
    });
    image.addEventListener("click", () => image.classList.toggle("is-zoomed"));
    $('[data-dialog-buy]', content).addEventListener("click", () => {
      const selected = $('input[name="product-size"]:checked', content);
      const error = $(".size-error", content);
      if (!selected) {
        error.textContent = "Elige una talla para continuar.";
        $('input[name="product-size"]', content)?.focus();
        return;
      }
      error.textContent = "";
      openWhatsApp(productMessage(product, selected.value, quantityValue(content)));
    });
    $('[data-dialog-duo]', content).addEventListener("click", () => {
      const selected = $('input[name="product-size"]:checked', content);
      const error = $(".size-error", content);
      if (!selected) {
        error.textContent = "Elige una talla para agregarla a tu Dúo.";
        $('input[name="product-size"]', content)?.focus();
        return;
      }
      error.textContent = "";
      addToDuo(product, selected.value);
      dialog.close();
    });
    $$('.size-options input', content).forEach((input) => {
      input.addEventListener("change", () => { $(".size-error", content).textContent = ""; });
    });
    $$('[data-quantity-change]', content).forEach((button) => {
      button.addEventListener("click", () => changeQuantity(button));
    });
    $('[data-size-guide]', content).addEventListener("click", (event) => {
      const guide = $(".size-guide", content);
      guide.hidden = !guide.hidden;
      event.currentTarget.textContent = guide.hidden ? "Ver guía de tallas" : "Ocultar guía de tallas";
    });

    dialog.showModal();
    document.body.classList.add("is-locked");
    if (focusSize && productSizes(product).length > 1) {
      setTimeout(() => $('input[name="product-size"]', content)?.focus(), 0);
    }
  }

  function setupDialog() {
    const dialog = $("#productDialog");
    if (!dialog) return;
    $('[data-close-dialog]', dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => document.body.classList.remove("is-locked"));
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function setupCatalogLead() {
    const lead = $("#heroLead");
    const registeredMeta = $("#heroRegisteredMeta");
    if (!lead) return;
    if (safeGet(STORAGE.registered, false)) {
      lead.hidden = true;
      if (registeredMeta) registeredMeta.hidden = false;
      return;
    }
    lead.hidden = false;
    if (registeredMeta) registeredMeta.hidden = true;

    const form = $("#catalogLeadForm");
    const phone = $("#catalogPhone");
    const consent = $("#catalogConsent");
    const error = $("#catalogLeadError");
    phone.addEventListener("input", () => { phone.value = normalizePhone(phone.value); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validPhone(phone.value)) {
        error.textContent = "Escribe un celular colombiano válido de 10 dígitos.";
        return;
      }
      if (!consent.checked) {
        error.textContent = "Acepta la política para guardar tu número.";
        return;
      }
      await saveLead(phone.value);
      lead.hidden = true;
      if (registeredMeta) registeredMeta.hidden = false;
      showToast("Ya estás en la lista. Bienvenida a Escándalo.");
    });
  }

  function observeReveals() {
    const items = $$(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
  }

  function setupBrandIntro() {
    const intro = $("#brandIntro");
    const root = document.documentElement;
    if (!intro || !root.classList.contains("brand-intro-ready")) return;
    try {
      sessionStorage.setItem("escandalo_brand_intro_v8", "true");
    } catch (_) {
      // La intro funciona aunque el navegador bloquee storage.
    }
    document.body.classList.add("has-brand-intro");

    const finish = () => {
      intro.hidden = true;
      document.body.classList.remove("has-brand-intro");
      root.classList.remove("brand-intro-ready");
    };
    if (typeof intro.animate !== "function") { finish(); return; }

    const q = (sel) => intro.querySelector(sel);
    const qa = (sel) => Array.from(intro.querySelectorAll(sel));
    const ease = "cubic-bezier(.16, 1, .3, 1)";
    const snap = "cubic-bezier(.76, 0, .24, 1)";
    const running = [];
    const play = (el, frames, opts) => {
      if (!el) return null;
      const a = el.animate(frames, Object.assign({ fill: "both" }, opts));
      running.push(a);
      return a;
    };

    // 1 · Ráfaga de flashes: las fotos se disparan como cámaras.
    const frame = q(".iv-frame");
    const photos = qa(".iv-frame img");
    const flash = q(".iv-flash");
    play(frame, [{ opacity: 0, transform: "scale(1.12) rotate(-2deg)" }, { opacity: 1, transform: "scale(1) rotate(-2deg)" }], { duration: 380, delay: 80, easing: ease });
    photos.forEach((img, i) => {
      const t = 120 + i * 190;
      play(img, [{ opacity: 0 }, { opacity: 1, offset: .01 }, { opacity: 1, offset: .99 }, { opacity: 0 }], { duration: 190, delay: t, fill: i === photos.length - 1 ? "forwards" : "both" });
      play(flash, [{ opacity: 0 }, { opacity: .5, offset: .25 }, { opacity: 0 }], { duration: 110, delay: t, fill: "none" });
    });

    // 2 · Las palabras entran con peso, una por golpe.
    qa(".iv-words span").forEach((w, i) => {
      play(w, [
        { opacity: 0, transform: "translateY(60%) skewY(6deg)", clipPath: "inset(100% 0 0 0)" },
        { opacity: 1, transform: "translateY(0) skewY(0)", clipPath: "inset(0 0 0 0)" }
      ], { duration: 460, delay: 160 + i * 230, easing: ease });
    });

    // 3 · Gran flash y aterriza VIBRA ALTO.
    const hit = 1000;
    play(flash, [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 0 }], { duration: 420, delay: hit - 40, fill: "none" });
    play(frame, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: hit, fill: "forwards" });
    play(q(".iv-words"), [{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: hit });
    play(q(".iv-vibra"), [
      { opacity: 0, transform: "scale(1.9) rotate(-9deg)" },
      { opacity: 1, transform: "scale(.94) rotate(-3deg)", offset: .55 },
      { opacity: 1, transform: "scale(1.02) rotate(-4deg)", offset: .8 },
      { opacity: 1, transform: "scale(1) rotate(-4deg)" }
    ], { duration: 640, delay: hit, easing: "cubic-bezier(.2, .9, .25, 1)" });
    play(q(".iv-stage"), [
      { transform: "translate(0, 0)" }, { transform: "translate(-6px, 4px)" }, { transform: "translate(5px, -3px)" },
      { transform: "translate(-3px, 2px)" }, { transform: "translate(0, 0)" }
    ], { duration: 260, delay: hit + 300, fill: "none" });
    play(q(".iv-logo"), [{ opacity: 0, transform: "translateY(12px)", letterSpacing: ".2em" }, { opacity: 1, transform: "translateY(0)", letterSpacing: "0" }], { duration: 520, delay: hit + 420, easing: ease });

    // 4 · Telón partido: la página aparece detrás.
    const exitAt = 2050;
    let done = false;
    const exit = (now) => {
      if (done) return;
      done = true;
      const d = now ? 0 : exitAt;
      play(q(".iv-stage"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.92)" }], { duration: 320, delay: d, easing: snap });
      play(q(".iv-panel--top"), [{ transform: "translateY(0)" }, { transform: "translateY(-101%)" }], { duration: 640, delay: d + 140, easing: snap });
      const last = play(q(".iv-panel--bottom"), [{ transform: "translateY(0)" }, { transform: "translateY(101%)" }], { duration: 640, delay: d + 140, easing: snap });
      play(q(".iv-skip"), [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: d });
      const main = document.querySelector("main");
      if (main) running.push(main.animate([{ transform: "scale(1.04)", opacity: .4 }, { transform: "scale(1)", opacity: 1 }], { duration: 760, delay: d + 140, easing: ease }));
      last.finished.then(finish).catch(() => {});
    };
    exit(false);
    const skip = q(".iv-skip");
    const skipNow = () => {
      running.forEach((a) => a.cancel());
      running.length = 0;
      done = false;
      exit(true);
    };
    if (skip) skip.addEventListener("click", skipNow, { once: true });
    intro.addEventListener("pointerdown", (e) => { if (e.target !== skip) skipNow(); }, { once: true });
  }

  function init() {
    setupBrandIntro();
    setupWhatsAppLinks();
    setupLeadGate();
    retryQueue();
    if ($("#productGrid")) {
      requestAnimationFrame(() => setTimeout(() => {
        setupCatalog();
        setupDialog();
        setupCatalogLead();
        loadDuo();
        renderDuo();
        observeReveals();
      }, 0));
    } else {
      observeReveals();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
