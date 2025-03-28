import React, { useRef, useContext, useState, useReducer, useEffect, createContext } from 'react';
import AgoraRTC, { createClient, AgoraVideoPlayer, createMicrophoneAndCameraTracks } from 'agora-rtc-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AgoraRTM, { createLazyChannel, createLazyClient } from 'agora-rtm-react';

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

// A type of promise-like that resolves synchronously and supports only one observer

const _iteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.iterator || (Symbol.iterator = Symbol("Symbol.iterator"))) : "@@iterator";

const _asyncIteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.asyncIterator || (Symbol.asyncIterator = Symbol("Symbol.asyncIterator"))) : "@@asyncIterator";

// Asynchronously call a function and send errors to recovery continuation
function _catch(body, recover) {
	try {
		var result = body();
	} catch(e) {
		return recover(e);
	}
	if (result && result.then) {
		return result.then(void 0, recover);
	}
	return result;
}

var RtcContext = React.createContext({});
var RtcProvider = RtcContext.Provider;
var RtcConsumer = RtcContext.Consumer;

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

var initialValue = {
  rtcProps: {
    appId: '',
    channel: '',
    role: 'host'
  },
  rtmProps: {}
};
var PropsContext = React.createContext(initialValue);
var PropsProvider = PropsContext.Provider;

var MaxUidContext = React.createContext([]);
var MaxUidProvider = MaxUidContext.Provider;
var MaxUidConsumer = MaxUidContext.Consumer;

var MinUidContext = React.createContext([]);
var MinUidProvider = MinUidContext.Provider;
var MinUidConsumer = MinUidContext.Consumer;

var TracksContext = React.createContext({});
var TracksProvider = TracksContext.Provider;

var initState = {
  max: [{
    uid: 0,
    hasAudio: remoteTrackState.no,
    hasVideo: remoteTrackState.no
  }],
  min: []
};

