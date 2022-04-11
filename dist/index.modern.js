import React, { useRef, useContext, useState, useReducer, useEffect, createContext } from 'react';
import AgoraRTC, { createClient, AgoraVideoPlayer, createMicrophoneAndCameraTracks } from 'agora-rtc-react';
import AgoraRTM, { createLazyChannel, createLazyClient } from 'agora-rtm-react';

const RtcContext = React.createContext({});
const RtcProvider = RtcContext.Provider;
const RtcConsumer = RtcContext.Consumer;

var remoteTrackState;

(function (remoteTrackState) {
  remoteTrackState[remoteTrackState["yes"] = 0] = "yes";
  remoteTrackState[remoteTrackState["subbed"] = 1] = "subbed";
  remoteTrackState[remoteTrackState["no"] = 2] = "no";
})(remoteTrackState || (remoteTrackState = {}));

var layout;

(function (layout) {
  layout[layout["grid"] = 0] = "grid";
  layout[layout["pin"] = 1] = "pin";
})(layout || (layout = {}));

var ToggleState;

(function (ToggleState) {
  ToggleState[ToggleState["disabled"] = 0] = "disabled";
  ToggleState[ToggleState["enabled"] = 1] = "enabled";
  ToggleState[ToggleState["disabling"] = 2] = "disabling";
  ToggleState[ToggleState["enabling"] = 3] = "enabling";
})(ToggleState || (ToggleState = {}));

const initialValue = {
  rtcProps: {
    appId: '',
    channel: '',
    role: 'host'
  },
  rtmProps: {}
};
const PropsContext = React.createContext(initialValue);
const PropsProvider = PropsContext.Provider;

const MaxUidContext = React.createContext([]);
const MaxUidProvider = MaxUidContext.Provider;
const MaxUidConsumer = MaxUidContext.Consumer;

const MinUidContext = React.createContext([]);
const MinUidProvider = MinUidContext.Provider;
const MinUidConsumer = MinUidContext.Consumer;

const TracksContext = React.createContext({});
const TracksProvider = TracksContext.Provider;

const initState = {
  max: [{
    uid: 0,
    hasAudio: remoteTrackState.no,
    hasVideo: remoteTrackState.no
  }],
  min: []
};

const reducer = (state, action) => {
  let stateUpdate = initState;
  const uids = [...state.max, ...state.min].map(u => u.uid);

  switch (action.type) {
    case 'update-user-video':
      {
        stateUpdate = {
          min: state.min.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: remoteTrackState.subbed,
                hasVideo: remoteTrackState.subbed
              };
            } else {
              return user;
            }
          }),
          max: state.max.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: remoteTrackState.subbed,
                hasVideo: remoteTrackState.subbed
              };
            } else {
              return user;
            }
          })
        };
      }

      break;

    case 'user-joined':
      {
        if (uids.indexOf(action.value[0].uid) === -1) {
          const minUpdate = [...state.min, {
            uid: action.value[0].uid,
            hasAudio: remoteTrackState.no,
            hasVideo: remoteTrackState.no
          }];

          if (minUpdate.length === 1 && state.max[0].uid === 0) {
            stateUpdate = {
              max: minUpdate,
              min: state.max
            };
          } else {
            stateUpdate = {
              min: minUpdate,
              max: state.max
            };
          }
        }
      }

      break;

    case 'user-unpublished':
      {
        if (state.max[0].uid === action.value[0].uid) {
          stateUpdate = {
            max: [{
              uid: action.value[0].uid,
              hasAudio: action.value[1] === 'audio' ? remoteTrackState.no : state.max[0].hasAudio,
              hasVideo: action.value[1] === 'video' ? remoteTrackState.no : state.max[0].hasVideo
            }],
            min: state.min
          };
        } else {
          const UIKitUser = state.min.find(user => user.uid === action.value[0].uid);

          if (UIKitUser) {
            const minUpdate = [...state.min.filter(user => user.uid !== action.value[0].uid), {
              uid: action.value[0].uid,
              hasAudio: action.value[1] === 'audio' ? remoteTrackState.no : UIKitUser.hasAudio,
              hasVideo: action.value[1] === 'video' ? remoteTrackState.no : UIKitUser.hasVideo
            }];
            stateUpdate = {
              min: minUpdate,
              max: state.max
            };
          }
        }
      }

      break;

    case 'user-published':
      {
        if (state.max[0].uid === action.value[0].uid) {
          stateUpdate = {
            max: [{
              uid: action.value[0].uid,
              hasAudio: action.value[1] === 'audio' ? remoteTrackState.subbed : state.max[0].hasAudio,
              hasVideo: action.value[1] === 'video' ? remoteTrackState.subbed : state.max[0].hasVideo
            }],
            min: state.min
          };
        } else {
          stateUpdate = {
            min: state.min.map(user => {
              if (user.uid !== action.value[0].uid) {
                return user;
              } else {
                return {
                  uid: user.uid,
                  hasAudio: action.value[1] === 'audio' ? remoteTrackState.subbed : user.hasAudio,
                  hasVideo: action.value[1] === 'video' ? remoteTrackState.subbed : user.hasVideo
                };
              }
            }),
            max: state.max
          };
        }
      }

      break;

    case 'user-left':
      {
        if (state.max[0].uid === action.value[0].uid) {
          const minUpdate = [...state.min];
          stateUpdate = {
            max: [minUpdate.pop()],
            min: minUpdate
          };
        } else {
          stateUpdate = {
            min: state.min.filter(user => user.uid !== action.value[0].uid),
            max: state.max
          };
        }
      }

      break;

    case 'user-swap':
      {
        if (state.max[0].uid === action.value[0].uid) ; else {
          stateUpdate = {
            max: [action.value[0]],
            min: [...state.min.filter(user => user.uid !== action.value[0].uid), state.max[0]]
          };
        }
      }

      break;

    case 'local-user-mute-video':
      {
        stateUpdate = {
          min: state.min.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: user.hasAudio,
                hasVideo: action.value[0]
              };
            } else {
              return user;
            }
          }),
          max: state.max.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: user.hasAudio,
                hasVideo: action.value[0]
              };
            } else {
              return user;
            }
          })
        };
      }

      break;

    case 'local-user-mute-audio':
      {
        stateUpdate = {
          min: state.min.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: action.value[0],
                hasVideo: user.hasVideo
              };
            } else {
              return user;
            }
          }),
          max: state.max.map(user => {
            if (user.uid === 0) {
              return {
                uid: 0,
                hasAudio: action.value[0],
                hasVideo: user.hasVideo
              };
            } else {
              return user;
            }
          })
        };
      }

      break;

    case 'remote-user-mute-video':
      {
        stateUpdate = {
          min: state.min.map(user => {
            if (user.uid === action.value[0].uid) {
              return {
                uid: user.uid,
                hasVideo: action.value[1],
                hasAudio: user.hasAudio
              };
            } else return user;
          }),
          max: state.max.map(user => {
            if (user.uid === action.value[0].uid) return {
              uid: user.uid,
              hasVideo: action.value[1],
              hasAudio: user.hasAudio
            };else return user;
          })
        };
      }

      break;

    case 'remote-user-mute-audio':
      {
        stateUpdate = {
          min: state.min.map(user => {
            if (user.uid === action.value[0].uid) return {
              uid: user.uid,
              hasAudio: action.value[1],
              hasVideo: user.hasVideo
            };else return user;
          }),
          max: state.max.map(user => {
            if (user.uid === action.value[0].uid) return {
              uid: user.uid,
              hasAudio: action.value[1],
              hasVideo: user.hasVideo
            };else return user;
          })
        };
      }

      break;

    case 'leave-channel':
      stateUpdate = initState;
      break;

    case 'ActiveSpeaker':
      {
        if (state.max[0].uid === action.value[0]) {
          stateUpdate = { ...state
          };
        } else {
          stateUpdate = {
            max: [state.min.find(user => user.uid === action.value[0])],
            min: [...state.min.filter(user => user.uid !== action.value[0]), state.max[0]]
          };
        }
      }

      break;
  }

  return { ...state,
    ...stateUpdate
  };
};

