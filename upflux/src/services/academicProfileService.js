import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Fetches the student academic profile from Firestore.
 * @param {string} userId - The UID of the logged-in user.
 * @returns {Promise<Object|null>} - The profile data or null if it doesn't exist.
 */
export const getStudentProfile = async (userId) => {
    if (!userId) return null;
    try {
        const docRef = doc(db, "studentProfiles", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching student profile:", error);
        throw error;
    }
};

/**
 * Saves a new student academic profile or overwrites an existing one.
 * @param {string} userId - The UID of the logged-in user.
 * @param {Object} data - The profile data to save.
 */
export const saveStudentProfile = async (userId, data) => {
    if (!userId) return;
    try {
        const docRef = doc(db, "studentProfiles", userId);
        await setDoc(docRef, {
            ...data,
            updatedAt: new Date(),
        }, { merge: true });
    } catch (error) {
        console.error("Error saving student profile:", error);
        throw error;
    }
};

/**
 * Updates specific fields in the student academic profile.
 * @param {string} userId - The UID of the logged-in user.
 * @param {Object} data - The fields to update.
 */
export const updateStudentProfile = async (userId, data) => {
    if (!userId) return;
    try {
        const docRef = doc(db, "studentProfiles", userId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: new Date(),
        });
    } catch (error) {
        console.error("Error updating student profile:", error);
        throw error;
    }
};
