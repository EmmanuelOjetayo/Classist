import { Client, Account, Databases , Storage, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const storage = new Storage(client);
export const functions = new Functions(client);
// Helper for unique IDs
export { ID, Query , Storage } from 'appwrite';

export const Config = {
    dbId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    profilesCol: import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID,
    classDataCol: import.meta.env.VITE_APPWRITE_CLASSDATA_COLLECTION_ID,
    adminCol: import.meta.env.VITE_APPWRITE_ADMINS_PROFILES_COLLECTION_ID,
    coursesCol:import.meta.env.VITE_APPWRITE_COURSES_COLLECTION_ID,
    bucketId:import.meta.env.VITE_APPWRITE_STORAGE_COLLECTION_ID,
    submissionsCol: import.meta.env.VITE_APPWRITE_SUBMISSIONS_COLLECTION_ID,
    classGroupsCol: import.meta.env.VITE_APPWRITE_CLASS_GROUPS_COLLECTION_ID,
    notificationsCol: import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
};