const useClient = createClient({
  codec: 'vp8',
  mode: 'live'
});

const RtcConfigure = props => {
  const uid = useRef();
  const {
    localVideoTrack,
    localAudioTrack
  } = useContext(TracksContext);
  const {
    callbacks,
    rtcProps
  } = useContext(PropsContext);
  const [ready, setReady] = useState(false);
  const [channelJoined, setChannelJoined] = useState(false);
  let joinRes = null;
  const canJoin = useRef(new Promise((resolve, reject) => {
    joinRes = resolve;
    console.log(reject);
  }));
  let client = useClient();

  if (rtcProps.customRtcClient) {
    client.removeAllListeners();
    client = rtcProps.customRtcClient;
  }

  let localVideoTrackHasPublished = false;
  let localAudioTrackHasPublished = false;
  const mediaStore = useRef({});
  let {
    callActive
  } = props;

  if (callActive === undefined) {
    callActive = true;
  }

  const [uidState, dispatch] = useReducer(reducer, initState);
  useEffect(() => {
    async function init() {
      try {
        console.log(client);
        client.on('user-joined', async (...args) => {
          const [remoteUser] = args;
          mediaStore.current[remoteUser.uid] = {};
          dispatch({
            type: 'user-joined',
            value: args
          });
        });
        client.on('user-published', async (...args) => {
          const [remoteUser, mediaType] = args;
          console.log('user-published', remoteUser.uid);
          client.subscribe(remoteUser, mediaType).then(_e => {
            mediaStore.current[remoteUser.uid][mediaType + 'Track'] = remoteUser[mediaType + 'Track'];

            if (mediaType === 'audio') {
              var _remoteUser$audioTrac;

              (_remoteUser$audioTrac = remoteUser.audioTrack) === null || _remoteUser$audioTrac === void 0 ? void 0 : _remoteUser$audioTrac.play();
            } else {
              if (rtcProps.enableDualStream && rtcProps.dualStreamMode) {
                client.setStreamFallbackOption(remoteUser.uid, rtcProps.dualStreamMode);
              }
            }

            dispatch({
              type: 'user-published',
              value: args
            });
          }).catch(e => console.log(e));
        });
        client.on('user-unpublished', async (...args) => {
          const [remoteUser, mediaType] = args;
          console.log('user-unpublished', remoteUser.uid);

          if (mediaType === 'audio') {
            var _remoteUser$audioTrac2;

            (_remoteUser$audioTrac2 = remoteUser.audioTrack) === null || _remoteUser$audioTrac2 === void 0 ? void 0 : _remoteUser$audioTrac2.stop();
          }

          dispatch({
            type: 'user-unpublished',
            value: args
          });
        });
        client.on('connection-state-change', async (...args) => {
          const [curState, prevState, reason] = args;
          console.log('connection', prevState, curState, reason);

          if (curState === 'CONNECTED') {
            setChannelJoined(true);
          } else if (curState === 'DISCONNECTED') {
            dispatch({
              type: 'leave-channel',
              value: null
            });
          } else {
            setChannelJoined(false);
          }
        });
        client.on('user-left', (...args) => {
          dispatch({
            type: 'user-left',
            value: args
          });
        });

        if (rtcProps.tokenUrl) {
          const {
            tokenUrl,
            channel,
            uid
          } = rtcProps;
          client.on('token-privilege-will-expire', async () => {
            console.log('token will expire');
            const res = await fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (uid || 0) + '/');
            const data = await res.json();
            const token = data.rtcToken;
            client.renewToken(token);
          });
          client.on('token-privilege-did-expire', async () => {
            const res = await fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (uid || 0) + '/');
            const data = await res.json();
            const token = data.rtcToken;
            client.renewToken(token);
          });
        }

        if (callbacks) {
          const events = Object.keys(callbacks);
          events.map(e => {
            try {
              client.on(e, (...args) => {
                ;
                callbacks[e].apply(null, args);
              });
            } catch (e) {
              console.log(e);
            }
          });
        }

        ;
        joinRes(true);
        setReady(true);
      } catch (e) {
        console.log(e);
      }
    }

    if (joinRes) {
      init();
      return () => {
        try {
          client.removeAllListeners();
        } catch (e) {
          console.log(e);
        }
      };
    } else return () => {};
  }, [rtcProps.appId]);
  useEffect(() => {
    async function join() {
      await canJoin.current;
      const {
        tokenUrl,
        channel,
        uid: userUid,
        appId,
        token
      } = rtcProps;

      if (client) {
        if (rtcProps.role === 'audience') {
          client.setClientRole(rtcProps.role);
        } else {
          client.setClientRole('host');
        }

        if (tokenUrl) {
          try {
            const res = await fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (userUid || 0) + '/');
            const data = await res.json();
            const _token = data.rtcToken;
            uid.current = await client.join(appId, channel, _token, userUid || 0);
          } catch (e) {
            console.log(e);
          }
        } else {
          uid.current = await client.join(appId, channel, token || null, userUid || 0);
        }
      } else {
        console.error('trying to join before RTC Engine was initialized');
      }
    }

    if (callActive) {
      join();
      console.log('Attempted join: ', rtcProps.channel);
    } else {
      console.log('In precall - waiting to join');
    }

    return () => {
      if (callActive) {
        console.log('Leaving channel');
        canJoin.current = client.leave().catch(err => console.log(err));
      }
    };
  }, [rtcProps.channel, rtcProps.uid, callActive, rtcProps.tokenUrl]);
  useEffect(() => {
    async function publish() {
      if (rtcProps.enableDualStream) {
        await client.enableDualStream();
      }

      if (localAudioTrack !== null && localAudioTrack !== void 0 && localAudioTrack.enabled && channelJoined) {
        if (!localAudioTrackHasPublished) {
          await client.publish([localAudioTrack]).then(() => {
            localAudioTrackHasPublished = true;
          });
        }
      }

      if (localVideoTrack !== null && localVideoTrack !== void 0 && localVideoTrack.enabled && channelJoined) {
        if (!localVideoTrackHasPublished) {
          await client.publish([localVideoTrack]).then(() => {
            localVideoTrackHasPublished = true;
          });
        }
      }
    }

    console.log('Publish', localVideoTrack, localAudioTrack, callActive);

    if (callActive) {
      publish();
    }
  }, [callActive, localVideoTrack === null || localVideoTrack === void 0 ? void 0 : localVideoTrack.enabled, localAudioTrack === null || localAudioTrack === void 0 ? void 0 : localAudioTrack.enabled, channelJoined]);
  useEffect(() => {
    if (localVideoTrack && localAudioTrack !== (null )) {
      mediaStore.current[0] = {
        audioTrack: localAudioTrack,
        videoTrack: localVideoTrack
      };
      dispatch({
        type: 'update-user-video',
        value: [localAudioTrack, localVideoTrack]
      });
    }
  }, [rtcProps.channel, channelJoined]);
  useEffect(() => {
    if (channelJoined && rtcProps.token) {
      client.renewToken(rtcProps.token).then(e => console.log('renewed token', e));
    }
  }, [rtcProps.token, channelJoined]);
  useEffect(() => {
    if (rtcProps.role) {
      client.setClientRole(rtcProps.role).then(e => console.log('changed role', e));
    }
  }, [rtcProps.role, channelJoined]);
  useEffect(() => {
    async function enableActiveSpeaker() {
      if (rtcProps.activeSpeaker && rtcProps.layout !== layout.grid) {
        client.on('volume-indicator', volumes => {
          const highestvolumeObj = volumes.reduce((highestVolume, volume) => {
            if (highestVolume === null) {
              return volume;
            } else {
              if (volume.level > highestVolume.level) {
                return volume;
              }

              return highestVolume;
            }
          }, null);
          const activeSpeaker = highestvolumeObj ? highestvolumeObj.uid : undefined;
          const mapActiveSpeakerToZero = activeSpeaker === uid.current ? 0 : activeSpeaker;

          if (activeSpeaker !== undefined) {
            dispatch({
              type: 'ActiveSpeaker',
              value: [mapActiveSpeakerToZero]
            });
          }
        });
        await client.enableAudioVolumeIndicator();
      }
    }

    if (callActive) {
      enableActiveSpeaker();
    }

    return () => {
      client.removeAllListeners('volume-indicator');
    };
  }, [rtcProps.activeSpeaker, rtcProps.layout]);
  return React.createElement(RtcProvider, {
    value: {
      client,
      mediaStore: mediaStore.current,
      localVideoTrack,
      localAudioTrack,
      dispatch,
      localUid: uid,
      channelJoined
    }
  }, React.createElement(MaxUidProvider, {
    value: uidState.max
  }, React.createElement(MinUidProvider, {
    value: uidState.min
  }, ready ? props.children : null)));
};

