import { insertActivity, fetchActivities } from "./activity.repository";
import { CreateActivityDTO, ActivityQuery } from "./activity.types";

// ================================
// CREATE ACTIVITY
// ================================
export const createActivity = async (data: CreateActivityDTO) => {
  return await insertActivity(data);
};

// ================================
// GET ACTIVITIES
// ================================
export const getActivities = async (query: ActivityQuery) => {
  return await fetchActivities(query);
};
