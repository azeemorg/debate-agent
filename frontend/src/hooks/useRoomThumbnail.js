import { useMemo } from "react";
import { generateRoomThumbnail } from "../utils/imageGenerator";

/**
 * Custom hook to generate thumbnails for rooms
 * Memoizes the result to prevent unnecessary recalculations
 * @param {string} roomName - The name of the room
 * @param {string} style - Optional style/theme for the image
 * @returns {string} URL to the generated thumbnail
 */
export const useRoomThumbnail = (roomName, style = "debate") => {
  return useMemo(() => {
    return generateRoomThumbnail(roomName, style);
  }, [roomName, style]);
};

/**
 * Custom hook to generate thumbnails for multiple rooms
 * @param {Array} rooms - Array of room objects
 * @param {string} style - Optional style/theme for images
 * @returns {Array} Array of thumbnail URLs
 */
export const useRoomThumbnails = (rooms, style = "debate") => {
  return useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    return rooms.map((room) => generateRoomThumbnail(room.roomName, style));
  }, [rooms, style]);
};