const icons = {
  videocam: React.createElement(React.Fragment, null, React.createElement("polygon", {
    points: '23 7 16 12 23 17 23 7'
  }), React.createElement("rect", {
    x: '1',
    y: '5',
    width: '15',
    height: '14',
    rx: '2',
    ry: '2'
  })),
  videocamOff: React.createElement(React.Fragment, null, React.createElement("path", {
    d: 'M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10'
  }), React.createElement("line", {
    x1: '1',
    y1: '1',
    x2: '23',
    y2: '23'
  })),
  remoteSwap: React.createElement(React.Fragment, null, React.createElement("polyline", {
    points: '15 3 21 3 21 9'
  }), React.createElement("polyline", {
    points: '9 21 3 21 3 15'
  }), React.createElement("line", {
    x1: '21',
    y1: '3',
    x2: '14',
    y2: '10'
  }), React.createElement("line", {
    x1: '3',
    y1: '21',
    x2: '10',
    y2: '14'
  })),
  callEnd: React.createElement(React.Fragment, null, React.createElement("path", {
    d: 'M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91'
  }), React.createElement("line", {
    x1: '23',
    y1: '1',
    x2: '1',
    y2: '23'
  })),
  mic: React.createElement(React.Fragment, null, React.createElement("path", {
    d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'
  }), React.createElement("path", {
    d: 'M19 10v2a7 7 0 0 1-14 0v-2'
  }), React.createElement("line", {
    x1: '12',
    y1: '19',
    x2: '12',
    y2: '23'
  }), React.createElement("line", {
    x1: '8',
    y1: '23',
    x2: '16',
    y2: '23'
  })),
  micOff: React.createElement(React.Fragment, null, React.createElement("line", {
    x1: '1',
    y1: '1',
    x2: '23',
    y2: '23'
  }), React.createElement("path", {
    d: 'M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6'
  }), React.createElement("path", {
    d: 'M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23'
  }), React.createElement("line", {
    x1: '12',
    y1: '19',
    x2: '12',
    y2: '23'
  }), React.createElement("line", {
    x1: '8',
    y1: '23',
    x2: '16',
    y2: '23'
  }))
};

const BtnTemplate = props => {
  const {
    onClick,
    name,
    disabled,
    style
  } = props;
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    theme,
    BtnTemplateStyles,
    iconSize,
    customIcon
  } = styleProps || {};
  return React.createElement("div", {
    style: { ...{
        width: 35,
        height: 35,
        borderRadius: '100%',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'yellow',
        backgroundColor: 'rgba(0,80,180,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        cursor: disabled ? 'auto' : 'pointer',
        margin: 4
      },
      ...BtnTemplateStyles,
      ...style
    },
    onClick: onClick
  }, customIcon ? React.createElement("img", {
    src: customIcon[name],
    alt: name
  }) : React.createElement("svg", {
    style: {
      width: iconSize || 24,
      height: iconSize || 24
    },
    xmlns: 'http://www.w3.org/2000/svg',
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
    fill: 'none',
    opacity: disabled ? '0.5' : '1',
    stroke: theme || '#fff',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, icons[name]));
};

