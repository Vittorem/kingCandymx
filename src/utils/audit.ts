import { serverTimestamp } from 'firebase/firestore';
import { BaseEntity } from '../types';

export const createAuditFields = (uid: string, device: string = 'unknown'): Partial<BaseEntity> => ({
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
    updatedBy: uid,
    isDeleted: false,
});

export const updateAuditFields = (uid: string, device: string = 'unknown'): Partial<BaseEntity> => ({
    updatedAt: serverTimestamp(),
    updatedBy: uid,
});

export const softDeleteFields = (uid: string): Partial<BaseEntity> => ({
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
});

export const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    return 'desktop';
};
