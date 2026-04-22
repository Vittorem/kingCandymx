import { serverTimestamp } from 'firebase/firestore';

export const createAuditFields = (uid: string) => ({
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
    updatedBy: uid,
    isDeleted: false,
});

export const updateAuditFields = (uid: string) => ({
    updatedAt: serverTimestamp(),
    updatedBy: uid,
});

export const softDeleteFields = (uid: string) => ({
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
});
