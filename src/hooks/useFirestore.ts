import { useEffect, useState, useMemo } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    QueryConstraint,
    addDoc,
    doc,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthGate';
import { createAuditFields, updateAuditFields, softDeleteFields } from '../utils/audit';
import { BaseEntity } from '../types';

/**
 * Real-time Firestore subscription hook.
 * Automatically scoped to the authenticated user's sub-collection.
 * Filters out soft-deleted documents by default (pass `includeDeleted: true` to override).
 */
export function useFirestoreSubscription<T extends BaseEntity>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    options?: { includeDeleted?: boolean }
) {
    const { user } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Memoize constraints to avoid re-subscribing on every render
    const stableConstraints = useMemo(() => constraints, [JSON.stringify(constraints.map(String))]);

    useEffect(() => {
        if (!user) return;

        const userRef = collection(db, `users/${user.uid}/${collectionName}`);

        // Build query constraints
        const finalConstraints: QueryConstraint[] = [...stableConstraints];
        if (!options?.includeDeleted) {
            finalConstraints.push(where('isDeleted', '==', false));
        }

        const q = query(userRef, ...finalConstraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                })) as T[];
                setData(items);
                setLoading(false);
            },
            (err) => {
                console.error('Firestore subscription error:', err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, collectionName, stableConstraints, options?.includeDeleted]);

    return { data, loading, error };
}

/**
 * Firestore mutation helpers scoped to the authenticated user.
 */
export function useFirestoreMutation<T extends BaseEntity>(collectionName: string) {
    const { user } = useAuth();

    const add = async (data: Omit<T, keyof BaseEntity>) => {
        if (!user) throw new Error('No user');
        return addDoc(collection(db, `users/${user.uid}/${collectionName}`), {
            ...data,
            ...createAuditFields(user.uid),
        });
    };

    const update = async (id: string, data: Partial<Omit<T, keyof BaseEntity>>) => {
        if (!user) throw new Error('No user');
        const ref = doc(db, `users/${user.uid}/${collectionName}`, id);
        return updateDoc(ref, {
            ...data,
            ...updateAuditFields(user.uid),
        });
    };

    const softDelete = async (id: string) => {
        if (!user) throw new Error('No user');
        const ref = doc(db, `users/${user.uid}/${collectionName}`, id);
        return updateDoc(ref, softDeleteFields(user.uid));
    };

    return { add, update, softDelete };
}
