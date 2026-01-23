import { useEffect, useState } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    QueryConstraint,
    addDoc,
    doc,
    updateDoc,
    deleteDoc // We'll implement soft delete mainly, but good to have
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthGate';
import { createAuditFields, updateAuditFields, softDeleteFields, getDeviceType } from '../utils/audit';

export function useFirestoreSubscription<T>(collectionName: string, constraints: QueryConstraint[] = []) {
    const { user } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user) return;

        // Always enforce user isolation + non-deleted by default
        // Note: If you want to see deleted, you'd need to override or pass a flag.
        // For this basic hook, we append user check.
        const userRef = collection(db, `users/${user.uid}/${collectionName}`);

        // Combine default constraints with passed ones
        // We shouldn't filter isDeleted here if we want to toggle it, but let's default to hiding deleted
        // To keep it simple, we'll assume the caller passes the right constraints or we append standard ones.
        const finalConstraints = [
            ...constraints
            // where('isDeleted', '==', false) // Let's leave this to the caller for flexibility or specific hooks
        ];

        const q = query(userRef, ...finalConstraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as T[];
            setData(items);
            setLoading(false);
        }, (err) => {
            console.error("Firestore subscription error:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, collectionName, JSON.stringify(constraints)]); // JSON.stringify to avoid infinite loop on array ref

    return { data, loading, error };
}

export function useFirestoreMutation(collectionName: string) {
    const { user } = useAuth();

    const add = async (data: any) => {
        if (!user) throw new Error("No user");
        const device = getDeviceType();
        return addDoc(collection(db, `users/${user.uid}/${collectionName}`), {
            ...data,
            ...createAuditFields(user.uid, device)
        });
    };

    const update = async (id: string, data: any) => {
        if (!user) throw new Error("No user");
        const device = getDeviceType();
        const ref = doc(db, `users/${user.uid}/${collectionName}`, id);
        return updateDoc(ref, {
            ...data,
            ...updateAuditFields(user.uid, device)
        });
    };

    const softDelete = async (id: string) => {
        if (!user) throw new Error("No user");
        const ref = doc(db, `users/${user.uid}/${collectionName}`, id);
        return updateDoc(ref, softDeleteFields(user.uid));
    };

    return { add, update, softDelete };
}
