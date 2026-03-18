# King Candy — Landing & Mini-admin

Proyecto estático (HTML + Tailwind + JS) listo para Firebase Hosting. Incluye landing bilingüe (ES/EN), integración manual con Firestore para el contador de tiramisús vendidos y un mini-admin protegido por passcode.

## Estructura

```
public/
  index.html       # Landing principal
  admin.html       # Mini-admin del contador
  assets/
    hero-kraft.jpg
    logo-k.svg
    paper-texture.png
  js/
    i18n.js
    main.js
    admin.js
  styles/
    extras.css
```

## Requisitos previos

- Node.js 18+ (para herramientas de Firebase).
- Cuenta de Firebase con un proyecto creado.
- Firebase CLI (`npm install -g firebase-tools`).

## Pasos para desplegar en Firebase Hosting

1. Autentícate en Firebase CLI:
   ```bash
   firebase login
   ```
2. Inicializa Hosting en la raíz del repositorio y selecciona el proyecto correspondiente:
   ```bash
   firebase init hosting
   ```
   - Usa `public` como directorio público.
   - Configura como proyecto de una sola página (opcional).
3. Copia la configuración web de Firebase y reemplaza los valores `TODO_*` en:
   - `public/index.html`
   - `public/admin.html`
4. Configura Firestore en el proyecto y crea las reglas temporales recomendadas (solo para demo):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /metrics/{doc} {
         allow read: if true;
         allow write: if true;
       }
     }
   }
   ```
5. Crea la colección y documento inicial del contador (si no existe se autocrea con 261, pero es mejor asegurarlo):
   - Colección: `metrics`
   - Documento: `sales`
   - Campo numérico: `soldCount` con valor `261`
6. Lanza el despliegue:
   ```bash
   firebase deploy
   ```

## Configuración y funcionamiento

- **GA4**: El placeholder `G-XXXXXXX` se encuentra en `index.html`. Sustitúyelo por el ID real al activar analíticas.
- **Traducciones**: `i18n.js` expone los diccionarios y se reutiliza en landing y admin. El idioma se persiste en `localStorage` (`kc_lang`).
- **Landing (`index.html`)**:
  - CTA hacia WhatsApp con mensaje prellenado (`buildWhatsAppURL`).
  - Constructor de pedidos con cálculo de total y aviso de descuento del 10% para pedidos ≥ $300.
  - Contador en vivo desde Firestore (`metrics/sales.soldCount`). Si el documento no existe se crea con 261.
  - Banner de catering, timeline, FAQ y contacto, todos bilingües.
- **Mini-admin (`admin.html`)**:
  - Passcode: `Victor+1094`. Se guarda la sesión en `localStorage` (`kc_admin`).
  - Botones `+1`, `-1` (no permite bajar de 0) y formulario para fijar el contador manualmente.
  - Actualizaciones mediante `increment`/`setDoc` en Firestore.
  - Mensajes de estado traducidos y nota recordando migrar a Firebase Auth en producción.

## Personalización y calidad

- **Branding**: paleta definida (`#F9F0E1`, `#35281F`, `#CAA64E`, `#070707`) y tipografía Italiana para titulares.
- **Imágenes**: activos de ejemplo (`hero-kraft.jpg`, `paper-texture.png`, `logo-k.svg`). Sustituye por creativos oficiales si los tienes.
- **Accesibilidad**: controles con `focus-visible`, textos alternativos y contraste sobre fondo claro.
- **WhatsApp**: El módulo construye un mensaje detallado con cada ítem y total estimado; al superar $300 incluye la nota de descuento.

## Checklist para producción

- [ ] Sustituir configuraciones Firebase (`TODO_*`) en `index.html` y `admin.html`.
- [ ] Actualizar ID de GA4 (`G-XXXXXXX`).
- [ ] Reemplazar reglas de Firestore por políticas seguras y migrar mini-admin a Firebase Auth.
- [ ] Revisar y optimizar imágenes definitivas (peso y contenido).
- [ ] Ajustar enlaces legales (privacidad, cookies) y correo de contacto si cambian.
- [ ] Probar flujo de pedido y contador en un entorno de staging antes del despliegue.

## Notas finales

- Para previsualizar localmente sin Firebase puedes servir la carpeta `public` con cualquier servidor estático (`npx serve public`).
- El contador depende de Firestore; si no hay red o no se configuró Firebase, la UI muestra el fallback `261+`.
- El passcode del mini-admin es solo temporal. Implementa autenticación real (Firebase Auth + reglas restrictivas) antes de exponerlo públicamente.
