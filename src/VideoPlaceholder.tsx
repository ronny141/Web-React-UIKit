import React, { useContext } from 'react'
import RemoteVideoMute from './Controls/Remote/RemoteVideoMute'
import RemoteAudioMute from './Controls/Remote/RemoteAudioMute'
import PropsContext, { VideoPlaceholderProps } from './PropsContext'
import SwapUser from './Controls/SwapUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
/**
 * React component that is renderd when the video track is muted.
 */
const VideoPlaceholder = (props: VideoPlaceholderProps) => {
  const { styleProps, rtcProps } = useContext(PropsContext)
  const { maxViewStyles, maxViewOverlayContainer } = styleProps || {}
  const { user } = props
  const { CustomVideoPlaceholder } = rtcProps

  return !CustomVideoPlaceholder ? (
    <div
      key={user.uid}
      style={{
        ...style.max,
        ...maxViewStyles
      }}
    >
      <FontAwesomeIcon
        data-testid='icon'
        icon='fa-solid fa-circle-user'
        fontSize={120}
        color='#C4C4C4'
      />
      {props.isShown && (
        <div
          style={{
            ...style.btnContainer,
            ...maxViewOverlayContainer
          }}
        >
          {props.showButtons && (
            <React.Fragment>
              {!rtcProps.disableRtm && <RemoteVideoMute UIKitUser={user} />}
              {!rtcProps.disableRtm && <RemoteAudioMute UIKitUser={user} />}
              {props.showSwap && <SwapUser UIKitUser={user} />}
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  ) : (
    CustomVideoPlaceholder && CustomVideoPlaceholder({ ...props }, null)
  )
}

const style = {
  max: {
    flex: 1,
    display: 'flex',
    backgroundColor: '#007bff33',
    flexDirection: 'row',
    position: 'relative'
  } as React.CSSProperties,
  imgContainer: {
    flex: 10,
    display: 'flex',
    justifyContent: 'center'
  },
  img: {
    width: 100,
    height: 100,
    position: 'absolute',
    alignSelf: 'center',
    justifySelf: 'center',
    margin: 'auto',
    display: 'flex'
  } as React.CSSProperties,
  btnContainer: {
    position: 'absolute',
    margin: 5,
    flexDirection: 'column',
    display: 'flex'
  } as React.CSSProperties
}

export default VideoPlaceholder
