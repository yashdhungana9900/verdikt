import { api } from "./api";

// Sends code to the judge server. Returns:
// { verdict, cases[{status, ms, sample, input?, expected?, output?, error?}], total, runtimeMs, memoryMb, error? }
export const submitSolution = ({ problemId, language, code, mode }) => api.submit({ problemId, language, code, mode });
