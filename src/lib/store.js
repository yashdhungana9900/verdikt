import { useAuth } from "./auth";

// Progress now lives in the database. These hooks read it from the logged-in user.
export const useSolved = () => useAuth().solved;
export const useSubmissions = () => useAuth().submissions;
