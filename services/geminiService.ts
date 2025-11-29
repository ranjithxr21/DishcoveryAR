/**
 * Gemini API service has been removed.
 * This file serves as a placeholder to prevent import errors if referenced,
 * although references should have been removed from the UI components.
 */

export const generateDishDescription = async (dishName: string) => {
  console.warn("AI generation is disabled.");
  return {
    description: "",
    calories: 0,
    tags: []
  };
};

export const generateDishImage = async (dishName: string, description: string) => {
  console.warn("AI generation is disabled.");
  return null;
};