const LocalContext = createContext({});

const LocalUserContext = props => {
  const max = useContext(MaxUidContext);
  const min = useContext(MinUidContext);
  let localUser;

  if (max[0].uid === 0) {
    localUser = max[0];
  } else {
    localUser = min.find(u => u.uid === 0);
  }

  return React.createElement(LocalContext.Provider, {
    value: localUser
  }, props.children);
};

var muteAudio = (async (user, dispatch, localAudioTrack) => {
  if (user.uid === 0) {
    const localState = user.hasAudio;

    if (localState === ToggleState.enabled || localState === ToggleState.disabled) {
      dispatch({
        type: 'local-user-mute-audio',
        value: [localState === ToggleState.enabled ? ToggleState.disabling : ToggleState.enabling]
      });

      try {
        await (localAudioTrack === null || localAudioTrack === void 0 ? void 0 : localAudioTrack.setEnabled(localState !== ToggleState.enabled));
        dispatch({
          type: 'local-user-mute-audio',
          value: [localState === ToggleState.enabled ? ToggleState.disabled : ToggleState.enabled]
        });
      } catch (e) {
        dispatch({
          type: 'local-user-mute-audio',
          value: [localState]
        });
      }
    }
  }
});

function LocalAudioMute() {
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    localBtnStyles
  } = styleProps || {};
  const {
    muteLocalAudio
  } = localBtnStyles || {};
  const {
    dispatch,
    localAudioTrack
  } = useContext(RtcContext);
  const local = useContext(LocalContext);
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteLocalAudio,
    name: local.hasAudio === ToggleState.enabled ? 'mic' : 'micOff',
    onClick: () => localAudioTrack && muteAudio(local, dispatch, localAudioTrack)
  }));
}

var muteVideo = (async (user, dispatch, localVideoTrack) => {
  if (user.uid === 0) {
    const localState = user.hasVideo;

    if (localState === ToggleState.enabled || localState === ToggleState.disabled) {
      dispatch({
        type: 'local-user-mute-video',
        value: [localState === ToggleState.enabled ? ToggleState.disabling : ToggleState.enabling]
      });

      try {
        await (localVideoTrack === null || localVideoTrack === void 0 ? void 0 : localVideoTrack.setEnabled(localState !== ToggleState.enabled));
        dispatch({
          type: 'local-user-mute-video',
          value: [localState === ToggleState.enabled ? ToggleState.disabled : ToggleState.enabled]
        });
      } catch (e) {
        dispatch({
          type: 'local-user-mute-video',
          value: [localState]
        });
      }
    }
  }
});

function LocalVideoMute() {
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    localBtnStyles
  } = styleProps || {};
  const {
    muteLocalVideo
  } = localBtnStyles || {};
  const {
    dispatch,
    localVideoTrack
  } = useContext(RtcContext);
  const local = useContext(LocalContext);
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteLocalVideo,
    name: local.hasVideo === ToggleState.enabled ? 'videocam' : 'videocamOff',
    onClick: () => localVideoTrack && muteVideo(local, dispatch, localVideoTrack)
  }));
}

function LocalControls() {
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    localBtnContainer
  } = styleProps || {};
  return React.createElement("div", {
    style: { ...{
        width: '100%',
        height: 70,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center'
      },
      ...localBtnContainer
    }
  }, rtcProps.role !== 'audience' && React.createElement(LocalVideoMute, null), rtcProps.role !== 'audience' && React.createElement(LocalAudioMute, null));
}

var rtmStatusEnum;

(function (rtmStatusEnum) {
  rtmStatusEnum[rtmStatusEnum["initFailed"] = 0] = "initFailed";
  rtmStatusEnum[rtmStatusEnum["offline"] = 1] = "offline";
  rtmStatusEnum[rtmStatusEnum["initialising"] = 2] = "initialising";
  rtmStatusEnum[rtmStatusEnum["loggingIn"] = 3] = "loggingIn";
  rtmStatusEnum[rtmStatusEnum["loggedIn"] = 4] = "loggedIn";
  rtmStatusEnum[rtmStatusEnum["connected"] = 5] = "connected";
  rtmStatusEnum[rtmStatusEnum["loginFailed"] = 6] = "loginFailed";
})(rtmStatusEnum || (rtmStatusEnum = {}));

var clientRoleRaw;

(function (clientRoleRaw) {
  clientRoleRaw[clientRoleRaw["broadcaster"] = 0] = "broadcaster";
  clientRoleRaw[clientRoleRaw["audience"] = 1] = "audience";
})(clientRoleRaw || (clientRoleRaw = {}));

var mutingDevice;

(function (mutingDevice) {
  mutingDevice[mutingDevice["camera"] = 0] = "camera";
  mutingDevice[mutingDevice["microphone"] = 1] = "microphone";
})(mutingDevice || (mutingDevice = {}));

var popUpStateEnum;

(function (popUpStateEnum) {
  popUpStateEnum[popUpStateEnum["closed"] = 0] = "closed";
  popUpStateEnum[popUpStateEnum["muteMic"] = 1] = "muteMic";
  popUpStateEnum[popUpStateEnum["muteCamera"] = 2] = "muteCamera";
  popUpStateEnum[popUpStateEnum["unmuteMic"] = 3] = "unmuteMic";
  popUpStateEnum[popUpStateEnum["unmuteCamera"] = 4] = "unmuteCamera";
})(popUpStateEnum || (popUpStateEnum = {}));

const RtmContext = createContext(null);
const RtmProvider = RtmContext.Provider;
const RtmConsumer = RtmContext.Consumer;

function RemoteVideoMute(props) {
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    sendMuteRequest,
    uidMap
  } = useContext(RtmContext);
  const {
    remoteBtnStyles
  } = styleProps || {};
  const {
    muteRemoteVideo
  } = remoteBtnStyles || {};
  const {
    UIKitUser
  } = props;
  const isMuted = UIKitUser.hasVideo === remoteTrackState.no;
  return UIKitUser.uid !== 0 && uidMap[UIKitUser.uid] ? React.createElement("div", null, React.createElement(BtnTemplate, {
    name: UIKitUser.hasVideo === remoteTrackState.subbed ? 'videocam' : 'videocamOff',
    style: muteRemoteVideo,
    onClick: () => sendMuteRequest(mutingDevice.camera, UIKitUser.uid, !isMuted)
  })) : null;
}

