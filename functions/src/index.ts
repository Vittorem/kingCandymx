import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

admin.initializeApp();

const corsHandler = cors({ origin: true });

/**
 * Normalizes a phone number by removing spaces, dashes, and the +52 / 52 country prefix.
 * Examples:
 *   "312 229 3691"  → "3122293691"
 *   "+523122293691" → "3122293691"
 *   "3122293691"    → "3122293691"
 */
function normalizePhone(phone: string): string {
    return phone
        .replace(/[\s\-\(\)]/g, '')   // remove spaces, dashes, parentheses
        .replace(/^\+?52/, '')         // remove country code +52 or 52
        .trim();
}

/**
 * Public HTTP endpoint to query a customer's loyalty points by phone number.
 *
 * GET /loyaltyPoints?phone=3122293691
 *
 * Response (found):
 *   { found: true, name: "Sandra Ochoa", points: 120,
 *     message: "Hola Sandra Ochoa, cuentas con 120 puntos de lealtad 🍰" }
 *
 * Response (not found):
 *   { found: false, message: "No encontramos una cuenta con ese número de teléfono." }
 */
export const loyaltyPoints = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // Only allow GET
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method not allowed. Use GET.' });
            return;
        }

        const rawPhone = req.query.phone as string | undefined;
        if (!rawPhone || rawPhone.trim() === '') {
            res.status(400).json({
                error: 'El parámetro "phone" es requerido.',
            });
            return;
        }

        const normalizedInput = normalizePhone(rawPhone);

        if (normalizedInput.length < 8) {
            res.status(400).json({
                error: 'El número de teléfono parece demasiado corto.',
            });
            return;
        }

        try {
            const db = admin.firestore();

            // Use collectionGroup to search across all users' "customers" sub-collections.
            // This CRM has a single admin user, so this is safe and efficient.
            const snapshot = await db.collectionGroup('customers').get();

            const match = snapshot.docs.find((docSnap) => {
                const data = docSnap.data();
                // Skip soft-deleted records
                if (data.isDeleted === true) return false;
                const storedPhone: string = data.phone ?? '';
                return normalizePhone(storedPhone) === normalizedInput;
            });

            if (!match) {
                res.status(404).json({
                    found: false,
                    message: 'No encontramos una cuenta con ese número de teléfono.',
                });
                return;
            }

            const customer = match.data();
            const name: string = customer.fullName ?? 'Cliente';
            const points: number = customer.loyaltyPoints ?? 0;

            res.status(200).json({
                found: true,
                name,
                points,
                message: `Hola ${name}, cuentas con ${points} puntos de lealtad 🍰`,
            });

        } catch (err) {
            console.error('Error consultando puntos de lealtad:', err);
            res.status(500).json({
                error: 'Error interno del servidor. Intenta de nuevo más tarde.',
            });
        }
    });
});
