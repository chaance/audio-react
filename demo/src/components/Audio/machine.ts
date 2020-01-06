import { assign, createMachine, StateMachine } from '@xstate/fsm';

////////////////////////////////////////////////////////////////////////////////
// Constants

export enum ARMStates {
  Idle = 'IDLE',
  Playing = 'PLAYING',
  Paused = 'PAUSED',
  Seeking = 'SEEKING',
  Error = 'ERROR',
}

export enum ARMEvents {
  Complete = 'COMPLETE',
  GetDataFromProps = 'GET_DATA_FROM_PROPS', // TODO:
  HandleTimeChange = 'HANDLE_TIME_CHANGE',
  Pause = 'PAUSE',
  Play = 'PLAY',
  PlayFromStart = 'PLAY_FROM_START',
  Reset = 'RESET',
  SeekStart = 'SEEK_START',
  SeekStop = 'SEEK_STOP',
  SetDuration = 'SET_DURATION',
  SetAudioElement = 'SET_AUDIO_ELEMENT',
  SetError = 'SET_ERROR',
  SetTime = 'SET_TIME',
  SetVolume = 'SET_VOLUME',
  SetProgress = 'SET_PROGRESS',
  Stall = 'STALL',
  Stop = 'STOP',
  ToggleLoop = 'TOGGLE_LOOP',
  ToggleMute = 'TOGGLE_MUTE',
}

////////////////////////////////////////////////////////////////////////////////
// Types

export type ARMStateProps = {
  loop: boolean;
  preload: boolean;
};

export type ARMAction = StateMachine.ActionObject<ARMContext, ARMEventObject>;

export type ARMContext = {
  currentTime: number; // TODO: Don't think we need this
  duration: number;
  audio: HTMLAudioElement | null;
  error: string | null;
  previouslyPlaying: boolean;
  preload: boolean;
  previousVolume: number;
  progressValue: number;
  loop: boolean;
  volume: number;
};

export type ARMEventObject =
  | { type: ARMEvents.GetDataFromProps; props: Partial<ARMStateProps> }
  | { type: ARMEvents.Complete; loop: boolean }
  | { type: ARMEvents.HandleTimeChange; time: number }
  | { type: ARMEvents.Pause }
  | { type: ARMEvents.Play }
  | { type: ARMEvents.PlayFromStart }
  | { type: ARMEvents.Reset }
  | { type: ARMEvents.SetAudioElement; audio: HTMLAudioElement }
  | { type: ARMEvents.SeekStart }
  | { type: ARMEvents.SeekStop; time: number }
  | { type: ARMEvents.SetDuration }
  | { type: ARMEvents.SetError; error: string }
  | { type: ARMEvents.SetProgress; value: number }
  | { type: ARMEvents.SetTime; time: number }
  | { type: ARMEvents.SetVolume; volume: number }
  | { type: ARMEvents.Stall }
  | { type: ARMEvents.Stop }
  | { type: ARMEvents.ToggleLoop }
  | { type: ARMEvents.ToggleMute };

export type ARMStateObject =
  | { value: ARMStates.Idle; context: ARMContext }
  | { value: ARMStates.Playing; context: ARMContext }
  | { value: ARMStates.Paused; context: ARMContext }
  | { value: ARMStates.Seeking; context: ARMContext }
  | { value: ARMStates.Error; context: ARMContext };

////////////////////////////////////////////////////////////////////////////////
// Actions

const playAudio: ARMAction = {
  type: 'playAudio',
  exec: context => {
    if (context.audio && context.audio.paused) {
      context.audio.play();
    }
  },
};

const pauseAudio: ARMAction = {
  type: 'pauseAudio',
  exec: context => {
    if (context.audio && !context.audio.paused) {
      context.audio.pause();
    }
  },
};

const resetTime: ARMAction = {
  type: 'resetTime',
  exec: context => {
    if (context.audio) {
      context.audio.currentTime = 0;
    }
  },
};

const setTime: ARMAction = {
  type: 'setTime',
  exec: (context, event: { type: ARMEvents; time?: number }) => {
    if (context.audio && event.time) {
      context.audio.currentTime = event.time;
    }
  },
};

const setDuration: ARMAction = assign((context: ARMContext) => {
  console.group('SETTING DURATION');
  console.log({ audio: context.audio });
  console.groupEnd();
  if (context.audio) {
    return {
      ...context,
      duration: context.audio.duration,
    };
  }
  return context;
});

const setProgress: ARMAction = assign(
  (context: ARMContext, event: { value?: number }) => {
    console.group('SETTING PROGRESS');
    console.log({ audio: context.audio });
    console.groupEnd();
    if (event.value) {
      return {
        ...context,
        progressValue: event.value,
      };
    }
    return context;
  }
);

const setVolume: ARMAction = assign(
  (context: ARMContext, event: { type: ARMEvents; volume?: number }) => {
    console.group('SETTING VOLUME');
    console.log({ volume: event.volume });
    console.groupEnd();
    const { audio, volume: previousVolume } = context;
    const { volume: newVolume } = event;
    if (audio && newVolume != null) {
      audio.volume = Math.max(Math.min(newVolume / 100, 1), 0);
      return {
        ...context,
        previousVolume,
        volume: newVolume,
      };
    }
    return context;
  }
);

const handleMute: ARMAction = assign((context: ARMContext) => {
  const { audio, previousVolume, volume } = context;
  const newVolume =
    volume === 0 ? (previousVolume >= 1 ? 100 : previousVolume) : 0;
  if (audio) {
    audio.volume = Math.max(Math.min(newVolume / 100, 1), 0);
    return {
      ...context,
      previousVolume: volume,
      volume: newVolume,
    };
  }
  return context;
});

