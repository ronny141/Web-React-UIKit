import React, { useContext } from 'react'
import LocalAudioMute from './Local/LocalAudioMute'
import LocalVideoMute from './Local/LocalVideoMute'
import PropsContext from '../PropsContext'

function LocalControls() {
  const { styleProps, rtcProps } = useContext(PropsContext)
  const { localBtnContainer } = styleProps || {}

  return (
    <div
      style={{
        ...{
          width: '100%',
          height: 70,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center'
        },
        ...localBtnContainer
      }}
    >
      {rtcProps.role !== 'audience' && <LocalVideoMute />}
      {rtcProps.role !== 'audience' && <LocalAudioMute />}
    </div>
  )
}

export default LocalControls
