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
      // TODO: This does not appear to trigger ontimeupdate when the media is
      //       paused, so we need to revisit that approach.
      context.audio.currentTime = Math.max(
        Math.min(event.time, context.audio.duration),
        0
      );
    }
  },
};

const setDuration: ARMAction = assign((context: ARMContext) => {
  /*
  console.group('SETTING DURATION');
  console.log({ audio: context.audio });
  console.groupEnd();
  */
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
    /*
    console.group('SETTING PROGRESS');
    console.log({ audio: context.audio });
    console.groupEnd();
    */
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
    const { audio, volume: previousVolume } = context;
    const { volume } = event;
    if (audio && volume != null) {
      let newVolume = Math.max(Math.min(volume, 100), 0);
      audio.volume = newVolume / 100;
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
  const newVolume = Math.max(
    Math.min(
      volume === 0 ? (previousVolume <= 1 ? 100 : previousVolume) : 0,
      100
    ),
    0
  );
  if (audio) {
    audio.volume = newVolume / 100;
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

const setPreviouslyPlaying: ARMAction = assign({ previouslyPlaying: true });

const unsetPreviouslyPlaying: ARMAction = assign({ previouslyPlaying: false });

const setAudioElement: ARMAction = assign(
  (
    context: ARMContext,
    event: { type: ARMEvents; audio?: HTMLAudioElement }
  ) => {
    /*
    console.group('SETTING AUDIO ELEMENT');
    console.log({ audio: event.audio });
    console.groupEnd();
    */
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

// These events can be called in any state except for errors in which case audio
// is not available to be played.
const commonNonErrorEvents = {
  [ARMEvents.SetTime]: {
    actions: [setTime],
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
    target: ARMStates.Idle,
    actions: setAudioElement,
  },
  [ARMEvents.Reset]: {
    target: ARMStates.Idle,
    actions: [resetTime, pauseAudio, unsetPreviouslyPlaying],
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
          [ARMEvents.SetAudioElement]: {
            target: ARMStates.Idle,
            actions: setAudioElement,
          },
          [ARMEvents.SetDuration]: {
            // target: ARMStates.Idle,
            actions: setDuration,
          },
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
              actions: [pauseAudio, resetTime, unsetPreviouslyPlaying],
            },
          ],
        },
        entry: playAudio,
        exit: setPreviouslyPlaying,
      },
      [ARMStates.Paused]: {
        on: {
          ...commonEvents,
          ...commonNonErrorEvents,
          [ARMEvents.Play]: ARMStates.Playing,
          [ARMEvents.SeekStart]: ARMStates.Seeking,
        },
        entry: pauseAudio,
        exit: unsetPreviouslyPlaying,
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
        entry: unsetPreviouslyPlaying,
      },
    },
  }
);

export default playerMachine;
