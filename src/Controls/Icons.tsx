import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'

const icons = {
  videocam: <FontAwesomeIcon icon='fa-solid fa-video' color='#FFF' />,
  videocamOff: <FontAwesomeIcon icon='fa-solid fa-video-slash' color='#FFF' />,
  remoteSwap: (
    <React.Fragment>
      <polyline points='15 3 21 3 21 9' />
      <polyline points='9 21 3 21 3 15' />
      <line x1='21' y1='3' x2='14' y2='10' />
      <line x1='3' y1='21' x2='10' y2='14' />
    </React.Fragment>
  ),
  callEnd: (
    <React.Fragment>
      <path d='M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91' />
      <line x1='23' y1='1' x2='1' y2='23' />
    </React.Fragment>
  ),
  mic: <FontAwesomeIcon icon='fa-solid fa-microphone' color='#FFF' />,
  micOff: <FontAwesomeIcon icon='fa-solid fa-microphone-slash' color='#FFF' />
}

export default icons
