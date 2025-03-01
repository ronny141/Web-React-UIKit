/**
 * React component that contains the RTM logic. It manages the usernames, remote mute requests and provides data to the children components by wrapping them with context providers.
 */
declare const RtmConfigure: (props: any) => JSX.Element;
/**
 * Create an RTM raw message from any serilizable JS Object, decode using the {@link parsePayload} function
 * @param msg message object
 * @returns Uint8Array
 */
export declare const createRawMessage: (msg: any) => Uint8Array;
/**
 * Decode the received RTM message or message created using {@link createRawMessage}
 * @param data encoded raw RTM message
 * @returns JS Object
 */
export declare const parsePayload: (data: BufferSource) => any;
export default RtmConfigure;
