# CLAUDE.md - Memoria del Proyecto Tiramisú CRM

## 📋 Descripción del Proyecto

**Tiramisú CRM** es un sistema de gestión integral para un negocio de tiramisú que incluye:
- Gestión de clientes (B2C y B2B)
- Sistema de pedidos con vista Kanban y Lista
- Dashboard con KPIs y análisis demográfico
- Inventario con control de stock y recetas
- Reportes exportables (Excel, PDF, XML)
- Configuración de catálogos (productos, sabores, canales)

**Base de datos:** Firebase Firestore (NoSQL, real-time)
**Autenticación:** Firebase Auth (Google Sign-In)

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Versión | Uso |
|------|-----------|---------|-----|
| **Frontend** | React | 18.2.0 | UI reactiva |
| **Lenguaje** | TypeScript | 5.2.2 | Tipado estático (strict mode) |
| **Build Tool** | Vite | 5.0.8 | Bundler ultrarrápido |
| **Backend** | Firebase | 10.7.0 | Auth + Firestore |
| **UI Library** | Ant Design | 5.13.0 | Componentes empresariales |
| **Estado** | @tanstack/react-query | 5.17.0 | Cache de datos async |
| **Router** | react-router-dom | 6.21.0 | Navegación SPA |
| **Gráficas** | recharts | 3.7.0 | Visualizaciones |
| **Fechas** | dayjs | 1.11.10 | Manejo de fechas |
| **DnD** | @dnd-kit | 6.1.0 / 8.0.0 | Drag & drop para Kanban |
| **Exportación** | jspdf, xlsx | 2.5.1 / 0.18.5 | Reportes |
| **PWA** | vite-plugin-pwa | 0.17.0 | Progressive Web App |

---

## 🔥 Firebase - Base de Datos

### Estructura de Firestore

**Arquitectura Multi-Tenant:**
```
users/
  {userId}/
    customers/
      {customerId} → Customer
    orders/
      {orderId} → Order
    products/
      {productId} → Product
    flavors/
      {flavorId} → Flavor
    channels/
      {channelId} → Channel
    inventory/
      {itemId} → InventoryItem
    movements/
      {movementId} → InventoryMovement
    recipes/
      {recipeId} → Recipe
```

**Ventajas de esta estructura:**
- Aislamiento total de datos por usuario
- Seguridad a nivel de Firestore Rules
- No necesitas WHERE userId en queries
- Escalable para múltiples usuarios

### Firestore Rules (Configuración Actual)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Importante:** Solo el usuario autenticado puede acceder a sus propios datos.

### Configuración de Firebase

Archivo: `src/lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Variables de entorno requeridas en `.env`:**
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   └── firebase.ts              # Config Firebase (auth, db)
├── components/
│   ├── auth/
│   │   └── AuthGate.tsx         # Context + Google login
│   ├── layout/
│   │   └── AppLayout.tsx        # Sider + Header + Outlet
│   └── ErrorBoundary.tsx        # Error handling global
├── features/                    # 🎯 FEATURE-BASED
│   ├── customers/
│   │   ├── CustomerList.tsx
│   │   └── components/
│   │       └── CustomerForm.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx    # KPIs + charts + insights
│   ├── inventory/
│   │   └── InventoryPage.tsx
│   ├── orders/
│   │   ├── OrdersPage.tsx
│   │   ├── OrderList.tsx
│   │   └── components/
│   │       ├── OrderForm.tsx
│   │       └── OrderKanbanBoard.tsx
│   ├── reports/
│   │   └── ReportsPage.tsx
│   └── settings/
│       ├── SettingsPage.tsx
│       └── components/
│           └── CatalogTable.tsx
├── hooks/
│   └── useFirestore.ts          # 🔥 Real-time + mutations
├── services/
│   └── exportService.ts         # Excel/PDF/XML
├── types/
│   └── index.ts                 # Interfaces TypeScript
├── utils/
│   ├── audit.ts                 # Audit fields helpers
│   ├── dateHelpers.ts           # toDay, getOrderDate
│   └── demographicsHelpers.ts   # computeDemographics
├── App.tsx                      # Root + routing
├── main.tsx                     # Entry point
└── index.css                    # Global styles
```