var reducer = function reducer(state, action) {
  var stateUpdate = initState;
  var uids = [].concat(state.max, state.min).map(function (u) {
    return u.uid;
  });

  switch (action.type) {
    case 'update-user-video':
      {
        stateUpdate = {
          min: state.min.map(function (user) {
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
          max: state.max.map(function (user) {
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
          var minUpdate = [].concat(state.min, [{
            uid: action.value[0].uid,
            hasAudio: remoteTrackState.no,
            hasVideo: remoteTrackState.no
          }]);

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
          var UIKitUser = state.min.find(function (user) {
            return user.uid === action.value[0].uid;
          });

          if (UIKitUser) {
            var _minUpdate = [].concat(state.min.filter(function (user) {
              return user.uid !== action.value[0].uid;
            }), [{
              uid: action.value[0].uid,
              hasAudio: action.value[1] === 'audio' ? remoteTrackState.no : UIKitUser.hasAudio,
              hasVideo: action.value[1] === 'video' ? remoteTrackState.no : UIKitUser.hasVideo
            }]);

            stateUpdate = {
              min: _minUpdate,
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
            min: state.min.map(function (user) {
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
          var _minUpdate2 = [].concat(state.min);

          stateUpdate = {
            max: [_minUpdate2.pop()],
            min: _minUpdate2
          };
        } else {
          stateUpdate = {
            min: state.min.filter(function (user) {
              return user.uid !== action.value[0].uid;
            }),
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
            min: [].concat(state.min.filter(function (user) {
              return user.uid !== action.value[0].uid;
            }), [state.max[0]])
          };
        }
      }

      break;

    case 'local-user-mute-video':
      {
        stateUpdate = {
          min: state.min.map(function (user) {
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
          max: state.max.map(function (user) {
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
          min: state.min.map(function (user) {
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
          max: state.max.map(function (user) {
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
          min: state.min.map(function (user) {
            if (user.uid === action.value[0].uid) {
              return {
                uid: user.uid,
                hasVideo: action.value[1],
                hasAudio: user.hasAudio
              };
            } else return user;
          }),
          max: state.max.map(function (user) {
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
          min: state.min.map(function (user) {
            if (user.uid === action.value[0].uid) return {
              uid: user.uid,
              hasAudio: action.value[1],
              hasVideo: user.hasVideo
            };else return user;
          }),
          max: state.max.map(function (user) {
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
          stateUpdate = _extends({}, state);
        } else {
          stateUpdate = {
            max: [state.min.find(function (user) {
              return user.uid === action.value[0];
            })],
            min: [].concat(state.min.filter(function (user) {
              return user.uid !== action.value[0];
            }), [state.max[0]])
          };
        }
      }

      break;
  }

  return _extends({}, state, stateUpdate);
};

var useClient = createClient({
  codec: 'vp8',
  mode: 'live'
});

var RtcConfigure = function RtcConfigure(props) {
  var uid = useRef();

  var _useContext = useContext(TracksContext),
      localVideoTrack = _useContext.localVideoTrack,
      localAudioTrack = _useContext.localAudioTrack;

  var _useContext2 = useContext(PropsContext),
      callbacks = _useContext2.callbacks,
      rtcProps = _useContext2.rtcProps;

  var _useState = useState(false),
      ready = _useState[0],
      setReady = _useState[1];

  var _useState2 = useState(false),
      channelJoined = _useState2[0],
      setChannelJoined = _useState2[1];

  var joinRes = null;
  var canJoin = useRef(new Promise(function (resolve, reject) {
    joinRes = resolve;
    console.log(reject);
  }));
  var client = useClient();

  if (rtcProps.customRtcClient) {
    client.removeAllListeners();
    client = rtcProps.customRtcClient;
  }

  var localVideoTrackHasPublished = false;
  var localAudioTrackHasPublished = false;
  var mediaStore = useRef({});
  var callActive = props.callActive;

  if (callActive === undefined) {
    callActive = true;
  }

  var _useReducer = useReducer(reducer, initState),
      uidState = _useReducer[0],
      dispatch = _useReducer[1];

  useEffect(function () {
    var init = function init() {
      try {
        try {
          console.log(client);
          client.on('user-joined', function () {
            try {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }

              var remoteUser = args[0];
              mediaStore.current[remoteUser.uid] = {};
              dispatch({
                type: 'user-joined',
                value: args
              });
              return Promise.resolve();
            } catch (e) {
              return Promise.reject(e);
            }
          });
          client.on('user-published', function () {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            try {
              var remoteUser = args[0],
                  mediaType = args[1];
              console.log('user-published', remoteUser.uid);
              client.subscribe(remoteUser, mediaType).then(function (_e) {
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
              })["catch"](function (e) {
                return console.log(e);
              });
              return Promise.resolve();
            } catch (e) {
              return Promise.reject(e);
            }
          });
          client.on('user-unpublished', function () {
            try {
              for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
              }

              var remoteUser = args[0],
                  mediaType = args[1];
              console.log('user-unpublished', remoteUser.uid);

              if (mediaType === 'audio') {
                var _remoteUser$audioTrac2;

                (_remoteUser$audioTrac2 = remoteUser.audioTrack) === null || _remoteUser$audioTrac2 === void 0 ? void 0 : _remoteUser$audioTrac2.stop();
              }

              dispatch({
                type: 'user-unpublished',
                value: args
              });
              return Promise.resolve();
            } catch (e) {
              return Promise.reject(e);
            }
          });
          client.on('connection-state-change', function () {
            try {
              for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                args[_key4] = arguments[_key4];
              }

              var curState = args[0],
                  prevState = args[1],
                  reason = args[2];
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

              return Promise.resolve();
            } catch (e) {
              return Promise.reject(e);
            }
          });
          client.on('user-left', function () {
            for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
              args[_key5] = arguments[_key5];
            }

            dispatch({
              type: 'user-left',
              value: args
            });
          });

          if (rtcProps.tokenUrl) {
            var tokenUrl = rtcProps.tokenUrl,
                channel = rtcProps.channel,
                _uid = rtcProps.uid;
            client.on('token-privilege-will-expire', function () {
              try {
                console.log('token will expire');
                return Promise.resolve(fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (_uid || 0) + '/')).then(function (res) {
                  return Promise.resolve(res.json()).then(function (data) {
                    var token = data.rtcToken;
                    client.renewToken(token);
                  });
                });
              } catch (e) {
                return Promise.reject(e);
              }
            });
            client.on('token-privilege-did-expire', function () {
              try {
                return Promise.resolve(fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (_uid || 0) + '/')).then(function (res) {
                  return Promise.resolve(res.json()).then(function (data) {
                    var token = data.rtcToken;
                    client.renewToken(token);
                  });
                });
              } catch (e) {
                return Promise.reject(e);
              }
            });
          }

          if (callbacks) {
            var events = Object.keys(callbacks);
            events.map(function (e) {
              try {
                client.on(e, function () {
                  ;

                  for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
                    args[_key6] = arguments[_key6];
                  }

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

        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    };

    if (joinRes) {
      init();
      return function () {
        try {
          client.removeAllListeners();
        } catch (e) {
          console.log(e);
        }
      };
    } else return function () {};
  }, [rtcProps.appId]);
  useEffect(function () {
    var join = function join() {
      try {
        return Promise.resolve(canJoin.current).then(function () {
          var tokenUrl = rtcProps.tokenUrl,
              channel = rtcProps.channel,
              userUid = rtcProps.uid,
              appId = rtcProps.appId,
              token = rtcProps.token;

          var _temp3 = function () {
            if (client) {
              if (rtcProps.role === 'audience') {
                client.setClientRole(rtcProps.role);
              } else {
                client.setClientRole('host');
              }

              var _temp4 = function () {
                if (tokenUrl) {
                  var _temp5 = _catch(function () {
                    return Promise.resolve(fetch(tokenUrl + '/rtc/' + channel + '/publisher/uid/' + (userUid || 0) + '/')).then(function (res) {
                      return Promise.resolve(res.json()).then(function (data) {
                        var token = data.rtcToken;
                        return Promise.resolve(client.join(appId, channel, token, userUid || 0)).then(function (_client$join) {
                          uid.current = _client$join;
                        });
                      });
                    });
                  }, function (e) {
                    console.log(e);
                  });

                  if (_temp5 && _temp5.then) return _temp5.then(function () {});
                } else {
                  return Promise.resolve(client.join(appId, channel, token || null, userUid || 0)).then(function (_client$join2) {
                    uid.current = _client$join2;
                  });
                }
              }();

              if (_temp4 && _temp4.then) return _temp4.then(function () {});
            } else {
              console.error('trying to join before RTC Engine was initialized');
            }
          }();

          if (_temp3 && _temp3.then) return _temp3.then(function () {});
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };

    if (callActive) {
      join();
      console.log('Attempted join: ', rtcProps.channel);
    } else {
      console.log('In precall - waiting to join');
    }

    return function () {
      if (callActive) {
        console.log('Leaving channel');
        canJoin.current = client.leave()["catch"](function (err) {
          return console.log(err);
        });
      }
    };
  }, [rtcProps.channel, rtcProps.uid, callActive, rtcProps.tokenUrl]);
  useEffect(function () {
    var publish = function publish() {
      try {
        var _temp15 = function _temp15() {
          function _temp10() {
            var _temp8 = function () {
              if (localVideoTrack !== null && localVideoTrack !== void 0 && localVideoTrack.enabled && channelJoined) {
                var _temp13 = function () {
                  if (!localVideoTrackHasPublished) {
                    return Promise.resolve(client.publish([localVideoTrack]).then(function () {
                      localVideoTrackHasPublished = true;
                    })).then(function () {});
                  }
                }();

                if (_temp13 && _temp13.then) return _temp13.then(function () {});
              }
            }();

            if (_temp8 && _temp8.then) return _temp8.then(function () {});
          }

          var _temp9 = function () {
            if (localAudioTrack !== null && localAudioTrack !== void 0 && localAudioTrack.enabled && channelJoined) {
              var _temp14 = function () {
                if (!localAudioTrackHasPublished) {
                  return Promise.resolve(client.publish([localAudioTrack]).then(function () {
                    localAudioTrackHasPublished = true;
                  })).then(function () {});
                }
              }();

              if (_temp14 && _temp14.then) return _temp14.then(function () {});
            }
          }();

          return _temp9 && _temp9.then ? _temp9.then(_temp10) : _temp10(_temp9);
        };

        var _temp16 = function () {
          if (rtcProps.enableDualStream) {
            return Promise.resolve(client.enableDualStream()).then(function () {});
          }
        }();

        return Promise.resolve(_temp16 && _temp16.then ? _temp16.then(_temp15) : _temp15(_temp16));
      } catch (e) {
        return Promise.reject(e);
      }
    };

    console.log('Publish', localVideoTrack, localAudioTrack, callActive);

    if (callActive) {
      publish();
    }
  }, [callActive, localVideoTrack === null || localVideoTrack === void 0 ? void 0 : localVideoTrack.enabled, localAudioTrack === null || localAudioTrack === void 0 ? void 0 : localAudioTrack.enabled, channelJoined]);
  useEffect(function () {
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
  useEffect(function () {
    if (channelJoined && rtcProps.token) {
      client.renewToken(rtcProps.token).then(function (e) {
        return console.log('renewed token', e);
      });
    }
  }, [rtcProps.token, channelJoined]);
  useEffect(function () {
    if (rtcProps.role) {
      client.setClientRole(rtcProps.role).then(function (e) {
        return console.log('changed role', e);
      });
    }
  }, [rtcProps.role, channelJoined]);
  useEffect(function () {
    var enableActiveSpeaker = function enableActiveSpeaker() {
      try {
        var _temp18 = function () {
          if (rtcProps.activeSpeaker && rtcProps.layout !== layout.grid) {
            client.on('volume-indicator', function (volumes) {
              var highestvolumeObj = volumes.reduce(function (highestVolume, volume) {
                if (highestVolume === null) {
                  return volume;
                } else {
                  if (volume.level > highestVolume.level) {
                    return volume;
                  }

                  return highestVolume;
                }
              }, null);
              var activeSpeaker = highestvolumeObj ? highestvolumeObj.uid : undefined;
              var mapActiveSpeakerToZero = activeSpeaker === uid.current ? 0 : activeSpeaker;

              if (activeSpeaker !== undefined) {
                dispatch({
                  type: 'ActiveSpeaker',
                  value: [mapActiveSpeakerToZero]
                });
              }
            });
            return Promise.resolve(client.enableAudioVolumeIndicator()).then(function () {});
          }
        }();

        return Promise.resolve(_temp18 && _temp18.then ? _temp18.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };

    if (callActive) {
      enableActiveSpeaker();
    }

    return function () {
      client.removeAllListeners('volume-indicator');
    };
  }, [rtcProps.activeSpeaker, rtcProps.layout]);
  return React.createElement(RtcProvider, {
    value: {
      client: client,
      mediaStore: mediaStore.current,
      localVideoTrack: localVideoTrack,
      localAudioTrack: localAudioTrack,
      dispatch: dispatch,
      localUid: uid,
      channelJoined: channelJoined
    }
  }, React.createElement(MaxUidProvider, {
    value: uidState.max
  }, React.createElement(MinUidProvider, {
    value: uidState.min
  }, ready ? props.children : null)));
};

var icons = {
  videocam: React.createElement(FontAwesomeIcon, {
    icon: 'fa-solid fa-video',
    color: '#FFF'
  }),
  videocamOff: React.createElement(FontAwesomeIcon, {
    icon: 'fa-solid fa-video-slash',
    color: '#FFF'
  }),
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
  mic: React.createElement(FontAwesomeIcon, {
    icon: 'fa-solid fa-microphone',
    color: '#FFF'
  }),
  micOff: React.createElement(FontAwesomeIcon, {
    icon: 'fa-solid fa-microphone-slash',
    color: '#FFF'
  })
};

var iconsColors = {
  videocam: '#00C2FF',
  videocamOff: '#A3A2A2',
  remoteSwap: 'transparent',
  callEnd: 'red',
  mic: '#00C2FF',
  micOff: '#A3A2A2'
};

var BtnTemplate = function BtnTemplate(props) {
  var onClick = props.onClick,
      name = props.name,
      disabled = props.disabled,
      style = props.style;

  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _ref = styleProps || {},
      theme = _ref.theme,
      BtnTemplateStyles = _ref.BtnTemplateStyles,
      iconSize = _ref.iconSize,
      customIcon = _ref.customIcon;

  return React.createElement("div", {
    style: _extends({}, {
      width: 35,
      height: 35,
      borderRadius: '100%',
      borderColor: 'transparent',
      backgroundColor: iconsColors[name],
      alignItems: 'center',
      justifyContent: 'center',
      display: 'flex',
      cursor: disabled ? 'auto' : 'pointer',
      margin: 4
    }, BtnTemplateStyles, style),
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
    width: '48',
    height: '48',
    viewBox: '0 0 24 24',
    fill: 'none',
    opacity: disabled ? '0.5' : '1',
    stroke: theme || '#fff',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, icons[name]));
};

var LocalContext = createContext({});

var LocalUserContext = function LocalUserContext(props) {
  var max = useContext(MaxUidContext);
  var min = useContext(MinUidContext);
  var localUser;

  if (max[0].uid === 0) {
    localUser = max[0];
  } else {
    localUser = min.find(function (u) {
      return u.uid === 0;
    });
  }

  return React.createElement(LocalContext.Provider, {
    value: localUser
  }, props.children);
};

var muteAudio = (function (user, dispatch, localAudioTrack) {
  try {
    var _temp4 = function () {
      if (user.uid === 0) {
        var localState = user.hasAudio;

        var _temp5 = function () {
          if (localState === ToggleState.enabled || localState === ToggleState.disabled) {
            dispatch({
              type: 'local-user-mute-audio',
              value: [localState === ToggleState.enabled ? ToggleState.disabling : ToggleState.enabling]
            });

            var _temp6 = _catch(function () {
              return Promise.resolve(localAudioTrack === null || localAudioTrack === void 0 ? void 0 : localAudioTrack.setEnabled(localState !== ToggleState.enabled)).then(function () {
                dispatch({
                  type: 'local-user-mute-audio',
                  value: [localState === ToggleState.enabled ? ToggleState.disabled : ToggleState.enabled]
                });
              });
            }, function () {
              dispatch({
                type: 'local-user-mute-audio',
                value: [localState]
              });
            });

            if (_temp6 && _temp6.then) return _temp6.then(function () {});
          }
        }();

        if (_temp5 && _temp5.then) return _temp5.then(function () {});
      }
    }();

    return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
});

function LocalAudioMute() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _ref = styleProps || {},
      localBtnStyles = _ref.localBtnStyles;

  var _ref2 = localBtnStyles || {},
      muteLocalAudio = _ref2.muteLocalAudio;

  var _useContext2 = useContext(RtcContext),
      dispatch = _useContext2.dispatch,
      localAudioTrack = _useContext2.localAudioTrack;

  var local = useContext(LocalContext);
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteLocalAudio,
    name: local.hasAudio === ToggleState.enabled ? 'mic' : 'micOff',
    onClick: function onClick() {
      return localAudioTrack && muteAudio(local, dispatch, localAudioTrack);
    }
  }));
}

var muteVideo = (function (user, dispatch, localVideoTrack) {
  try {
    var _temp4 = function () {
      if (user.uid === 0) {
        var localState = user.hasVideo;

        var _temp5 = function () {
          if (localState === ToggleState.enabled || localState === ToggleState.disabled) {
            dispatch({
              type: 'local-user-mute-video',
              value: [localState === ToggleState.enabled ? ToggleState.disabling : ToggleState.enabling]
            });

            var _temp6 = _catch(function () {
              return Promise.resolve(localVideoTrack === null || localVideoTrack === void 0 ? void 0 : localVideoTrack.setEnabled(localState !== ToggleState.enabled)).then(function () {
                dispatch({
                  type: 'local-user-mute-video',
                  value: [localState === ToggleState.enabled ? ToggleState.disabled : ToggleState.enabled]
                });
              });
            }, function () {
              dispatch({
                type: 'local-user-mute-video',
                value: [localState]
              });
            });

            if (_temp6 && _temp6.then) return _temp6.then(function () {});
          }
        }();

        if (_temp5 && _temp5.then) return _temp5.then(function () {});
      }
    }();

    return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
});

function LocalVideoMute() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _ref = styleProps || {},
      localBtnStyles = _ref.localBtnStyles;

  var _ref2 = localBtnStyles || {},
      muteLocalVideo = _ref2.muteLocalVideo;

  var _useContext2 = useContext(RtcContext),
      dispatch = _useContext2.dispatch,
      localVideoTrack = _useContext2.localVideoTrack;

  var local = useContext(LocalContext);
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteLocalVideo,
    name: local.hasVideo === ToggleState.enabled ? 'videocam' : 'videocamOff',
    onClick: function onClick() {
      return localVideoTrack && muteVideo(local, dispatch, localVideoTrack);
    }
  }));
}

function LocalControls() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps,
      rtcProps = _useContext.rtcProps;

  var _ref = styleProps || {},
      localBtnContainer = _ref.localBtnContainer;

  return React.createElement("div", {
    style: _extends({}, {
      width: '100%',
      height: 70,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center'
    }, localBtnContainer)
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

var RtmContext = createContext(null);
var RtmProvider = RtmContext.Provider;
var RtmConsumer = RtmContext.Consumer;

function RemoteVideoMute(props) {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _useContext2 = useContext(RtmContext),
      sendMuteRequest = _useContext2.sendMuteRequest,
      uidMap = _useContext2.uidMap;

  var _ref = styleProps || {},
      remoteBtnStyles = _ref.remoteBtnStyles;

  var _ref2 = remoteBtnStyles || {},
      muteRemoteVideo = _ref2.muteRemoteVideo;

  var UIKitUser = props.UIKitUser;
  var isMuted = UIKitUser.hasVideo === remoteTrackState.no;
  return UIKitUser.uid !== 0 && uidMap[UIKitUser.uid] ? React.createElement("div", null, React.createElement(BtnTemplate, {
    name: UIKitUser.hasVideo === remoteTrackState.subbed ? 'videocam' : 'videocamOff',
    style: muteRemoteVideo,
    onClick: function onClick() {
      return sendMuteRequest(mutingDevice.camera, UIKitUser.uid, !isMuted);
    }
  })) : null;
}

function RemoteAudioMute(props) {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _ref = styleProps || {},
      remoteBtnStyles = _ref.remoteBtnStyles;

  var _useContext2 = useContext(RtmContext),
      sendMuteRequest = _useContext2.sendMuteRequest,
      uidMap = _useContext2.uidMap;

  var _ref2 = remoteBtnStyles || {},
      muteRemoteAudio = _ref2.muteRemoteAudio;

  var UIKitUser = props.UIKitUser;
  var isMuted = UIKitUser.hasAudio === remoteTrackState.no;
  return UIKitUser.uid !== 0 && uidMap[UIKitUser.uid] ? React.createElement("div", null, React.createElement(BtnTemplate, {
    style: muteRemoteAudio,
    name: UIKitUser.hasAudio === remoteTrackState.subbed ? 'mic' : 'micOff',
    onClick: function onClick() {
      return sendMuteRequest(mutingDevice.microphone, UIKitUser.uid, !isMuted);
    }
  })) : null;
}

function SwapUser(props) {
  var _useContext = useContext(RtcContext),
      dispatch = _useContext.dispatch;

  var UIKitUser = props.UIKitUser;
  return React.createElement("div", null, React.createElement(BtnTemplate, {
    name: 'remoteSwap',
    onClick: function onClick() {
      return dispatch({
        type: 'user-swap',
        value: [UIKitUser]
      });
    }
  }));
}

var VideoPlaceholder = function VideoPlaceholder(props) {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps,
      rtcProps = _useContext.rtcProps;

  var _ref = styleProps || {},
      maxViewStyles = _ref.maxViewStyles,
      maxViewOverlayContainer = _ref.maxViewOverlayContainer;

  var user = props.user;
  var CustomVideoPlaceholder = rtcProps.CustomVideoPlaceholder;
  return !CustomVideoPlaceholder ? React.createElement("div", {
    key: user.uid,
    style: _extends({}, style.max, maxViewStyles)
  }, React.createElement(FontAwesomeIcon, {
    "data-testid": 'icon',
    icon: 'fa-solid fa-circle-user',
    fontSize: 80,
    color: '#C4C4C4'
  }), props.isShown && React.createElement("div", {
    style: _extends({}, style.btnContainer, maxViewOverlayContainer)
  }, props.showButtons && React.createElement(React.Fragment, null, !rtcProps.disableRtm && React.createElement(RemoteVideoMute, {
    UIKitUser: user
  }), !rtcProps.disableRtm && React.createElement(RemoteAudioMute, {
    UIKitUser: user
  }), props.showSwap && React.createElement(SwapUser, {
    UIKitUser: user
  })))) : CustomVideoPlaceholder && CustomVideoPlaceholder(_extends({}, props), null);
};

var style = {
  max: {
    flex: 1,
    display: 'flex',
    backgroundColor: '#007bff33',
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center'
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

var Username = function Username(props) {
  var _useContext = useContext(RtmContext),
      usernames = _useContext.usernames;

  var _useContext2 = useContext(PropsContext),
      rtmProps = _useContext2.rtmProps,
      styleProps = _useContext2.styleProps;

  var user = props.user;
  return rtmProps !== null && rtmProps !== void 0 && rtmProps.displayUsername ? React.createElement("p", {
    style: _extends({}, styles.username, styleProps === null || styleProps === void 0 ? void 0 : styleProps.usernameText)
  }, usernames[user.uid]) : React.createElement(React.Fragment, null);
};

var styles = {
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

var MaxVideoView = function MaxVideoView(props) {
  var _useContext = useContext(RtcContext),
      mediaStore = _useContext.mediaStore;

  var _useContext2 = useContext(PropsContext),
      styleProps = _useContext2.styleProps,
      rtcProps = _useContext2.rtcProps;

  var _ref = styleProps || {},
      maxViewStyles = _ref.maxViewStyles,
      videoMode = _ref.videoMode,
      maxViewOverlayContainer = _ref.maxViewOverlayContainer;

  var renderModeProp = videoMode === null || videoMode === void 0 ? void 0 : videoMode.max;

  var _useState = useState(false),
      isShown = _useState[0],
      setIsShown = _useState[1];

  var user = props.user;
  return React.createElement("div", {
    style: _extends({}, styles$1.container, props.style, maxViewStyles),
    onMouseEnter: function onMouseEnter() {
      return setIsShown(true);
    },
    onMouseLeave: function onMouseLeave() {
      return setIsShown(false);
    }
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
    style: _extends({}, styles$1.overlay, maxViewOverlayContainer)
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

var styles$1 = {
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

var MinVideoView = function MinVideoView(props) {
  var _useContext = useContext(RtcContext),
      mediaStore = _useContext.mediaStore;

  var _useContext2 = useContext(PropsContext),
      styleProps = _useContext2.styleProps,
      rtcProps = _useContext2.rtcProps;

  var _ref = styleProps || {},
      minViewStyles = _ref.minViewStyles,
      videoMode = _ref.videoMode,
      minViewOverlayContainer = _ref.minViewOverlayContainer;

  var renderModeProp = videoMode === null || videoMode === void 0 ? void 0 : videoMode.min;

  var _useState = useState(false),
      isShown = _useState[0],
      setIsShown = _useState[1];

  var user = props.user;
  return React.createElement("div", {
    style: _extends({}, {
      display: 'flex',
      flex: 1
    }, minViewStyles),
    onMouseEnter: function onMouseEnter() {
      return setIsShown(true);
    },
    onMouseLeave: function onMouseLeave() {
      return setIsShown(false);
    }
  }, user.hasVideo === 1 ? React.createElement("div", {
    style: _extends({}, {
      display: 'flex',
      flex: 1,
      position: 'relative'
    })
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
    style: _extends({}, {
      margin: 4,
      position: 'absolute',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }, minViewOverlayContainer)
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

var PinnedVideo = function PinnedVideo() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps,
      rtcProps = _useContext.rtcProps;

  var _ref = styleProps || {},
      minViewContainer = _ref.minViewContainer,
      pinnedVideoContainer = _ref.pinnedVideoContainer,
      maxViewContainer = _ref.maxViewContainer,
      scrollViewContainer = _ref.scrollViewContainer;

  var parentRef = useRef(null);

  var _useState = useState(0),
      width = _useState[0],
      setWidth = _useState[1];

  var _useState2 = useState(0),
      height = _useState2[0],
      setHeight = _useState2[1];

  var isLandscape = width > height;
  useEffect(function () {
    var handleResize = function handleResize() {
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

    return function () {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return React.createElement("div", {
    ref: parentRef,
    style: _extends({}, {
      display: 'flex',
      flex: 1,
      flexDirection: 'row',
      overflow: 'hidden',
      position: 'relative'
    }, pinnedVideoContainer)
  }, React.createElement("div", {
    style: _extends({}, {
      display: 'flex',
      flex: isLandscape ? 5 : 4
    }, maxViewContainer)
  }, React.createElement(MaxUidConsumer, null, function (maxUsers) {
    return rtcProps.role === 'audience' && maxUsers[0].uid === 0 ? null : React.createElement(MaxVideoView, {
      user: maxUsers[0]
    });
  })), React.createElement("div", {
    style: _extends({}, {
      overflowY: 'hidden',
      overflowX: 'hidden',
      display: 'flex',
      flex: 1,
      flexDirection: isLandscape ? 'column' : 'row',
      position: 'absolute',
      width: '131px',
      height: '200px',
      bottom: '27px',
      right: '17px',
      borderRadius: '10px'
    }, scrollViewContainer)
  }, React.createElement(MinUidConsumer, null, function (minUsers) {
    return minUsers.map(function (user) {
      return rtcProps.role === 'audience' && user.uid === 0 ? null : React.createElement("div", {
        style: _extends({}, {
          minHeight: '200px',
          minWidth: '131px',
          display: 'flex',
          position: 'absolute'
        }, minViewContainer),
        key: user.uid
      }, React.createElement(MinVideoView, {
        user: user
      }));
    });
  })));
};

var GridVideo = function GridVideo() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps,
      rtcProps = _useContext.rtcProps;

  var _ref = styleProps || {},
      gridVideoCells = _ref.gridVideoCells,
      gridVideoContainer = _ref.gridVideoContainer;

  var max = useContext(MaxUidContext);
  var min = useContext(MinUidContext);
  var users = rtcProps.role === 'audience' ? [].concat(max, min).filter(function (user) {
    return user.uid !== 0;
  }) : [].concat(max, min);
  var parentRef = useRef(null);

  var _useState = useState(window.innerWidth),
      width = _useState[0],
      setWidth = _useState[1];

  var _useState2 = useState(window.innerHeight),
      height = _useState2[0],
      setHeight = _useState2[1];

  var isLandscape = width > height;
  var unit = 'minmax(0, 1fr) ';
  useEffect(function () {
    var handleResize = function handleResize() {
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

    return function () {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return React.createElement("div", {
    ref: parentRef,
    style: _extends({}, {
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: isLandscape ? users.length > 9 ? unit.repeat(4) : users.length > 4 ? unit.repeat(3) : users.length > 1 ? unit.repeat(2) : unit : users.length > 8 ? unit.repeat(3) : users.length > 2 ? unit.repeat(2) : unit
    }, gridVideoContainer)
  }, users.map(function (user) {
    return React.createElement(MaxVideoView, {
      user: user,
      style: _extends({}, {
        height: '100%',
        width: '100%'
      }, gridVideoCells),
      key: user.uid
    });
  }));
};

var useTracks = createMicrophoneAndCameraTracks({
  encoderConfig: {}
}, {
  encoderConfig: {}
});

var TracksConfigure = function TracksConfigure(props) {
  var _useState = useState(false),
      ready = _useState[0],
      setReady = _useState[1];

  var _useState2 = useState(null),
      localVideoTrack = _useState2[0],
      setLocalVideoTrack = _useState2[1];

  var _useState3 = useState(null),
      localAudioTrack = _useState3[0],
      setLocalAudioTrack = _useState3[1];

  var _useTracks = useTracks(),
      trackReady = _useTracks.ready,
      tracks = _useTracks.tracks,
      error = _useTracks.error;

  var mediaStore = useRef({});
  useEffect(function () {
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

    return function () {
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

var timeNow = function timeNow() {
  return new Date().getTime();
};

var useChannel = createLazyChannel();
var useClient$1 = createLazyClient();

var RtmConfigure = function RtmConfigure(props) {
  var _useContext = useContext(PropsContext),
      rtcProps = _useContext.rtcProps,
      rtmProps = _useContext.rtmProps;

  var _useState = useState(false),
      isLoggedIn = _useState[0],
      setLoggedIn = _useState[1];

  var rtmClient = useClient$1(rtcProps.appId);
  var channel = useChannel(rtmClient, rtcProps.channel);
  var localUid = useRef('');
  var timerValueRef = useRef(5);
  var local = useContext(LocalContext);

  var _useContext2 = useContext(PropsContext),
      rtmCallbacks = _useContext2.rtmCallbacks;

  var _useState2 = useState({}),
      uidMap = _useState2[0],
      setUidMap = _useState2[1];

  var _useState3 = useState({}),
      usernames = _useState3[0],
      setUsernames = _useState3[1];

  var _useState4 = useState({}),
      userDataMap = _useState4[0],
      setUserDataMap = _useState4[1];

  var _useState5 = useState(popUpStateEnum.closed),
      popUpState = _useState5[0],
      setPopUpState = _useState5[1];

  var _useState6 = useState(rtmStatusEnum.offline),
      rtmStatus = _useState6[0],
      setRtmStatus = _useState6[1];

  var _useContext3 = useContext(RtcContext),
      rtcUid = _useContext3.localUid,
      localAudioTrack = _useContext3.localAudioTrack,
      localVideoTrack = _useContext3.localVideoTrack,
      dispatch = _useContext3.dispatch,
      channelJoined = _useContext3.channelJoined;

  var login = function login() {
    try {
      var tokenUrl = rtcProps.tokenUrl;

      var _temp4 = function () {
        if (tokenUrl) {
          var _temp5 = _catch(function () {
            return Promise.resolve(fetch(tokenUrl + '/rtm/' + ((rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current))).then(function (res) {
              return Promise.resolve(res.json()).then(function (data) {
                var serverToken = data.rtmToken;
                return Promise.resolve(rtmClient.login({
                  uid: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current,
                  token: serverToken
                })).then(function () {
                  timerValueRef.current = 5;
                });
              });
            });
          }, function () {
            setTimeout(function () {
              try {
                timerValueRef.current = timerValueRef.current + timerValueRef.current;
                login();
                return Promise.resolve();
              } catch (e) {
                return Promise.reject(e);
              }
            }, timerValueRef.current * 1000);
          });

          if (_temp5 && _temp5.then) return _temp5.then(function () {});
        } else {
          var _temp6 = _catch(function () {
            return Promise.resolve(rtmClient.login({
              uid: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current,
              token: (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.token) || undefined
            })).then(function () {
              timerValueRef.current = 5;
            });
          }, function () {
            setTimeout(function () {
              try {
                timerValueRef.current = timerValueRef.current + timerValueRef.current;
                login();
                return Promise.resolve();
              } catch (e) {
                return Promise.reject(e);
              }
            }, timerValueRef.current * 1000);
          });

          if (_temp6 && _temp6.then) return _temp6.then(function () {});
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var joinChannel = function joinChannel() {
    return Promise.resolve(rtcUid).then(function () {
      var _temp7 = _catch(function () {
        return Promise.resolve(channel.join()).then(function () {
          timerValueRef.current = 5;
        });
      }, function () {
        setTimeout(function () {
          try {
            timerValueRef.current = timerValueRef.current + timerValueRef.current;
            joinChannel();
            return Promise.resolve();
          } catch (e) {
            return Promise.reject(e);
          }
        }, timerValueRef.current * 1000);
      });

      if (_temp7 && _temp7.then) return _temp7.then(function () {});
    });
  };

  var init = function init() {
    try {
      setRtmStatus(rtmStatusEnum.initialising);
      rtcProps.uid ? localUid.current = String(rtcProps.uid) : localUid.current = String(timeNow());
      rtmClient.on('ConnectionStateChanged', function (state, reason) {
        console.log(state, reason);
      });
      rtmClient.on('TokenExpired', function () {
        try {
          var tokenUrl = rtcProps.tokenUrl;
          console.log('token expired - renewing');

          var _temp10 = function () {
            if (tokenUrl) {
              var _temp11 = _catch(function () {
                return Promise.resolve(fetch(tokenUrl + '/rtm/' + ((rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.uid) || localUid.current))).then(function (res) {
                  return Promise.resolve(res.json()).then(function (data) {
                    var serverToken = data.rtmToken;
                    return Promise.resolve(rtmClient.renewToken(serverToken)).then(function () {
                      timerValueRef.current = 5;
                    });
                  });
                });
              }, function (error) {
                console.error('TokenExpiredError', error);
              });

              if (_temp11 && _temp11.then) return _temp11.then(function () {});
            }
          }();

          return Promise.resolve(_temp10 && _temp10.then ? _temp10.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      });
      rtmClient.on('MessageFromPeer', function (message, peerId) {
        handleReceivedMessage(message, peerId);
      });
      channel.on('ChannelMessage', function (message, peerId) {
        handleReceivedMessage(message, peerId);
      });
      channel.on('MemberJoined', function (peerId) {
        try {
          return Promise.resolve(sendPeerMessage(createUserData(), peerId)).then(function () {});
        } catch (e) {
          return Promise.reject(e);
        }
      });
      channel.on('MemberCountUpdated', function (count) {
        try {
          console.log('RTM-MemberCountUpdated: ', count);
          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      });

      if (rtmCallbacks !== null && rtmCallbacks !== void 0 && rtmCallbacks.channel) {
        Object.keys(rtmCallbacks.channel).map(function (callback) {
          if (rtmCallbacks.channel) {
            channel.on(callback, rtmCallbacks.channel[callback]);
          }
        });
      } else if (rtmCallbacks !== null && rtmCallbacks !== void 0 && rtmCallbacks.client) {
        Object.keys(rtmCallbacks.client).map(function (callback) {
          if (rtmCallbacks.client) {
            rtmClient.on(callback, rtmCallbacks.client[callback]);
          }
        });
      }

      if (rtcProps.tokenUrl) {
        var tokenUrl = rtcProps.tokenUrl,
            uid = rtcProps.uid;
        rtmClient.on('TokenExpired', function () {
          try {
            console.log('token expired');
            return Promise.resolve(fetch(tokenUrl + '/rtm/' + (uid || 0) + '/')).then(function (res) {
              return Promise.resolve(res.json()).then(function (data) {
                var token = data.rtmToken;
                rtmClient.renewToken(token);
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        });
      }

      setRtmStatus(rtmStatusEnum.loggingIn);
      return Promise.resolve(login()).then(function () {
        setRtmStatus(rtmStatusEnum.loggedIn);
        return Promise.resolve(joinChannel()).then(function () {
          setRtmStatus(rtmStatusEnum.connected);
          setUsernames(function (p) {
            return _extends({}, p, {
              0: rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.username
            });
          });
          sendChannelMessage(createUserData());
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var createUserData = function createUserData() {
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

  var sendMuteRequest = function sendMuteRequest(device, rtcId, mute) {
    var forced = (rtmProps === null || rtmProps === void 0 ? void 0 : rtmProps.showPopUpBeforeRemoteMute) === false;
    var payload = {
      messageType: 'MuteRequest',
      device: device,
      rtcId: rtcId,
      mute: mute,
      isForceful: forced
    };
    var peerId = uidMap[rtcId];

    if (forced && !mute) {
      console.log('cannot send force unmute request');
    } else if (peerId) {
      sendPeerMessage(payload, peerId);
    } else {
      console.log('peer not found');
    }
  };

  var handleReceivedMessage = function handleReceivedMessage(message, peerId) {
    var payload = message.rawMessage;
    var messageObject = parsePayload(payload);
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

  var handleReceivedUserDataMessage = function handleReceivedUserDataMessage(userData) {
    setUidMap(function (p) {
      var _extends2;

      return _extends({}, p, (_extends2 = {}, _extends2[userData.rtcId] = userData.rtmId, _extends2));
    });
    setUsernames(function (p) {
      var _extends3;

      return _extends({}, p, (_extends3 = {}, _extends3[userData.rtcId] = userData.username, _extends3));
    });
    setUserDataMap(function (p) {
      var _extends4;

      return _extends({}, p, (_extends4 = {}, _extends4[userData.rtmId] = userData, _extends4));
    });
  };

  var handleReceivedMuteMessage = function handleReceivedMuteMessage(muteRequest) {
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

  var handlePing = function handlePing(peerId) {
    sendPeerMessage({
      messageType: 'RtmDataRequest',
      type: 'pong'
    }, peerId);
  };

  var handleUserDataRequest = function handleUserDataRequest(peerId) {
    sendPeerMessage(createUserData(), peerId);
  };

  var sendChannelMessage = function sendChannelMessage(payload) {
    try {
      var rawMessage = createRawMessage(payload);
      var message = rtmClient.createMessage({
        rawMessage: rawMessage,
        messageType: AgoraRTM.MessageType.RAW,
        description: 'AgoraUIKit'
      });
      return Promise.resolve(channel.sendMessage(message)).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var sendPeerMessage = function sendPeerMessage(payload, peerId) {
    try {
      var rawMessage = createRawMessage(payload);
      var message = rtmClient.createMessage({
        rawMessage: rawMessage,
        messageType: AgoraRTM.MessageType.RAW,
        description: 'AgoraUIKit'
      });
      return Promise.resolve(rtmClient.sendMessageToPeer(message, peerId)).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var end = function end() {
    try {
      return Promise.resolve(rtmClient.logout()).then(function () {
        return Promise.resolve(rtmClient.removeAllListeners()).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  useEffect(function () {
    if (channelJoined) {
      init();
      setLoggedIn(true);
    }

    return function () {
      if (channelJoined) {
        end();
      }
    };
  }, [rtcProps.channel, rtcProps.appId, channelJoined]);
  return React.createElement(RtmProvider, {
    value: {
      rtmStatus: rtmStatus,
      sendPeerMessage: sendPeerMessage,
      sendChannelMessage: sendChannelMessage,
      sendMuteRequest: sendMuteRequest,
      rtmClient: rtmClient,
      uidMap: uidMap,
      usernames: usernames,
      userDataMap: userDataMap,
      popUpState: popUpState,
      setPopUpState: setPopUpState
    }
  }, isLoggedIn ? props.children : React.createElement(React.Fragment, null));
};

var enc = new TextEncoder();
var dec = new TextDecoder();
var createRawMessage = function createRawMessage(msg) {
  return enc.encode(JSON.stringify(msg));
};
var parsePayload = function parsePayload(data) {
  return JSON.parse(dec.decode(data));
};

function PopUp() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps;

  var _useContext2 = useContext(RtmContext),
      popUpState = _useContext2.popUpState,
      setPopUpState = _useContext2.setPopUpState;

  var _ref = styleProps || {},
      popUpContainer = _ref.popUpContainer;

  var _useContext3 = useContext(RtcContext),
      dispatch = _useContext3.dispatch,
      localVideoTrack = _useContext3.localVideoTrack,
      localAudioTrack = _useContext3.localAudioTrack;

  var local = useContext(LocalContext);
  return popUpState !== popUpStateEnum.closed ? React.createElement("div", {
    style: _extends({}, styles$2.container, popUpContainer)
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
    onClick: function onClick() {
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
    style: styles$2.button
  }, "Confirm"), React.createElement("div", {
    style: styles$2.buttonClose,
    onClick: function onClick() {
      return setPopUpState(popUpStateEnum.closed);
    }
  }, "Close"))) : null;
}

var styles$2 = {
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

var AgoraUIKit = function AgoraUIKit(props) {
  var styleProps = props.styleProps,
      rtcProps = props.rtcProps;

  var _ref = styleProps || {},
      UIKitContainer = _ref.UIKitContainer;

  return React.createElement(PropsProvider, {
    value: props
  }, React.createElement("div", {
    style: _extends({}, style$1, UIKitContainer)
  }, rtcProps.role === 'audience' ? React.createElement(VideocallUI, null) : React.createElement(TracksConfigure, null, React.createElement(VideocallUI, null))));
};

var VideocallUI = function VideocallUI() {
  var _useContext = useContext(PropsContext),
      rtcProps = _useContext.rtcProps;

  return React.createElement(RtcConfigure, {
    callActive: rtcProps.callActive
  }, React.createElement(LocalUserContext, null, rtcProps.disableRtm ? React.createElement(React.Fragment, null, (rtcProps === null || rtcProps === void 0 ? void 0 : rtcProps.layout) === layout.grid ? React.createElement(GridVideo, null) : React.createElement(PinnedVideo, null), React.createElement(LocalControls, null)) : React.createElement(RtmConfigure, null, React.createElement(PopUp, null), (rtcProps === null || rtcProps === void 0 ? void 0 : rtcProps.layout) === layout.grid ? React.createElement(GridVideo, null) : React.createElement(PinnedVideo, null), React.createElement(LocalControls, null))));
};
var style$1 = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  flexDirection: 'column'
};

function EndCall() {
  var _useContext = useContext(PropsContext),
      styleProps = _useContext.styleProps,
      callbacks = _useContext.callbacks;

  var _ref = styleProps || {},
      localBtnStyles = _ref.localBtnStyles;

  var _ref2 = localBtnStyles || {},
      endCall = _ref2.endCall;

  return React.createElement(BtnTemplate, {
    style: endCall || {
      backgroundColor: '#ef5588',
      borderColor: '#f00'
    },
    name: 'callEnd',
    onClick: function onClick() {
      return (callbacks === null || callbacks === void 0 ? void 0 : callbacks.EndCall) && callbacks.EndCall();
    }
  });
}

export default AgoraUIKit;
export { BtnTemplate, EndCall, GridVideo, LocalAudioMute, LocalControls, LocalUserContext, LocalVideoMute, MaxUidContext, MaxVideoView, MinUidContext, MinVideoView, PinnedVideo, PropsContext, RemoteAudioMute, PopUp as RemoteMutePopUp, RemoteVideoMute, RtcConfigure, RtcConsumer, RtcContext, RtcProvider, RtmConfigure, RtmConsumer, RtmContext, RtmProvider, SwapUser, TracksConfigure, TracksContext, VideoPlaceholder, VideocallUI, createRawMessage, icons, layout, muteAudio, muteVideo, mutingDevice, parsePayload, popUpStateEnum, rtmStatusEnum };
//# sourceMappingURL=index.modern.js.map
