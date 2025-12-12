/**
 * Utility functions for encoding/decoding messages to/from uint32 arrays
 * Each uint32 represents 4 bytes (UTF-8 characters)
 * 
 * Message separator: 0xFFFFFFFF (used to separate multiple messages)
 */

const MESSAGE_SEPARATOR = 0xFFFFFFFF;

/**
 * Convert a string to an array of uint32 values
 * Each uint32 represents 4 bytes of the UTF-8 encoded string
 * @param message The string message to encode
 * @param addSeparator Whether to add a message separator at the end (default: true)
 * @returns Array of uint32 values (each representing 4 bytes)
 */
export function stringToUint32Array(message: string, addSeparator: boolean = true): number[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(message);
  const uint32Array: number[] = [];
  
  // Process 4 bytes at a time
  for (let i = 0; i < bytes.length; i += 4) {
    let value = 0;
    // Combine 4 bytes into one uint32 (little-endian)
    for (let j = 0; j < 4 && i + j < bytes.length; j++) {
      value |= bytes[i + j] << (j * 8);
    }
    uint32Array.push(value);
  }
  
  // Add message separator at the end
  if (addSeparator) {
    uint32Array.push(MESSAGE_SEPARATOR);
  }
  
  return uint32Array;
}

/**
 * Convert an array of uint32 values back to a string
 * @param uint32Array Array of uint32 values (each representing 4 bytes)
 * @returns The decoded string
 */
export function uint32ArrayToString(uint32Array: number[]): string {
  const bytes: number[] = [];
  
  // Extract bytes from each uint32
  for (const value of uint32Array) {
    // Extract 4 bytes (little-endian)
    for (let j = 0; j < 4; j++) {
      const byte = (value >> (j * 8)) & 0xFF;
      bytes.push(byte);
    }
  }
  
  // Remove trailing null bytes
  while (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
    bytes.pop();
  }
  
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Convert an array of uint32 values to multiple messages (split by separator)
 * @param uint32Array Array of uint32 values containing multiple messages
 * @returns Array of decoded message strings
 */
export function uint32ArrayToMessages(uint32Array: number[]): string[] {
  const messages: string[] = [];
  let currentMessage: number[] = [];
  
  for (const value of uint32Array) {
    if (value === MESSAGE_SEPARATOR) {
      // End of a message, decode it
      if (currentMessage.length > 0) {
        const message = uint32ArrayToString(currentMessage);
        if (message.trim().length > 0) {
          messages.push(message);
        }
        currentMessage = [];
      }
    } else {
      currentMessage.push(value);
    }
  }
  
  // Handle last message if there's no trailing separator
  if (currentMessage.length > 0) {
    const message = uint32ArrayToString(currentMessage);
    if (message.trim().length > 0) {
      messages.push(message);
    }
  }
  
  return messages;
}