---

## 🎯 Patrones de Arquitectura

### 1. Feature-Based Structure

Cada módulo (customers, orders, etc.) contiene:
- Página principal
- Componentes específicos en `/components/`
- Lógica encapsulada

**Beneficio:** Escalabilidad y mantenibilidad.

### 2. Custom Hooks Pattern

**`useFirestore.ts`** - Hook principal para Firestore

#### **a) useFirestoreSubscription<T>**

```typescript
const { data, loading, error } = useFirestoreSubscription<Customer>('customers');
```

**Características:**
- Suscripción real-time con `onSnapshot`
- Auto-scoped a `users/{uid}/{collection}`
- Filtra `isDeleted: false` por defecto
- Memoiza constraints para evitar re-suscripciones

**Opciones:**
```typescript
// Incluir documentos eliminados
useFirestoreSubscription<T>('collection', [], { includeDeleted: true })

// Con constraints adicionales
useFirestoreSubscription<T>('orders', [where('status', '==', 'Entregado')])
```

#### **b) useFirestoreMutation<T>**

```typescript
const { add, update, softDelete } = useFirestoreMutation('customers');

// Crear
await add({ fullName: 'Juan', phone: '123456' });

// Actualizar
await update(id, { fullName: 'Juan Pérez' });

// Soft delete
await softDelete(id);
```

**Auto-inyecta:**
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- `isDeleted: true, deletedAt` en soft deletes

### 3. BaseEntity Pattern

Todas las entidades extienden `BaseEntity`:

```typescript
export interface BaseEntity {
    id: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    updatedBy: string;
    isDeleted?: boolean;
    deletedAt?: Timestamp;
}
```

**Beneficios:**
- Audit trail automático
- Soft deletes consistentes
- Trazabilidad de cambios

### 4. Soft Deletes (Nunca borramos físicamente)

```typescript
// ❌ NO hagas esto
await deleteDoc(doc(db, 'users', uid, 'customers', id));

// ✅ Siempre usa soft delete
await softDelete(id);
```

**Ventaja:** Los documentos eliminados no se consultan (query-level filtering).

### 5. Audit Trail Automático

Archivo: `src/utils/audit.ts`

```typescript
// Al crear
createAuditFields(uid) → {
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: uid,
  updatedBy: uid,
  isDeleted: false
}

// Al actualizar
updateAuditFields(uid) → {
  updatedAt: serverTimestamp(),
  updatedBy: uid
}

// Al eliminar (soft)
softDeleteFields(uid) → {
  isDeleted: true,
  deletedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  updatedBy: uid
}
```

### 6. Context API para Autenticación

Archivo: `src/components/auth/AuthGate.tsx`

```typescript
const { user, logout } = useAuth();
```

**Flujo:**
1. `onAuthStateChanged` detecta cambios en auth
2. Context propaga el estado de `user` a toda la app
3. Si no hay usuario → pantalla de login con Google
4. Si hay usuario → renderiza children

### 7. ErrorBoundary Global

Archivo: `src/components/ErrorBoundary.tsx`

Captura errores de rendering y muestra UI amigable con botón "Reintentar".

---

## 📊 Tipos y Estructuras de Datos

### Customer

```typescript
interface Customer extends BaseEntity {
    fullName: string;
    phone: string;
    mainContactMethod: 'Instagram' | 'WhatsApp' | 'Facebook' | 'Otro';
    gender?: 'M' | 'F' | 'Otro';
    age?: number;
    occupation?: string;
    civilStatus?: string;
    type: 'B2C' | 'B2B';
    email?: string;
    instagramHandle?: string;
    facebookLink?: string;
    colonia?: string;
    city?: string;
    notes?: string;
    tags?: string[];
    isActive: boolean;

    // Métricas derivadas (calculadas en app)
    totalSpent?: number;
    ordersCount?: number;
    avgOrderValue?: number;
    lastDeliveredAt?: Timestamp;
}
```

