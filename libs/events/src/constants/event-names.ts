/**
 * Standardized event names for WhatsApp messaging.
 * Use these constants instead of raw strings to prevent typos and ensure consistency.
 *
 * Format: `category.action` (e.g., `message.received`)
 */

/**
 * WhatsApp event name constants.
 * All message-related events should use these constants.
 */
export const WhatsAppEventNames = {
  /** Inbound message from user */
  MESSAGE_RECEIVED: "message.received",
  /** Outbound message to user */
  MESSAGE_SENT: "message.sent",
  /** Message delivered to user's device */
  MESSAGE_DELIVERED: "message.delivered",
  /** Message read by user */
  MESSAGE_READ: "message.read",
  /** Conversation handed off to human agent */
  AGENT_HANDOFF: "agent.handoff",
  /** Conversation resolved/closed */
  CHAT_RESOLVED: "chat.resolved",
  /** Conversation transferred to another agent/team */
  CHAT_TRANSFERRED: "chat.transferred",
  /** AI classification event */
  AI_CLASSIFICATION: "ai.classification",
} as const;

/**
 * Type representing valid WhatsApp event names.
 */
export type WhatsAppEventName =
  (typeof WhatsAppEventNames)[keyof typeof WhatsAppEventNames];

/**
 * Type guard to check if a string is a message event (received or sent).
 * Use this for filtering events that should be synced to the inbox.
 *
 * @param eventName - The event name to check
 * @returns true if the event is a message.received or message.sent event
 */
export function isMessageEvent(
  eventName: string,
): eventName is
  | typeof WhatsAppEventNames.MESSAGE_RECEIVED
  | typeof WhatsAppEventNames.MESSAGE_SENT {
  return (
    eventName === WhatsAppEventNames.MESSAGE_RECEIVED ||
    eventName === WhatsAppEventNames.MESSAGE_SENT
  );
}

/**
 * Type guard to check if a message event is inbound (from user).
 *
 * @param eventName - The event name to check
 * @returns true if the event is message.received
 */
export function isInboundMessage(
  eventName: string,
): eventName is typeof WhatsAppEventNames.MESSAGE_RECEIVED {
  return eventName === WhatsAppEventNames.MESSAGE_RECEIVED;
}
