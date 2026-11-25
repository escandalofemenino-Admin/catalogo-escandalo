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
    .sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity) || (lineOrder[a.linea] ?? 9) - (lineOrder[b.linea] ?? 9) || a.nombre.localeCompare(b.nombre, "es"));

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
    const subtotal = product.precio * quantity;
    const discount = quantity >= 2 ? Math.round(subtotal * CONFIG.duoDiscount) : 0;
    const total = product.precio == null ? "Por confirmar" : money(subtotal - discount);
    return `Hola, Escándalo 💋 Quiero pedir este look:\n\n` +
      `• ${product.nombre} (${product.codigo})\n` +
      `• Talla: ${size}\n` +
      `• Cantidad: ${quantity}\n` +
      `• Precio unitario: ${money(product.precio)}\n` +
      `• Subtotal: ${money(subtotal)}\n` +
      (discount ? `• Descuento Dúo (10%): −${money(discount)}\n` : "") +
      `• Total estimado: ${total}\n• Envío no incluido; se confirma por WhatsApp.\n\n` +
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
    const sizeNote = sizeLabel(product);
    return `
      <article class="product-card product-card--v2" data-line="${product.linea}" data-code="${product.codigo}">
        <button class="product-media" type="button" data-open="${product.codigo}" aria-label="Ver detalles de ${product.nombre}">
          ${cardPicture(product.foto1, product.alt, "product-image--primary")}
          ${cardPicture(product.foto3 || product.foto2, `${product.alt}, detalle de textura`, "product-image--secondary", true)}
          ${product.etiqueta ? `<span class="product-tag">${product.etiqueta}</span>` : ""}
          <span class="image-hint" aria-hidden="true">＋</span>
        </button>
        <div class="product-info">
          <p class="product-line">${product.lineaNombre}</p>
          <h3>${product.nombre}</h3>
          <p class="product-price${priceClass}">${money(product.precio)}</p>
          <p class="product-size-note">${sizeNote}</p>
          <div class="card-actions">
            <button class="card-cta" type="button" data-open="${product.codigo}">
              <span>Ver y pedir</span><span class="card-cta-icon" aria-hidden="true"><svg class="kiss" viewBox="0 0 1230 789" aria-hidden="true" focusable="false"><use class="lip-up" href="#lab-up"/><use class="lip-low" href="#lab-low"/></svg></span>
            </button>
            <button class="card-duo" type="button" data-card-duo="${product.codigo}" aria-label="Agregar ${product.nombre} a mi pedido" title="Agregar a mi pedido">
              <span aria-hidden="true">＋</span><small>Agregar</small>
            </button>
          </div>
        </div>
      </article>`;
  }

  const duo = { items: [] };

  function loadDuo() {
    try {
      const saved = JSON.parse(sessionStorage.getItem("escandalo_duo_v1") || "[]");
      duo.items = saved.filter((item) => item && findProduct(item.codigo) && productSizes(findProduct(item.codigo)).includes(item.talla)).map((item) => ({ codigo: item.codigo, talla: item.talla, cantidad: Number.isInteger(item.cantidad) && item.cantidad > 0 ? item.cantidad : 1 }));
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
    const subtotal = products.reduce((sum, product, i) => sum + (product.precio || 0) * duo.items[i].cantidad, 0);
    const count = duo.items.reduce((sum, item) => sum + item.cantidad, 0);
    const discount = count >= 2 ? Math.round(subtotal * CONFIG.duoDiscount) : 0;
    return { products, count, subtotal, discount, total: subtotal - discount };
  }

  function addToDuo(product, size, quantity = 1) {
    const existing = duo.items.find((item) => item.codigo === product.codigo && item.talla === size);
    if (existing) existing.cantidad += quantity;
    else duo.items.push({ codigo: product.codigo, talla: size, cantidad: quantity });
    saveDuo();
    renderDuo();
    showToast(duoTotals().count >= 2 ? "Agregado. Tu pedido conserva el 10% de descuento." : "Agregado. Con una prenda más activas el 10%.");
  }

  function removeFromDuo(index) {
    duo.items.splice(index, 1);
    saveDuo();
    renderDuo();
  }

  function duoMessage() {
    const { products, subtotal, discount, total } = duoTotals();
    const lines = products.map((product, i) => `• ${product.nombre} (${product.codigo}) · Talla ${duo.items[i].talla} · Cantidad: ${duo.items[i].cantidad} · ${money(product.precio)} c/u · ${money(product.precio * duo.items[i].cantidad)}`).join("\n");
    return `Hola, Escándalo 💋 Quiero pedir:\n\n${lines}\n\nSubtotal: ${money(subtotal)}${discount ? `\nDescuento Dúo (${Math.round(CONFIG.duoDiscount * 100)}%): −${money(discount)}` : ""}\nTotal estimado: ${money(total)}\nEnvío no incluido; se confirma por WhatsApp.\n\n¿Están disponibles? Quisiera confirmar envío y formas de pago.`;
  }

  function renderDuo() {
    let bar = $("#duoBar");
    if (!bar) {
      bar = document.createElement("aside");
      bar.id = "duoBar";
      bar.className = "duo-dock";
      bar.setAttribute("aria-label", "Tu pedido");
      document.body.appendChild(bar);
      bar.addEventListener("click", (event) => {
        const change = event.target.closest("[data-duo-change]");
        if (change) {
          const item = duo.items[Number(change.dataset.duoIndex)];
          item.cantidad = Math.max(1, item.cantidad + Number(change.dataset.duoChange));
          saveDuo();
          renderDuo();
          const direction = item.cantidad === 1 ? "1" : change.dataset.duoChange;
          $(`[data-duo-index="${change.dataset.duoIndex}"][data-duo-change="${direction}"]`, bar)?.focus();
        }
        const remove = event.target.closest("[data-duo-remove]");
        if (remove) {
          removeFromDuo(Number(remove.dataset.duoRemove));
          (duo.items.length ? $(".duo-details summary", bar) : $("[data-card-duo]"))?.focus();
        }
        if (event.target.closest("[data-duo-order]")) openWhatsApp(duoMessage());
      });
    }
    if (!duo.items.length) {
      bar.hidden = true;
      document.body.classList.remove("has-duo");
      return;
    }
    const expanded = $(".duo-details", bar)?.open;
    const { products, count, subtotal, total, discount } = duoTotals();
    bar.hidden = false;
    document.body.classList.add("has-duo");
    const chips = products.map((product, i) => `<div class="duo-chip"><span>${product.nombre}<small>Talla ${duo.items[i].talla} · ${money(product.precio)} c/u</small></span><div class="duo-item-controls"><button type="button" data-duo-index="${i}" data-duo-change="-1" aria-label="Restar ${product.nombre}" ${duo.items[i].cantidad === 1 ? "disabled" : ""}>−</button><span>${duo.items[i].cantidad}</span><button type="button" data-duo-index="${i}" data-duo-change="1" aria-label="Sumar ${product.nombre}">+</button><button type="button" data-duo-remove="${i}" aria-label="Quitar ${product.nombre}">×</button></div></div>`).join("");
    bar.innerHTML = `<div class="duo-dock-copy"><strong aria-live="polite">Tu pedido · ${count} ${count === 1 ? "prenda" : "prendas"} · ${money(total)}</strong><small>${discount ? `Subtotal ${money(subtotal)} · Ahorras ${money(discount)} (10%)` : "Agrega otra prenda y activa el 10%"}</small><details class="duo-details" ${expanded ? "open" : ""}><summary>Revisar y editar pedido</summary><div class="duo-chips">${chips}</div></details><small>Envío y disponibilidad se confirman por WhatsApp.</small></div><button class="button button--pink" type="button" data-duo-order>Pedir por WhatsApp <span aria-hidden="true">↗</span></button>`;
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
      const line = filter.dataset.filter;
      const total = line === "all" ? productos.length : productos.filter((product) => product.linea === line).length;
      if (!total && line !== "all") { filter.hidden = true; return; }
      filter.insertAdjacentHTML("beforeend", ` <span class="filter-count">${total}</span>`);
    });

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-card-duo]");
      if (!button) return;
      const product = findProduct(button.dataset.cardDuo);
      if (!product) return;
      addToDuo(product, productSizes(product)[0]);
      button.classList.remove("is-added");
      void button.offsetWidth;
      button.classList.add("is-added");
    });

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
      loadSecondary(media).then(() => {
        if (media.matches(":hover") && $(".product-image--secondary", media)?.naturalWidth) {
          media.classList.add("is-hovered");
        }
      });
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
    if (product.tallaUnica) return [product.tallaNota ? `Única ${product.tallaNota}` : "Única"];
    return ["S", "M", "L"];
  }

  function sizeLabel(product) {
    if (product.tallaUnica) return product.tallaNota ? `Talla única · ajusta ${product.tallaNota}` : "Talla única";
    return "Tallas S · M · L";
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
    const summary = $("[data-order-estimate]", button.closest("#dialogContent") || document);
    if (summary) {
      const subtotal = Number(summary.dataset.unitPrice) * next;
      const discount = next >= 2 ? Math.round(subtotal * CONFIG.duoDiscount) : 0;
      summary.textContent = `Total de este look: ${money(subtotal - discount)}${discount ? ` · Ahorras ${money(discount)} (10%)` : " · 10% desde 2 prendas"}. Envío no incluido.`;
    }
  }

  function openProduct(code, focusSize = false) {
    const product = findProduct(code);
    const dialog = $("#productDialog");
    const content = $("#dialogContent");
    if (!product || !dialog || !content) return;
    const images = [...new Set([product.foto1, product.foto2, product.foto3].filter(Boolean))];
    content.innerHTML = `
      <div class="dialog-layout">
        <div class="dialog-gallery">
          ${picture(product.foto1, product.alt, "dialog-image", "eager")}
          <p class="gallery-note" data-gallery-note hidden>Detalle de referencia</p>
          <div class="gallery-nav" ${images.length < 2 ? "hidden" : ""}>
            <button type="button" data-gallery="prev" aria-label="Foto anterior">←</button>
            <span class="gallery-count" data-gallery-count aria-live="polite">1 / ${images.length}</span>
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
            ${product.colores?.length ? `<li><span>Colores disponibles</span><strong>${product.colores.join(" · ")}</strong></li>` : ""}
            <li><span>Entrega</span><strong>Envíos a Colombia</strong></li>
            <li><span>Asesoría</span><strong>Por WhatsApp</strong></li>
          </ul>
          <div class="dialog-purchase-options">
            ${sizePicker(product)}
            ${quantityPicker()}
            <p class="order-estimate" data-order-estimate data-unit-price="${product.precio}" aria-live="polite">Total de este look: ${money(product.precio)} · 10% desde 2 prendas. Envío no incluido.</p>
          </div>
          <div class="dialog-actions">
            <button class="button button--wine button--wide order-button order-button--dialog" type="button" data-dialog-buy>
              <svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.1.8.83-3-.2-.31a8.2 8.2 0 1 1 6.97 3.84Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.66.31 2.8 2.8 0 0 0-.87 2.08 4.85 4.85 0 0 0 1.02 2.58c.12.16 1.77 2.7 4.29 3.79 1.6.69 2.22.75 3.02.63.49-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg><span>Pedir este look</span><span class="order-button-icon" aria-hidden="true"><svg class="kiss" viewBox="0 0 1230 789" aria-hidden="true" focusable="false"><use class="lip-up" href="#lab-up"/><use class="lip-low" href="#lab-low"/></svg></span>
            </button>
            <button class="button button--outline-wine button--wide dialog-duo-add" type="button" data-dialog-duo>＋ Agregar a mi pedido <small>(10% desde 2 prendas)</small></button>
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
    const count = $("[data-gallery-count]", content);
    const note = $("[data-gallery-note]", content);
    const showImage = (index) => {
      imageIndex = (index + images.length) % images.length;
      image.classList.remove("is-zoomed");
      image.src = `${images[imageIndex]}.jpg`;
      sourceElement.srcset = `${images[imageIndex]}.webp`;
      image.alt = images[imageIndex] === product.foto3 ? `${product.nombre}: detalle de tela y costuras` : imageIndex === 0 ? product.alt : `${product.alt}, vista de producto`;
      count.textContent = `${imageIndex + 1} / ${images.length}`;
      if (note) note.hidden = images[imageIndex] !== product.foto3;
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
        error.textContent = "Elige una talla para agregarla a tu pedido.";
        $('input[name="product-size"]', content)?.focus();
        return;
      }
      error.textContent = "";
      addToDuo(product, selected.value, quantityValue(content));
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
    dialog.scrollTop = 0;
    requestAnimationFrame(() => { dialog.scrollTop = 0; });
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
    const formatPhone = (value) => {
      const d = normalizePhone(value);
      return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");
    };
    phone.addEventListener("input", () => {
      phone.value = formatPhone(phone.value);
      error.textContent = "";
      form.classList.toggle("is-valid", validPhone(phone.value));
    });
    consent.addEventListener("change", () => { error.textContent = ""; });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validPhone(phone.value)) {
        error.textContent = "Revisa tu número: son 10 dígitos y empieza por 3.";
        phone.focus();
        return;
      }
      if (!consent.checked) {
        error.textContent = "Marca la casilla para poder escribirte.";
        return;
      }
      form.classList.add("is-sending");
      await saveLead(normalizePhone(phone.value));
      form.hidden = true;
      const done = $(".vip2-done", lead);
      if (done) done.hidden = false;
      lead.classList.add("is-done");
      showToast("Ya estás en la lista. Bienvenida a Escándalo 💋");
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

  function setupTrustTabs() {
    const tabs = $$("[data-trust-tab]");
    if (!tabs.length) return;
    const select = (tab) => {
      tabs.forEach((item) => {
        const on = item === tab;
        item.setAttribute("aria-selected", String(on));
        item.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(item.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        const next = tabs[(i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
    select(tabs[0]);
  }

  function loadLipsSprite() {
    if (document.getElementById("lab-up")) return;
    fetch("assets/img/labios.svg?v=1")
      .then((response) => (response.ok ? response.text() : ""))
      .then((svg) => {
        if (!svg) return;
        const holder = document.createElement("div");
        holder.innerHTML = svg;
        document.body.prepend(holder.firstElementChild);
      })
      .catch(() => {});
  }

  function setupKissMotion() {
    document.addEventListener("pointerdown", (event) => {
      const button = event.target.closest(".card-cta, .order-button--dialog, .vip2-submit");
      if (!button) return;
      button.classList.remove("is-kissing");
      void button.offsetWidth;
      button.classList.add("is-kissing");
      setTimeout(() => button.classList.remove("is-kissing"), 600);
    });
  }

  function init() {
    setupBrandIntro();
    loadLipsSprite();
    setupKissMotion();
    setupWhatsAppLinks();
    setupTrustTabs();
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
