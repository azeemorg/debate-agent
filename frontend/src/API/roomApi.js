/**
 * Room Service API Endpoints
 * Base URL matches the @RequestMapping("api/room") in ContestRoomController.java
 */

const BASE_URL = "/api/room";

export const ROOM_ENDPOINTS = {
  // Room Creation
  CREATE_AND_JOIN: `${BASE_URL}/createRoomAndJoin`,
  CREATE_ONLY: `${BASE_URL}/createRoom`,
  
  // Room Activation & Management
  ACTIVATE: (roomId) => `${BASE_URL}/${roomId}/activateRoom`,
  DELETE: (roomId) => `${BASE_URL}/${roomId}/delete`,
  LEAVE: (roomId) => `${BASE_URL}/${roomId}/leave`,
  
  GET_TOKEN: (roomId) => `${BASE_URL}/${roomId}/token`,
  GET_AUDIENCE_TOKEN: (roomId) => `${BASE_URL}/${roomId}/tokenForAuidence`,
  
  // Participant Actions
  REMOVE_PARTICIPANT: (roomId, participantId) => 
    `${BASE_URL}/${roomId}/${participantId}/removeParticipant`,
  
  // Communication
  SEND_CHAT: (roomId) => `${BASE_URL}/${roomId}/chat`,
  
  // Data Retrieval
  GET_ALL_ROOMS: `${BASE_URL}/allRooms`,
};