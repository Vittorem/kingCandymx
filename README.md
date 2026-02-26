# Tiramisú CRM

Sistema de gestión de clientes, pedidos, inventario y reportes para un negocio de tiramisú.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript (strict) |
| UI | Ant Design 5 |
| Build | Vite 5 + SWC |
| Backend | Firebase (Auth, Firestore) |
| Charts | Recharts |
| Exports | jsPDF, xlsx |
| PWA | vite-plugin-pwa |

## Estructura del Proyecto

```
src/
├── components/
│   ├── auth/          # AuthGate (Context + onAuthStateChanged)
│   ├── layout/        # AppLayout (Sider + Header + Outlet)
│   └── ErrorBoundary  # Catch-all para errores de render
├── features/
│   ├── customers/     # CRUD de clientes + formulario
│   ├── dashboard/     # KPIs, charts, insights, demografía
│   ├── inventory/     # Stock, movimientos, planificación
│   ├── orders/        # Kanban + Lista, formulario de pedidos
│   ├── reports/       # Exportaciones Excel/PDF/XML
│   └── settings/      # Catálogos (productos, sabores, canales)
├── hooks/
│   └── useFirestore   # Suscripción real-time + mutaciones
├── services/
│   └── exportService  # Lógica de exportación Excel/PDF/XML
├── types/
│   └── index.ts       # Interfaces, BaseEntity, ORDER_STATUSES
└── utils/
    ├── audit.ts       # Campos de auditoría (createdAt, updatedAt)
    ├── dateHelpers.ts  # getOrderDate, toDay, getDeliveredOrdersInRange
    └── demographicsHelpers.ts  # computeDemographics, getInactiveCustomers
```

## Configuración

1. Clona el repositorio
2. Copia `.env.example` a `.env` y configura tus credenciales de Firebase:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Instala dependencias:
   ```bash
   npm install
   ```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (localhost:5173) |
| `npm run build` | Build de producción (tsc + vite build) |
| `npm run preview` | Preview del build local |
| `firebase deploy` | Deploy a Firebase Hosting |

## Decisiones de Arquitectura

- **Firestore-level filtering**: Los documentos eliminados (`isDeleted: true`) se filtran a nivel de query, no en el cliente, ahorrando reads y bandwidth.
- **React Context para Auth**: `useAuth()` usa `onAuthStateChanged` para mantenerse sincronizado con Firebase Auth en todo momento.
- **ErrorBoundary**: Cualquier error de rendering muestra una pantalla de error amigable en vez de un crash.
- **Shared utilities**: La lógica duplicada (parsing de fechas, demografía, exportaciones) se centralizó en `utils/` y `services/`.
- **TypeScript strict**: El proyecto compila bajo `strict: true` con cero errores.
- **Constants**: Los estados de pedido (`ORDER_STATUSES`, `KANBAN_STATUSES`) son constantes tipadas, no strings hardcodeados.

## Reglas de Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Licencia

Privado — Uso interno.