function RemoteAudioMute(props) {
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    remoteBtnStyles
  } = styleProps || {};
  const {
    sendMuteRequest,
    uidMap
  } = useContext(RtmContext);
  const {
    muteRemoteAudio
  } = remoteBtnStyles || {};
  const {
    UIKitUser
  } = props;
  const isMuted = UIKitUser.hasAudio === remoteTrackState.no;
  return UIKitUser.uid !== 0 && uidMap[UIKitUser.uid] ? React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteRemoteAudio,
    name: UIKitUser.hasAudio === remoteTrackState.subbed ? 'mic' : 'micOff',
    onClick: () => sendMuteRequest(mutingDevice.microphone, UIKitUser.uid, !isMuted)
  })) : null;
}

function SwapUser(props) {
  const {
    dispatch
  } = useContext(RtcContext);
  const {
    UIKitUser
  } = props;
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    name: 'remoteSwap',
    onClick: () => dispatch({
      type: 'user-swap',
      value: [UIKitUser]
    })
  }));
}

const VideoPlaceholder = props => {
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    maxViewStyles,
    maxViewOverlayContainer
  } = styleProps || {};
  const {
    user
  } = props;
  const {
    CustomVideoPlaceholder
  } = rtcProps;
  return !CustomVideoPlaceholder ? React.createElement("div", {
    key: user.uid,
    style: { ...style.max,
      ...maxViewStyles
    }
  }, React.createElement("div", {
    style: style.imgContainer
  }, React.createElement("img", {
    style: style.img,
    src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJmZWF0aGVyIGZlYXRoZXItdXNlciI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiPjwvY2lyY2xlPjwvc3ZnPg=='
  })), props.isShown && React.createElement("div", {
    style: { ...style.btnContainer,
      ...maxViewOverlayContainer
    }
  }, props.showButtons && React.createElement(React.Fragment, null, !rtcProps.disableRtm && React.createElement(RemoteVideoMute, {
    UIKitUser: user
  }), !rtcProps.disableRtm && React.createElement(RemoteAudioMute, {
    UIKitUser: user
  }), props.showSwap && React.createElement(SwapUser, {
    UIKitUser: user
  })))) : CustomVideoPlaceholder && CustomVideoPlaceholder({ ...props
  }, null);
};

const style = {
  max: {
    flex: 1,
    display: 'flex',
    backgroundColor: '#007bff33',
    flexDirection: 'row',
    position: 'relative'
  },
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
  },
  btnContainer: {
    position: 'absolute',
    margin: 5,
    flexDirection: 'column',
    display: 'flex'
  }
};

const Username = props => {
  const {
    usernames
  } = useContext(RtmContext);
  const {
    rtmProps,
    styleProps
  } = useContext(PropsContext);
  const {
    user
  } = props;
  return rtmProps !== null && rtmProps !== void 0 && rtmProps.displayUsername ? React.createElement("p", {
    style: { ...styles.username,
      ...(styleProps === null || styleProps === void 0 ? void 0 : styleProps.usernameText)
    }
  }, usernames[user.uid]) : React.createElement(React.Fragment, null);
};

const styles = {
  username: {
    position: 'absolute',
    background: '#007bffaa',
    padding: '2px 8px',
    color: '#fff',
    margin: 0,
    bottom: 0,
    right: 0,
    zIndex: 90
  }
};

const MaxVideoView = props => {
  const {
    mediaStore
  } = useContext(RtcContext);
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    maxViewStyles,
    videoMode,
    maxViewOverlayContainer
  } = styleProps || {};
  const renderModeProp = videoMode === null || videoMode === void 0 ? void 0 : videoMode.max;
  const [isShown, setIsShown] = useState(false);
  const {
    user
  } = props;
  return React.createElement("div", {
    style: { ...styles$1.container,
      ...props.style,
      ...maxViewStyles
    },
    onMouseEnter: () => setIsShown(true),
    onMouseLeave: () => setIsShown(false)
  }, user.hasVideo === 1 ? React.createElement("div", {
    style: styles$1.videoContainer
  }, !rtcProps.disableRtm && React.createElement(Username, {
    user: user
  }), React.createElement(AgoraVideoPlayer, {
    style: styles$1.videoplayer,
    config: {
      fit: renderModeProp || 'cover'
    },
    videoTrack: mediaStore[user.uid].videoTrack
  }), isShown && React.createElement("div", {
    style: { ...styles$1.overlay,
      ...maxViewOverlayContainer
    }
  }, !rtcProps.disableRtm && React.createElement(RemoteVideoMute, {
    UIKitUser: user
  }), !rtcProps.disableRtm && React.createElement(RemoteAudioMute, {
    UIKitUser: user
  }))) : React.createElement("div", {
    style: styles$1.videoContainer
  }, !rtcProps.disableRtm && React.createElement(Username, {
    user: user
  }), React.createElement(VideoPlaceholder, {
    user: user,
    isShown: isShown,
    showButtons: true
  })));
};

const styles$1 = {
  container: {
    display: 'flex',
    flex: 1
  },
  videoContainer: {
    display: 'flex',
    flex: 1,
    position: 'relative'
  },
  videoplayer: {
    width: '100%',
    display: 'flex',
    flex: 1
  },
  overlay: {
    position: 'absolute',
    margin: 5,
    flexDirection: 'column',
    display: 'flex'
  },
  username: {
    position: 'absolute',
    background: '#007bffaa',
    padding: '2px 8px',
    color: '#fff',
    margin: 0,
    bottom: 0,
    right: 0,
    zIndex: 90
  }
};

const MinVideoView = props => {
  const {
    mediaStore
  } = useContext(RtcContext);
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    minViewStyles,
    videoMode,
    minViewOverlayContainer
  } = styleProps || {};
  const renderModeProp = videoMode === null || videoMode === void 0 ? void 0 : videoMode.min;
  const [isShown, setIsShown] = useState(false);
  const {
    user
  } = props;
  return React.createElement("div", {
    style: { ...{
        display: 'flex',
        flex: 1
      },
      ...minViewStyles
    },
    onMouseEnter: () => setIsShown(true),
    onMouseLeave: () => setIsShown(false)
  }, user.hasVideo === 1 ? React.createElement("div", {
    style: { ...{
        display: 'flex',
        flex: 1,
        position: 'relative'
      }
    }
  }, React.createElement(AgoraVideoPlayer, {
    style: {
      flex: 10,
      display: 'flex'
    },
    config: {
      fit: renderModeProp !== undefined ? renderModeProp : 'cover'
    },
    videoTrack: mediaStore[user.uid].videoTrack
  }), isShown && React.createElement("div", {
    style: { ...{
        margin: 4,
        position: 'absolute',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      },
      ...minViewOverlayContainer
    }
  }, !rtcProps.disableRtm && React.createElement(RemoteVideoMute, {
    UIKitUser: user
  }), !rtcProps.disableRtm && React.createElement(RemoteAudioMute, {
    UIKitUser: user
  }), React.createElement(SwapUser, {
    UIKitUser: user
  }))) : React.createElement(VideoPlaceholder, {
    user: user,
    isShown: isShown,
    showButtons: true,
    showSwap: true
  }));
};