### Order

```typescript
const ORDER_STATUSES = [
    'Pendiente',
    'Confirmado',
    'En preparación',
    'Listo para entregar',
    'Entregado',
    'Cancelado',
] as const;

type OrderStatus = typeof ORDER_STATUSES[number];

interface Order extends BaseEntity {
    customerId: string;
    customerName?: string;
    productId: string;
    productNameAtSale: string;
    flavorId: string;
    flavorNameAtSale: string;
    channelId: string;
    quantity: number;
    unitPriceAtSale: number;
    deliveryDate: Timestamp;
    deliveryMethod: 'Recoge' | 'Envío';
    shippingCost: number;
    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;
    extraCharges: number;
    extraChargesReason?: string;
    notes?: string;
    status: OrderStatus;

    // Calculated
    subtotal: number;
    discountAmount: number;
    total: number;
    deliveredAt?: Timestamp;
}
```

**Importante:** `productNameAtSale` y `flavorNameAtSale` son snapshots para evitar perder datos históricos si se cambia el catálogo.

### Product, Flavor, Channel (Catálogos)

```typescript
interface Product extends BaseEntity {
    name: string;
    price: number;
    isActive: boolean;
}

interface Flavor extends BaseEntity {
    name: string;
    isActive: boolean;
}

interface Channel extends BaseEntity {
    name: string;
    isActive: boolean;
}
```

### InventoryItem

```typescript
interface InventoryItem extends BaseEntity {
    name: string;
    category: string;
    purchaseUnitLabel: 'bolsa' | 'caja' | 'paquete' | 'cartera';
    packageSize: number;
    stockPackages: number;
    minPackages: number;
    supplier?: string;
    notes?: string;
    isActive: boolean;
}
```

### InventoryMovement

```typescript
interface InventoryMovement extends BaseEntity {
    itemId: string;
    itemName: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantityPackages: number;
    date: Timestamp;
    note?: string;
}
```

---

## 🔄 Flujo de Datos

### Lectura (Real-time)

```
Component
   ↓
useFirestoreSubscription('orders')
   ↓
onSnapshot(query(users/{uid}/orders))
   ↓
Firestore detecta cambios
   ↓
Component se re-renderiza automáticamente
```

### Escritura (Mutaciones)

```
Usuario hace click
   ↓
useFirestoreMutation.add/update()
   ↓
Auto-inyecta audit fields
   ↓
updateDoc(firestore)
   ↓
onSnapshot detecta cambio
   ↓
UI se actualiza automáticamente
```

**Importante:** No necesitas refetch manual, el real-time subscription se encarga.

---

## 🛠️ Convenciones de Código

### TypeScript

- **Modo strict activado** (`strict: true`)
- **Tipado explícito** en interfaces públicas
- **Usar `as const`** para enums y constantes tipadas
- **Evitar `any`**, usar `unknown` si es necesario

### Imports

```typescript
// ✅ Orden recomendado
import { useState } from 'react';                    // 1. React
import { Button } from 'antd';                       // 2. External libs
import { useAuth } from '../auth/AuthGate';          // 3. Internal modules
import { Customer } from '../../types';              // 4. Types
import './styles.css';                               // 5. Styles
```

### Naming

- **Componentes:** PascalCase (`CustomerForm`)
- **Hooks:** camelCase con prefijo `use` (`useFirestore`)
- **Utilities:** camelCase (`getOrderDate`)
- **Constantes:** UPPER_SNAKE_CASE (`ORDER_STATUSES`)
- **Tipos:** PascalCase (`OrderStatus`, `Customer`)

### Componentes