const handleTimeChange: ARMAction = assign(
  (context: ARMContext, event: { type: ARMEvents; time?: number }) => {
    if (event.time != null) {
      return {
        ...context,
        currentTime: event.time,
      };
    }
    return context;
  }
);

const handleLoop: ARMAction = assign((context: ARMContext) => {
  return {
    ...context,
    loop: !context.loop,
  };
});

const getDataFromProps: ARMAction = assign(
  (
    context: ARMContext,
    event: {
      type: ARMEvents;
      props?: Partial<ARMStateProps>;
    }
  ) => ({ ...context, ...event.props } || context)
);

const setAudioElement: ARMAction = assign(
  (
    context: ARMContext,
    event: { type: ARMEvents; audio?: HTMLAudioElement }
  ) => {
    console.group('SETTING AUDIO ELEMENT');
    console.log({ audio: event.audio });
    console.groupEnd();
    if (context.audio && !context.audio.paused) {
      context.audio.pause();
    }

    if (event.audio) {
      return {
        ...context,
        previouslyPlaying: false,
        audio: event.audio,
      };
    }
    return context;
  }
);

////////////////////////////////////////////////////////////////////////////////
// State Machine Events

const commonNonErrorEvents = {
  [ARMEvents.SetAudioElement]: {
    // target: ARMStates.Idle,
    actions: setAudioElement,
  },
  [ARMEvents.SetDuration]: {
    actions: setDuration,
  },
  [ARMEvents.SetTime]: {
    actions: setTime,
  },
  [ARMEvents.HandleTimeChange]: {
    actions: handleTimeChange,
  },
  [ARMEvents.SetVolume]: {
    actions: setVolume,
  },
  [ARMEvents.ToggleMute]: {
    actions: handleMute,
  },
  [ARMEvents.ToggleLoop]: {
    actions: handleLoop,
  },
};

const commonEvents = {
  // TODO: React to any prop changes, a la getDerivedStateFromProps
  [ARMEvents.GetDataFromProps]: {
    actions: getDataFromProps,
  },
  // Should fire any time a ref is attached to a new DOM node
  [ARMEvents.SetAudioElement]: {
    // target: ARMStates.Idle,
    actions: setAudioElement,
  },
  [ARMEvents.Reset]: {
    target: ARMStates.Idle,
    actions: [resetTime, pauseAudio, assign({ previouslyPlaying: false })],
  },
  [ARMEvents.SetError]: {
    target: ARMStates.Error,
    actions: assign(
      (
        context: ARMContext,
        event: { type: ARMEvents.SetError; error: string }
      ): ARMContext => {
        return {
          ...context,
          previouslyPlaying: false,
          error: event.error,
        };
      }
    ),
  },
};

////////////////////////////////////////////////////////////////////////////////
// State Machine

const playerMachine = createMachine<ARMContext, ARMEventObject, ARMStateObject>(
  {
    id: 'player',
    initial: ARMStates.Idle,
    context: {
      audio: null,
      currentTime: 0,
      duration: 0,
      error: null,
      loop: false,
      preload: false,
      previouslyPlaying: false,
      previousVolume: 100,
      progressValue: 0,
      volume: 100,
    },
    states: {
      [ARMStates.Idle]: {
        on: {
          ...commonEvents,
          ...commonNonErrorEvents,
          [ARMEvents.Play]: ARMStates.Playing,
          [ARMEvents.SeekStart]: ARMStates.Seeking,
        },
        entry: [pauseAudio, resetTime],
      },
      [ARMStates.Playing]: {
        on: {
          ...commonEvents,
          ...commonNonErrorEvents,
          [ARMEvents.Pause]: ARMStates.Paused,
          [ARMEvents.SeekStart]: ARMStates.Seeking,
          [ARMEvents.SetProgress]: {
            target: ARMStates.Playing,
            actions: setProgress,
          },
          [ARMEvents.Complete]: [
            {
              target: ARMStates.Playing,
              cond: context => context.loop,
              actions: resetTime,
            },
            {
              target: ARMStates.Idle,
              actions: [
                pauseAudio,
                resetTime,
                assign({ previouslyPlaying: false }),
              ],
            },
          ],
        },
        entry: playAudio,
        exit: assign({ previouslyPlaying: true }),
      },
      [ARMStates.Paused]: {
        on: {
          ...commonEvents,
          ...commonNonErrorEvents,
          [ARMEvents.Play]: ARMStates.Playing,
          [ARMEvents.SeekStart]: ARMStates.Seeking,
        },
        entry: [pauseAudio],
        exit: assign({ previouslyPlaying: false }),
      },
      [ARMStates.Seeking]: {
        on: {
          ...commonEvents,
          ...commonNonErrorEvents,
          [ARMEvents.SetProgress]: {
            target: ARMStates.Seeking,
            actions: [pauseAudio, setProgress],
          },
          [ARMEvents.SeekStop]: [
            {
              target: ARMStates.Playing,
              cond: context => context.previouslyPlaying,
            },
            { target: ARMStates.Paused },
          ],
        },
        entry: pauseAudio,
        exit: setTime,
      },
      [ARMStates.Error]: {
        on: {
          ...commonEvents,
        },
        entry: assign({ previouslyPlaying: false }),
      },
    },
  }
);

export default playerMachine;