var styles$2 = {"test":"_styles-module__test__3ybTi","scrollbar":"_styles-module__scrollbar__3Sxu7"};

const PinnedVideo = () => {
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    minViewContainer,
    pinnedVideoContainer,
    maxViewContainer,
    scrollViewContainer
  } = styleProps || {};
  const parentRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const isLandscape = width > height;
  useEffect(() => {
    const handleResize = () => {
      if (parentRef.current) {
        setWidth(parentRef.current.offsetWidth);
        setHeight(parentRef.current.offsetHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    if (parentRef.current) {
      setWidth(parentRef.current.offsetWidth);
      setHeight(parentRef.current.offsetHeight);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return React.createElement("div", {
    ref: parentRef,
    style: { ...{
        display: 'flex',
        flex: 1,
        flexDirection: isLandscape ? 'row' : 'column-reverse',
        overflow: 'hidden'
      },
      ...pinnedVideoContainer
    }
  }, React.createElement("div", {
    style: { ...{
        display: 'flex',
        flex: isLandscape ? 5 : 4
      },
      ...maxViewContainer
    }
  }, React.createElement(MaxUidConsumer, null, maxUsers => rtcProps.role === 'audience' && maxUsers[0].uid === 0 ? null : React.createElement(MaxVideoView, {
    user: maxUsers[0]
  }))), React.createElement("div", {
    className: styles$2.scrollbar,
    style: { ...{
        overflowY: isLandscape ? 'scroll' : 'hidden',
        overflowX: !isLandscape ? 'scroll' : 'hidden',
        display: 'flex',
        flex: 1,
        flexDirection: isLandscape ? 'column' : 'row'
      },
      ...scrollViewContainer
    }
  }, React.createElement(MinUidConsumer, null, minUsers => minUsers.map(user => rtcProps.role === 'audience' && user.uid === 0 ? null : React.createElement("div", {
    style: { ...{
        minHeight: isLandscape ? '35vh' : '99%',
        minWidth: isLandscape ? '99%' : '40vw',
        margin: 2,
        display: 'flex'
      },
      ...minViewContainer
    },
    key: user.uid
  }, React.createElement(MinVideoView, {
    user: user
  }))))));
};

const GridVideo = () => {
  const {
    styleProps,
    rtcProps
  } = useContext(PropsContext);
  const {
    gridVideoCells,
    gridVideoContainer
  } = styleProps || {};
  const max = useContext(MaxUidContext);
  const min = useContext(MinUidContext);
  const users = rtcProps.role === 'audience' ? [...max, ...min].filter(user => user.uid !== 0) : [...max, ...min];
  const parentRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);
  const isLandscape = width > height;
  const unit = 'minmax(0, 1fr) ';
  useEffect(() => {
    const handleResize = () => {
      if (parentRef.current) {
        setWidth(parentRef.current.offsetWidth);
        setHeight(parentRef.current.offsetHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    if (parentRef.current) {
      setWidth(parentRef.current.offsetWidth);
      setHeight(parentRef.current.offsetHeight);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return React.createElement("div", {
    ref: parentRef,
    style: { ...{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: isLandscape ? users.length > 9 ? unit.repeat(4) : users.length > 4 ? unit.repeat(3) : users.length > 1 ? unit.repeat(2) : unit : users.length > 8 ? unit.repeat(3) : users.length > 2 ? unit.repeat(2) : unit
      },
      ...gridVideoContainer
    }
  }, users.map(user => React.createElement(MaxVideoView, {
    user: user,
    style: { ...{
        height: '100%',
        width: '100%'
      },
      ...gridVideoCells
    },
    key: user.uid
  })));
};

const useTracks = createMicrophoneAndCameraTracks({
  encoderConfig: {}
}, {
  encoderConfig: {}
});

const TracksConfigure = props => {
  const [ready, setReady] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const {
    ready: trackReady,
    tracks,
    error
  } = useTracks();
  const mediaStore = useRef({});
  useEffect(() => {
    if (tracks !== null) {
      setLocalAudioTrack(tracks[0]);
      setLocalVideoTrack(tracks[1]);
      mediaStore.current[0] = {
        audioTrack: tracks[0],
        videoTrack: tracks[1]
      };
      setReady(true);
    } else if (error) {
      console.error(error);
      setReady(false);
    }

    return () => {
      if (tracks) {
        var _tracks$, _tracks$2;

        (_tracks$ = tracks[0]) === null || _tracks$ === void 0 ? void 0 : _tracks$.close();
        (_tracks$2 = tracks[1]) === null || _tracks$2 === void 0 ? void 0 : _tracks$2.close();
      }
    };
  }, [trackReady, error]);
  return React.createElement(TracksProvider, {
    value: {
      localVideoTrack: localVideoTrack,
      localAudioTrack: localAudioTrack
    }
  }, ready ? props.children : null);
};

const timeNow = () => new Date().getTime();

const useChannel = createLazyChannel();
const useClient$1 = createLazyClient();

const RtmConfigure = props => {
  const {
    rtcProps,
    rtmProps
  } = useContext(PropsContext);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const rtmClient = useClient$1(rtcProps.appId);
  const channel = useChannel(rtmClient, rtcProps.channel);
  const localUid = useRef('');
  const timerValueRef = useRef(5);
  const local = useContext(LocalContext);
  const {
    rtmCallbacks
  } = useContext(PropsContext);
  const [uidMap, setUidMap] = useState({});
  const [usernames, setUsernames] = useState({});
  const [userDataMap, setUserDataMap] = useState({});
  const [popUpState, setPopUpState] = useState(popUpStateEnum.closed);
  const [rtmStatus, setRtmStatus] = useState(rtmStatusEnum.offline);
  const {
    localUid: rtcUid,
    localAudioTrack,
    localVideoTrack,
    dispatch,
    channelJoined
  } = useContext(RtcContext);

  const login = async () => {
    const {
      tokenUrl
    } = rtcProps;

    if (tokenUrl) {
      try {
        const res = await fetch(tokenUrl + '/rtm/' + ((rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current));
        const data = await res.json();
        const serverToken = data.rtmToken;
        await rtmClient.login({
          uid: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current,
          token: serverToken
        });
        timerValueRef.current = 5;
      } catch (error) {
        setTimeout(async () => {
          timerValueRef.current = timerValueRef.current + timerValueRef.current;
          login();
        }, timerValueRef.current * 1000);
      }
    } else {
      try {
        await rtmClient.login({
          uid: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current,
          token: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.token) || undefined
        });
        timerValueRef.current = 5;
      } catch (error) {
        setTimeout(async () => {
          timerValueRef.current = timerValueRef.current + timerValueRef.current;
          login();
        }, timerValueRef.current * 1000);
      }
    }
  };

  const joinChannel = async () => {
    await rtcUid;

    try {
      await channel.join();
      timerValueRef.current = 5;
    } catch (error) {
      setTimeout(async () => {
        timerValueRef.current = timerValueRef.current + timerValueRef.current;
        joinChannel();
      }, timerValueRef.current * 1000);
    }
  };

  const init = async () => {
    setRtmStatus(rtmStatusEnum.initialising);
    rtcProps.uid ? localUid.current = String(rtcProps.uid) : localUid.current = String(timeNow());
    rtmClient.on('ConnectionStateChanged', (state, reason) => {
      console.log(state, reason);
    });
    rtmClient.on('TokenExpired', async () => {
      const {
        tokenUrl
      } = rtcProps;
      console.log('token expired - renewing');

      if (tokenUrl) {
        try {
          const res = await fetch(tokenUrl + '/rtm/' + ((rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current));
          const data = await res.json();
          const serverToken = data.rtmToken;
          await rtmClient.renewToken(serverToken);
          timerValueRef.current = 5;
        } catch (error) {
          console.error('TokenExpiredError', error);
        }
      }
    });
    rtmClient.on('MessageFromPeer', (message, peerId) => {
      handleReceivedMessage(message, peerId);
    });
    channel.on('ChannelMessage', (message, peerId) => {
      handleReceivedMessage(message, peerId);
    });
    channel.on('MemberJoined', async peerId => {
      await sendPeerMessage(createUserData(), peerId);
    });
    channel.on('MemberCountUpdated', async count => {
      console.log('RTM-MemberCountUpdated: ', count);
    });

    if (rtmCallbacks !== null && rtmCallbacks !== void 0 && rtmCallbacks.channel) {
      Object.keys(rtmCallbacks.channel).map(callback => {
        if (rtmCallbacks.channel) {
          channel.on(callback, rtmCallbacks.channel[callback]);
        }
      });
    } else if (rtmCallbacks !== null && rtmCallbacks !== void 0 && rtmCallbacks.client) {
      Object.keys(rtmCallbacks.client).map(callback => {
        if (rtmCallbacks.client) {
          rtmClient.on(callback, rtmCallbacks.client[callback]);
        }
      });
    }

    if (rtcProps.tokenUrl) {
      const {
        tokenUrl,
        uid
      } = rtcProps;
      rtmClient.on('TokenExpired', async () => {
        console.log('token expired');
        const res = await fetch(tokenUrl + '/rtm/' + (uid || 0) + '/');
        const data = await res.json();
        const token = data.rtmToken;
        rtmClient.renewToken(token);
      });
    }

    setRtmStatus(rtmStatusEnum.loggingIn);
    await login();
    setRtmStatus(rtmStatusEnum.loggedIn);
    await joinChannel();
    setRtmStatus(rtmStatusEnum.connected);
    setUsernames(p => {
      return { ...p,
        0: rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.username
      };
    });
    sendChannelMessage(createUserData());
  };

  const createUserData = () => {
    return {
      messageType: 'UserData',
      rtmId: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current,
      rtcId: rtcUid.current,
      username: rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.username,
      role: rtcProps.role === 'audience' ? 1 : 0,
      uikit: {
        platform: 'web',
        framework: 'react',
        version: '0.1.0'
      },
      agora: {
        rtm: AgoraRTM.VERSION,
        rtc: AgoraRTC.VERSION
      }
    };
  };

  const sendMuteRequest = (device, rtcId, mute) => {
    const forced = (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.showPopUpBeforeRemoteMute) === false;
    const payload = {
      messageType: 'MuteRequest',
      device,
      rtcId,
      mute,
      isForceful: forced
    };
    const peerId = uidMap[rtcId];

    if (forced && !mute) {
      console.log('cannot send force unmute request');
    } else if (peerId) {
      sendPeerMessage(payload, peerId);
    } else {
      console.log('peer not found');
    }
  };

  const handleReceivedMessage = (message, peerId) => {
    const payload = message.rawMessage;
    const messageObject = parsePayload(payload);
    console.log(messageObject, peerId);

    switch (messageObject.messageType) {
      case 'UserData':
        handleReceivedUserDataMessage(messageObject);
        break;

      case 'MuteRequest':
        handleReceivedMuteMessage(messageObject);
        break;

      case 'RtmDataRequest':
        switch (messageObject.type) {
          case 'ping':
            handlePing(peerId);
            break;

          case 'userData':
            handleUserDataRequest(peerId);
            break;

          default:
            console.log(peerId);
        }

        break;

      default:
        console.log('unknown message type');
    }
  };

  const handleReceivedUserDataMessage = userData => {
    setUidMap(p => {
      return { ...p,
        [userData.rtcId]: userData.rtmId
      };
    });
    setUsernames(p => {
      return { ...p,
        [userData.rtcId]: userData.username
      };
    });
    setUserDataMap(p => {
      return { ...p,
        [userData.rtmId]: userData
      };
    });
  };

  const handleReceivedMuteMessage = muteRequest => {
    if (rtcUid.current === muteRequest.rtcId) {
      if (muteRequest.isForceful) {
        if (muteRequest.mute) {
          if (muteRequest.device === mutingDevice.microphone) {
            localAudioTrack && muteAudio(local, dispatch, localAudioTrack);
          } else if (muteRequest.device === mutingDevice.camera) {
            localVideoTrack && muteVideo(local, dispatch, localVideoTrack);
          }
        } else console.error('cannot force unmute');
      } else {
        if (muteRequest.device === mutingDevice.microphone) {
          if (muteRequest.mute) setPopUpState(popUpStateEnum.muteMic);else setPopUpState(popUpStateEnum.unmuteMic);
        } else if (muteRequest.device === mutingDevice.camera) {
          if (muteRequest.mute) setPopUpState(popUpStateEnum.muteCamera);else setPopUpState(popUpStateEnum.unmuteCamera);
        }
      }
    }
  };

  const handlePing = peerId => {
    sendPeerMessage({
      messageType: 'RtmDataRequest',
      type: 'pong'
    }, peerId);
  };

  const handleUserDataRequest = peerId => {
    sendPeerMessage(createUserData(), peerId);
  };

  const sendChannelMessage = async payload => {
    const rawMessage = createRawMessage(payload);
    const message = rtmClient.createMessage({
      rawMessage: rawMessage,
      messageType: AgoraRTM.MessageType.RAW,
      description: 'AgoraUIKit'
    });
    await channel.sendMessage(message);
  };

  const sendPeerMessage = async (payload, peerId) => {
    const rawMessage = createRawMessage(payload);
    const message = rtmClient.createMessage({
      rawMessage: rawMessage,
      messageType: AgoraRTM.MessageType.RAW,
      description: 'AgoraUIKit'
    });
    await rtmClient.sendMessageToPeer(message, peerId);
  };

  const end = async () => {
    await rtmClient.logout();
    await rtmClient.removeAllListeners();
  };

  useEffect(() => {
    if (channelJoined) {
      init();
      setLoggedIn(true);
    }

    return () => {
      if (channelJoined) {
        end();
      }
    };
  }, [rtcProps.channel, rtcProps.appId, channelJoined]);
  return React.createElement(RtmProvider, {
    value: {
      rtmStatus,
      sendPeerMessage,
      sendChannelMessage,
      sendMuteRequest,
      rtmClient,
      uidMap,
      usernames,
      userDataMap,
      popUpState,
      setPopUpState
    }
  }, isLoggedIn ? props.children : React.createElement(React.Fragment, null));
};

const enc = new TextEncoder();
const dec = new TextDecoder();
const createRawMessage = msg => {
  return enc.encode(JSON.stringify(msg));
};
const parsePayload = data => {
  return JSON.parse(dec.decode(data));
};

function PopUp() {
  const {
    styleProps
  } = useContext(PropsContext);
  const {
    popUpState,
    setPopUpState
  } = useContext(RtmContext);
  const {
    popUpContainer
  } = styleProps || {};
  const {
    dispatch,
    localVideoTrack,
    localAudioTrack
  } = useContext(RtcContext);
  const local = useContext(LocalContext);
  return popUpState !== popUpStateEnum.closed ? React.createElement("div", {
    style: { ...styles$3.container,
      ...popUpContainer
    }
  }, React.createElement("div", {
    style: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 700
    }
  }, popUpState === popUpStateEnum.muteCamera || popUpState === popUpStateEnum.muteMic ? 'Mute ' : 'Unmute ', popUpState === popUpStateEnum.muteCamera || popUpState === popUpStateEnum.unmuteCamera ? 'Camera' : 'Mic', "?"), React.createElement("div", {
    style: {
      flexDirection: 'row',
      display: 'flex',
      width: '100%',
      justifyContent: 'space-around'
    }
  }, React.createElement("div", {
    onClick: () => {
      switch (popUpState) {
        case popUpStateEnum.muteCamera:
          local.hasVideo && localVideoTrack && muteVideo(local, dispatch, localVideoTrack);
          break;

        case popUpStateEnum.muteMic:
          local.hasAudio && localAudioTrack && muteAudio(local, dispatch, localAudioTrack);
          break;

        case popUpStateEnum.unmuteCamera:
          !local.hasVideo && localVideoTrack && muteVideo(local, dispatch, localVideoTrack);
          break;

        case popUpStateEnum.unmuteMic:
          !local.hasAudio && localAudioTrack && muteAudio(local, dispatch, localAudioTrack);
          break;
      }

      setPopUpState(popUpStateEnum.closed);
    },
    style: styles$3.button
  }, "Confirm"), React.createElement("div", {
    style: styles$3.buttonClose,
    onClick: () => setPopUpState(popUpStateEnum.closed)
  }, "Close"))) : null;
}

const styles$3 = {
  button: {
    color: '#fff',
    cursor: 'pointer',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#fff',
    padding: '2px 4px',
    borderRadius: 4
  },
  buttonClose: {
    color: '#fff',
    cursor: 'pointer',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#fff',
    padding: '2px 4px',
    borderRadius: 4
  },
  container: {
    backgroundColor: '#007bffaa',
    position: 'absolute',
    width: 240,
    height: 80,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  }
};

const AgoraUIKit = props => {
  const {
    styleProps,
    rtcProps
  } = props;
  const {
    UIKitContainer
  } = styleProps || {};
  return React.createElement(PropsProvider, {
    value: props
  }, React.createElement("div", {
    style: { ...style$1,
      ...UIKitContainer
    }
  }, rtcProps.role === 'audience' ? React.createElement(VideocallUI, null) : React.createElement(TracksConfigure, null, React.createElement(VideocallUI, null))));
};

const VideocallUI = () => {
  const {
    rtcProps
  } = useContext(PropsContext);
  return React.createElement(RtcConfigure, {
    callActive: rtcProps.callActive
  }, React.createElement(LocalUserContext, null, rtcProps.disableRtm ? React.createElement(React.Fragment, null, (rtcProps === null || rtcProps === void 0 ? void 0 : rtcProps.layout) === layout.grid ? React.createElement(GridVideo, null) : React.createElement(PinnedVideo, null), React.createElement(LocalControls, null)) : React.createElement(RtmConfigure, null, React.createElement(PopUp, null), (rtcProps === null || rtcProps === void 0 ? void 0 : rtcProps.layout) === layout.grid ? React.createElement(GridVideo, null) : React.createElement(PinnedVideo, null), React.createElement(LocalControls, null))));
};
const style$1 = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  flexDirection: 'column'
};

function EndCall() {
  const {
    styleProps,
    callbacks
  } = useContext(PropsContext);
  const {
    localBtnStyles
  } = styleProps || {};
  const {
    endCall
  } = localBtnStyles || {};
  return React.createElement(BtnTemplate, {
    style: endCall || {
      backgroundColor: '#ef5588',
      borderColor: '#f00'
    },
    name: 'callEnd',
    onClick: () => (callbacks === null || callbacks === void 0 ? void 0 : callbacks.EndCall) && callbacks.EndCall()
  });
}

export default AgoraUIKit;
export { BtnTemplate, EndCall, GridVideo, LocalAudioMute, LocalControls, LocalUserContext, LocalVideoMute, MaxUidContext, MaxVideoView, MinUidContext, MinVideoView, PinnedVideo, PropsContext, RemoteAudioMute, PopUp as RemoteMutePopUp, RemoteVideoMute, RtcConfigure, RtcConsumer, RtcContext, RtcProvider, RtmConfigure, RtmConsumer, RtmContext, RtmProvider, SwapUser, TracksConfigure, TracksContext, VideoPlaceholder, VideocallUI, createRawMessage, icons, layout, muteAudio, muteVideo, mutingDevice, parsePayload, popUpStateEnum, rtmStatusEnum };
//# sourceMappingURL=index.modern.js.map
