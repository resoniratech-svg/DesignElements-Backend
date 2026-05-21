export const validateCreateActivity = (body: any): string | null => {
  if (!body.action || typeof body.action !== "string") {
    return "Action is required and must be a string";
  }

  if (!body.module || typeof body.module !== "string") {
    return "Module is required and must be a string";
  }

  return null;
};