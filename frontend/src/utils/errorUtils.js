export const normalizeError = (error) => {
    if (!error) return "Unknown error.";

    const detail = error?.response?.data?.detail ?? error?.response?.data;
    if (typeof detail === "string" && detail.trim()) return detail;

    if (detail && typeof detail === "object") {
      try {
        return JSON.stringify(detail);
      } catch {
        return "Unexpected error response.";
      }
    }

    if (typeof error.message === "string" && error.message.trim()) return error.message;

    return "Unable to connect to the medical assistant server.";
  };
