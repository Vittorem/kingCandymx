/**
 * King Candy - Checkout & Mercado Pago Integration
 * Productos: Bambino Plus ($100), Mediano ($500), Grande ($650)
 */

const CONFIG = {
  sellerPhone: '523121447493',
  products: {
    bambinoplus: {
      id: 'bambinoplus',
      name: 'Tiramisú Bambino Plus',
      serving: '8 oz · Individual Plus',
      price: 100,
      priceFormatted: '$100 MXN',
      image: './assets/bambinoPlus.png',
      mpLink: 'https://www.mercadopago.com.mx/checkout/v1/payment/redirect/fba947e9-931e-49c5-bee2-bdb459f52e49/review/?source=link&preference-id=319410546-593d6a13-1b5e-4eb9-8788-0156adceed17&router-request-id=86ca319f-0b61-4e47-aad6-60a4e494b3e6&p=d22824e8cfcbc7107138d7a9ab887c0f'
    },
    mediano: {
      id: 'mediano',
      name: 'Tiramisú Mediano',
      serving: '6-8 Personas',
      price: 500,
      priceFormatted: '$500 MXN',
      image: './assets/Mediano2.png',
      mpLink: 'https://www.mercadopago.com.mx/checkout/v1/payment/redirect/9c9469b5-3066-4c7c-9986-4a26a8e30fd2/review/?source=link&preference-id=319410546-f669829e-485c-4d3f-a123-5e0321644a49&router-request-id=f4174f81-400d-48a6-9b99-840f2ea36bb9&p=d22824e8cfcbc7107138d7a9ab887c0f'
    },
    grande: {
      id: 'grande',
      name: 'Tiramisú Grande',
      serving: '10-12 Personas',
      price: 650,
      priceFormatted: '$650 MXN',
      image: './assets/grande.png',
      mpLink: 'https://www.mercadopago.com.mx/checkout/v1/payment/redirect/22ec7dca-d819-437a-b9e7-081f7f594427/review/?source=link&preference-id=319410546-a2047ffb-237f-448a-a1ab-16dae6b23583&router-request-id=e62a1196-ee6b-4798-b852-100296fb622e&p=d22824e8cfcbc7107138d7a9ab887c0f'
    }
  }
};

let currentOrder = null;

// Helper: Generar Folio único
function generateFolio(productKey) {
  const prefix = productKey ? productKey.substring(0, 3).toUpperCase() : 'ORD';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `KC-${prefix}-${randomNum}`;
}