```typescript
// ✅ Functional components con TypeScript
export const CustomerList = () => {
    const { data, loading } = useFirestoreSubscription<Customer>('customers');

    // ...

    return (
        <div>...</div>
    );
};
```

### Manejo de Errores

```typescript
// ✅ Try-catch con mensajes de Ant Design
try {
    await update(id, values);
    message.success('Cliente actualizado');
} catch (error) {
    message.error('Error al actualizar');
    console.error(error);
}
```

### Fechas

```typescript
// ✅ Siempre usa dayjs
import dayjs from 'dayjs';

// ✅ Usa helpers para Timestamps
import { toDay, getOrderDate } from '../utils/dateHelpers';

const date = toDay(order.deliveryDate);
if (date) {
    console.log(date.format('DD/MM/YYYY'));
}
```

---

## 🚀 Cómo Trabajar con el Código

### Crear una Nueva Feature

1. **Crear carpeta en `features/`**
   ```
   features/
     nueva-feature/
       NuevaFeaturePage.tsx
       components/
         NuevaFeatureForm.tsx
   ```

2. **Agregar ruta en `App.tsx`**
   ```typescript
   <Route path="nueva-feature" element={<NuevaFeaturePage />} />
   ```

3. **Agregar al menú en `AppLayout.tsx`**
   ```typescript
   { key: '/nueva-feature', icon: <Icon />, label: 'Nueva Feature' }
   ```

### Agregar una Nueva Colección

1. **Definir tipo en `types/index.ts`**
   ```typescript
   export interface MiEntidad extends BaseEntity {
       campo: string;
   }
   ```

2. **Usar en componente**
   ```typescript
   const { data } = useFirestoreSubscription<MiEntidad>('mi-coleccion');
   const { add, update, softDelete } = useFirestoreMutation('mi-coleccion');
   ```

### Exportar Nuevos Reportes

Agregar función en `src/services/exportService.ts`:

```typescript
export function exportMiReporte(data: MiTipo[]) {
    // Lógica de exportación
}
```

---

## 🎨 UI/UX Patterns

### Ant Design

- **Configurado en español:** `<ConfigProvider locale={esES}>`
- **Componentes principales:** Table, Form, Modal, Drawer, Card, Button
- **Mensajes:** `message.success()`, `message.error()`
- **Confirmaciones:** `<Popconfirm>`

### Layout

- **AppLayout:** Sider colapsable + Header con avatar + Content
- **Responsive:** `<Col xs={24} md={12} lg={8}>` para grids adaptables

### Forms

```typescript
// ✅ Patrón de formulario con Drawer
<Drawer open={isOpen} onClose={onClose}>
    <Form onFinish={handleSubmit} initialValues={initialValues}>
        <Form.Item name="field" label="Label" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
    </Form>
</Drawer>
```

---

## 📈 Features Principales

### 1. Dashboard (`DashboardPage.tsx`)

- **KPIs:** Ventas totales, pedidos, ticket promedio, clientes únicos
- **Gráficas:** LineChart (tendencia), BarChart (productos), PieChart (demografía)
- **Insights:** Producto estrella, clientes inactivos (30+ días)
- **Filtros:** RangePicker para seleccionar periodo

### 2. Orders (`OrdersPage.tsx`)

- **Vista Kanban:** Drag & drop con `@dnd-kit`
- **Vista Lista:** Tabla con todas las columnas
- **Filtro mensual:** DatePicker de mes
- **Estados:** Kanban excluye "Cancelado"

### 3. Customers (`CustomerList.tsx`)

- CRUD completo
- Búsqueda por nombre/teléfono
- Tags personalizados
- Métricas derivadas (calculadas en cliente)

### 4. Reports (`ReportsPage.tsx`)

- **Excel:** Pedidos + Clientes (2 hojas)
- **PDF:** Corte de caja con jsPDF + autoTable
- **XML:** Exportación de clientes con estructura jerárquica

