# Clasificación de Datos Confirmados - Tiramisú CRM

Este documento define la clasificación de la información manejada por la aplicación, estableciendo qué niveles de protección son requeridos para diferentes conjuntos de datos acorde a las directivas de la auditoría de ciberseguridad.

## 1. PII Sensible (Personally Identifiable Information — Sensible)
**Nivel de Riesgo:** Alto
**Descripción:** Datos que por su naturaleza requieren protección y encriptación robusta bajo normativas de privacidad (GDPR, Leyes de Protección de Datos Locales).

**Datos Identificados en el Sistema:**
- Identificadores y Tokens de Autenticación de Usuarios (`uid` de Firebase Auth)
- Correos Electrónicos Privados del Staff
- *(A futuro)* Datos de pago o contraseñas en texto claro (No almacenados actualmente)

## 2. PII Operativa
**Nivel de Riesgo:** Medio
**Descripción:** Información y metadatos de los clientes utilizados exclusivamente para operar el negocio, hacer despachos y mantener contacto. El acceso debe restringirse al personal interno y a autenticación validada mediante reglas de Firestore.

**Datos Identificados en el Sistema:**
- Nombres completos de clientes (Ej. Juan Pérez).
- Números de teléfono personal o de WhatsApp.
- Direcciones o zonas de entrega (Ej. Colonia, Ciudad).
- Enlaces de perfiles de Redes Sociales (Instagram Handle, Facebook Link).
- Correos electrónicos de contacto de clientes.

## 3. Datos de Negocio Internos
**Nivel de Riesgo:** Medio/Bajo (Estratégico)
**Descripción:** Datos referenciales a los procesos de negocio, transaccionales e inventario que representan propiedad intelectual o estrategia comercial, aunque no sean PII directamente. 

**Datos Identificados en el Sistema:**
- Precios de Venta, Costos Unitarios de Ingredientes y Formulaciones de Recetas.
- Historial detallado de Pedidos (Volumen de ventas, Tickets promedio).
- Análisis RFM y predicciones de "Riesgo de Abandono" u Oportunidades de "UpSell".
- Cuadres de Inventario de materia prima.

## Política de Acceso y Visibilidad
1. Todos los roles de usuario que interactúan con **PII Sensible** o **PII Operativa** deben acceder obligatoriamente usando una sesión autorizada provista por Firebase Authentication (Google OAuth implementado).
2. Queda estrictamente prohibido imprimir por consola o retornar en mensajes de error generados por el cliente cualquier traza técnica que rebele información **PII Sensible** ante excepciones del software (`AuthGate.tsx`, `ErrorBoundary.tsx` securizados).