// Inicializar eventos de checkout
export function initCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  // Botones para abrir checkout
  document.querySelectorAll('[data-checkout-product]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-checkout-product');
      openCheckoutModal(productId);
    });
  });

  // Cerrar modal con botones de cerrar
  modal.querySelectorAll('.close-checkout-modal').forEach(btn => {
    btn.addEventListener('click', () => closeCheckoutModal());
  });

  // Cerrar al hacer clic en el backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCheckoutModal();
    }
  });

  // Escuchar cambio de método de entrega (Domicilio vs Pickup)
  const deliveryRadios = modal.querySelectorAll('input[name="deliveryType"]');
  const addressContainer = modal.querySelector('#addressContainer');
  deliveryRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'pickup') {
        addressContainer.classList.add('hidden');
        modal.querySelector('#customerAddress').removeAttribute('required');
      } else {
        addressContainer.classList.remove('hidden');
        modal.querySelector('#customerAddress').setAttribute('required', 'true');
      }
    });
  });

  // Enviar formulario de checkout (Paso 1)
  const form = modal.querySelector('#checkoutForm');
  if (form) {
    form.addEventListener('submit', handleCheckoutSubmit);
  }

  // Botón Reabrir Mercado Pago
  const reopenMpBtn = modal.querySelector('#reopenMpBtn');
  if (reopenMpBtn) {
    reopenMpBtn.addEventListener('click', () => {
      const productId = modal.getAttribute('data-active-product') || 'mediano';
      const product = CONFIG.products[productId] || CONFIG.products.mediano;
      window.open(product.mpLink, '_blank', 'noopener,noreferrer');
    });
  }

  // Botón Copiar Folio
  const copyFolioBtn = modal.querySelector('#copyFolioBtn');
  if (copyFolioBtn) {
    copyFolioBtn.addEventListener('click', () => {
      if (!currentOrder) return;
      navigator.clipboard.writeText(currentOrder.folio).then(() => {
        const originalText = copyFolioBtn.innerHTML;
        copyFolioBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-600 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ¡Copiado!
        `;
        setTimeout(() => {
          copyFolioBtn.innerHTML = originalText;
        }, 2000);
      });
    });
  }
}

export function openCheckoutModal(productId = 'mediano') {
  const product = CONFIG.products[productId] || CONFIG.products.mediano;
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  // Reset vista a Paso 1 (Formulario)
  modal.querySelector('#checkoutStepForm').classList.remove('hidden');
  modal.querySelector('#checkoutStepSuccess').classList.add('hidden');

  // Actualizar datos del producto en el modal
  modal.querySelector('#modalProductTitle').textContent = product.name;
  modal.querySelector('#modalProductServing').textContent = product.serving;
  modal.querySelector('#modalProductPrice').textContent = product.priceFormatted;
  modal.querySelector('#modalProductImg').src = product.image;
  modal.querySelector('#modalProductImg').alt = product.name;
  modal.querySelector('#modalTotalPay').textContent = product.priceFormatted;

  modal.setAttribute('data-active-product', product.id);

  // Mostrar modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

export function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

function handleCheckoutSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById('checkoutModal');
  const productId = modal.getAttribute('data-active-product') || 'mediano';
  const product = CONFIG.products[productId] || CONFIG.products.mediano;

  const name = modal.querySelector('#customerName').value.trim();
  const phone = modal.querySelector('#customerPhone').value.trim();
  const deliveryType = modal.querySelector('input[name="deliveryType"]:checked').value;
  const address = deliveryType === 'domicilio' 
    ? modal.querySelector('#customerAddress').value.trim() 
    : 'Punto de entrega / A coordinar por WhatsApp';
  const dateTime = modal.querySelector('#deliveryDateTime').value.trim();
  const notes = modal.querySelector('#orderNotes').value.trim();

  if (!name || !phone) {
    alert('Por favor completa tu nombre y número de teléfono.');
    return;
  }

  const folio = generateFolio(product.id);
  const now = new Date();
  const orderDate = now.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  currentOrder = {
    folio,
    productId: product.id,
    productName: product.name,
    productServing: product.serving,
    price: product.price,
    priceFormatted: product.priceFormatted,
    name,
    phone,
    deliveryType: deliveryType === 'domicilio' ? 'Envío a Domicilio' : 'Recoger en punto',
    address,
    dateTime: dateTime || 'Lo antes posible / A coordinar',
    notes: notes || 'Ninguna',
    createdAt: orderDate
  };

  // Guardar en localStorage para persistencia
  try {
    localStorage.setItem('kc_last_order', JSON.stringify(currentOrder));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage', err);
  }

  // 1. Abrir Mercado Pago en una pestaña nueva para que el cliente pague de inmediato
  window.open(product.mpLink, '_blank', 'noopener,noreferrer');

  // 2. Mostrar la pantalla de Espera de Comprobante / Validación (Paso 2)
  renderSuccessReceipt(currentOrder);
}

function renderSuccessReceipt(order) {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  modal.querySelector('#checkoutStepForm').classList.add('hidden');
  modal.querySelector('#checkoutStepSuccess').classList.remove('hidden');

  // Llenar campos del comprobante
  modal.querySelector('#receiptFolio').textContent = `#${order.folio}`;
  modal.querySelector('#receiptProductName').textContent = `${order.productName} (${order.productServing})`;
  modal.querySelector('#receiptTotal').textContent = order.priceFormatted;
  modal.querySelector('#receiptCustomerName').textContent = order.name;
  modal.querySelector('#receiptCustomerPhone').textContent = order.phone;
  modal.querySelector('#receiptDeliveryType').textContent = order.deliveryType;
  modal.querySelector('#receiptAddress').textContent = order.address;
  modal.querySelector('#receiptDateTime').textContent = order.dateTime;

  if (order.notes && order.notes !== 'Ninguna') {
    modal.querySelector('#receiptNotesRow').classList.remove('hidden');
    modal.querySelector('#receiptNotes').textContent = order.notes;
  } else {
    modal.querySelector('#receiptNotesRow').classList.add('hidden');
  }

  // Armar mensaje estructurado de WhatsApp
  const waText = encodeURIComponent(
`🍰 *¡HOLA KING CANDY! CONFIRMACIÓN DE PEDIDO* 🍰

📋 *Folio de Pedido:* #${order.folio}
💳 *Pago:* Mercado Pago (${order.priceFormatted})
🎂 *Producto:* ${order.productName} (${order.productServing})

👤 *Cliente:* ${order.name}
📱 *Teléfono:* ${order.phone}
🛵 *Método de entrega:* ${order.deliveryType}
📍 *Dirección:* ${order.address}
⏰ *Horario deseado:* ${order.dateTime}
📝 *Notas especiales:* ${order.notes}

📸 *COMPROBANTE:* (Adjunto la captura de pantalla de mi pago en Mercado Pago en este chat para iniciar la preparación)`
  );

  const waUrl = `https://wa.me/${CONFIG.sellerPhone}?text=${waText}`;
  const whatsappBtn = modal.querySelector('#receiptWhatsAppBtn');
  if (whatsappBtn) {
    whatsappBtn.href = waUrl;
  }
}

// Iniciar al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckout);
} else {
  initCheckout();
}