### 5. Inventory (`InventoryPage.tsx`)

- Control de stock por paquetes
- Movimientos (IN/OUT/ADJUST)
- Recetas con ingredientes
- Alertas de stock mínimo

---

## 🔒 Seguridad

### Firebase Auth

- **Google Sign-In** configurado
- `onAuthStateChanged` mantiene sincronización
- Logout: `signOut(auth)`

### Firestore Rules

```javascript
// Solo el usuario puede acceder a sus datos
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

### Validaciones

- **Client-side:** Ant Design Form rules
- **Server-side:** Firestore Rules garantizan seguridad

---

## 📦 Scripts Disponibles

```bash
npm run dev       # Dev server (localhost:5173)
npm run build     # Build producción (tsc + vite)
npm run preview   # Preview del build
npm run lint      # ESLint
firebase deploy   # Deploy a Firebase Hosting
```

---

## ⚠️ Consideraciones Importantes

### ❌ NO hagas esto:

1. **No borres documentos físicamente**
   ```typescript
   await deleteDoc(...) // ❌
   ```
   Usa siempre `softDelete(id)` ✅

2. **No ignores audit fields**
   Los helpers `createAuditFields` y `updateAuditFields` son obligatorios.

3. **No hagas queries sin filtrar isDeleted**
   El hook lo hace automáticamente, pero si usas Firestore directo:
   ```typescript
   where('isDeleted', '==', false) // ✅
   ```

4. **No guardes referencias hardcodeadas**
   ```typescript
   productName: product.name // ❌ Se pierde si cambia el catálogo
   productNameAtSale: product.name // ✅ Snapshot histórico
   ```

5. **No uses `any` en TypeScript**
   ```typescript
   const data: any = ... // ❌
   const data: Customer = ... // ✅
   ```

### ✅ Buenas Prácticas:

1. **Usa memoización para cálculos pesados**
   ```typescript
   const metrics = useMemo(() => computeMetrics(orders), [orders]);
   ```

2. **Maneja estados de carga**
   ```typescript
   if (loading) return <Spin />;
   if (error) return <Alert />;
   ```

3. **Valida datos en formularios**
   ```typescript
   <Form.Item rules={[{ required: true, message: 'Campo requerido' }]}>
   ```

4. **Usa constants tipadas**
   ```typescript
   const ORDER_STATUSES = [...] as const;
   type OrderStatus = typeof ORDER_STATUSES[number];
   ```

---

## 🐛 Debugging

### Firebase

```typescript
// Ver queries en consola
import { enableIndexedDbPersistence } from 'firebase/firestore';
enableIndexedDbPersistence(db); // Offline support
```

### React

- Usa React DevTools
- ErrorBoundary captura errores de render
- Console logs en `componentDidCatch`

---

## 🚀 Próximas Mejoras Potenciales

- [ ] Notificaciones push (Firebase Cloud Messaging)
- [ ] Backup automático de Firestore
- [ ] Dashboard de administrador multi-usuario
- [ ] Integración con WhatsApp Business API
- [ ] Sistema de permisos granular (roles)
- [ ] Optimistic UI updates
- [ ] Tests unitarios (Jest + Testing Library)
- [ ] Tests E2E (Playwright)

---

## 📚 Recursos

- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Ant Design](https://ant.design/)
- [React Query](https://tanstack.com/query)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🤝 Principios de Desarrollo

1. **Simplicidad:** Prefiere código simple sobre "clever code"
2. **Tipado:** TypeScript strict sin excepciones
3. **Consistencia:** Sigue los patrones establecidos
4. **Real-time:** Aprovecha onSnapshot de Firestore
5. **Auditoría:** Siempre usa audit fields
6. **Seguridad:** Nunca expongas datos entre usuarios
7. **UX:** Feedback inmediato con message.success/error

---

**Última actualización:** 2026-02-11
**Versión del proyecto:** 0.0.0 (pre-release)
