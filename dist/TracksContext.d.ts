import React from 'react';
import { ILocalAudioTrack, ILocalVideoTrack } from 'agora-rtc-react';
export interface TracksContextInterface {
    localVideoTrack: ILocalVideoTrack | null;
    localAudioTrack: ILocalAudioTrack | null;
}
/**
 * React context that contains the local audio and video tracks. It's setup by {@link TracksConfigure}.
 */
declare const TracksContext: React.Context<TracksContextInterface>;
export declare const TracksProvider: React.Provider<TracksContextInterface>;
export declare const TracksConsumer: React.Consumer<TracksContextInterface>;
export default TracksContext;
