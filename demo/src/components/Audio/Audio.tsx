import React, {
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useRef,
  useContext,
  isValidElement,
} from 'react';
import {
  SliderHandle,
  SliderInput,
  SliderInputProps,
  SliderTrack,
  SliderTrackHighlight,
} from '@reach/slider';
import { useId } from '@reach/auto-id';
import Hide from '@reach/visually-hidden';
import { StateMachine } from '@xstate/fsm';
import { useMachine } from '@xstate/react/lib/fsm';
import playerMachine, {
  ARMContext,
  ARMEventObject,
  ARMEvents,
  ARMStates,
} from './machine';

import '@reach/slider/styles.css';
import './Audio.css';

/**
 * TODO: A11y notes:
 *   - Outer group should be focused on click rather than indivudual components
 *       - When group is focused:
 *           - Up/Down/PageUp/PageDown controls volume
 *           - Left/Right/Home/End controls progress
 *           - Space/Enter toggle play
 *   - Individual components receive focus on keyboard interactions
 *   - Valuetext for volume and progress range elements
 */

////////////////////////////////////////////////////////////////////////////////
// Context

const ARCContext = createContext<ARCContextValue>({} as ARCContextValue);

export type ARCContextValue = {
  actions: StateMachine.ActionObject<ARMContext, ARMEventObject>[];
  changed: boolean | undefined;
  context: ARMContext;
  matches: <TSV extends any>(value: TSV) => any;
  send(event: ARMEventObject | ARMEvents): void;
  state: ARMStates;
  handleGroupFocus(): void;
  handleSeekStart(): void;
  handleSeekStop(value: number): void;
  handleVolumeChange(value: number): void;
  togglePlay(): void;
};

////////////////////////////////////////////////////////////////////////////////
// ARC

const Audio: React.FC<ARCAudioProps> = ({
  children,
  loop = false,
  src,
  preload,
  ...props
}) => {
  const [current, _send] = useMachine(playerMachine);
  const {
    context,
    context: {
      audio: audioElement,
      // currentTime,
    },
    value: state,
    actions,
    changed,
    matches,
  } = current;

  // Used for logging during development.
  function send(event: ARMEventObject | ARMEvents) {
    if (process.env.NODE_ENV === 'development') {
      console.group('SENDING TO MACHINE');
      console.log(`STATE: ${state}`);
      console.table({ event });
      console.groupEnd();
    }
    _send(event);
  }

  console.table({ actions });

  const groupRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const assignRef = useCallback((node: HTMLAudioElement) => {
    audioRef.current = node;
    send({ type: ARMEvents.SetAudioElement, audio: node });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(() => {
    send(state === ARMStates.Playing ? ARMEvents.Pause : ARMEvents.Play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleSeekStart = useCallback(() => {
    send({ type: ARMEvents.SeekStart });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGroupFocus = useCallback(() => {
    requestAnimationFrame(() => groupRef.current && groupRef.current.focus());
  }, []);

  const handleSeekStop = useCallback((value: number) => {
    send({ type: ARMEvents.SeekStop, time: value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAudioEnded() {
    send({ type: ARMEvents.Complete, loop });
  }

  function setCurrentTime() {
    if (audioElement != null && state !== ARMStates.Seeking) {
      send({
        type: ARMEvents.SetProgress,
        value: audioElement.currentTime,
      });
    }
  }

  function getDuration() {
    send({ type: ARMEvents.SetDuration });
  }

  const handleVolumeChange = useCallback((volume: number) => {
    send({ type: ARMEvents.SetVolume, volume });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ARCContext.Provider
      value={{
        actions,
        changed,
        context,
        handleGroupFocus,
        handleSeekStart,
        handleSeekStop,
        handleVolumeChange,
        matches,
        send,
        state: state as ARMStates,
        togglePlay,
      }}
    >
      <div
        role="group"
        tabIndex={0}
        ref={groupRef}
        data-audio-react=""
        {...props}
      >
        <div style={{ margin: 20 }}>STATE: {state}</div>
        {children}
        <audio
          ref={assignRef}
          hidden
          controls={false}
          preload={preload}
          src={src}
          onTimeUpdate={setCurrentTime}
          onLoadedMetadata={getDuration}
          onEnded={handleAudioEnded}
        />
      </div>
    </ARCContext.Provider>
  );
};

export interface ARCAudioProps extends Element<'div'> {
  loop?: boolean;
  src: string;
  preload?: string;
}

export default Audio;

////////////////////////////////////////////////////////////////////////////////
// AudioNextButton

export const AudioNextButton: React.FC<AudioNextButtonProps> = ({
  icon,
  onClick,
  ...props
}) => {
  function handleClick(event: any) {
    // GO TO NEXT TRACK
  }
  return (
    <MaybeIconButton
      {...props}
      data-audio-react-next-button=""
      icon={icon || <NextIcon />}
      label="Next Track"
      onClick={wrapEvent(onClick, handleClick)}
    />
  );
};

export interface AudioNextButtonProps extends MaybeIconButtonProps {}

////////////////////////////////////////////////////////////////////////////////
// AudioPlayButton

export const AudioPlayButton: React.FC<AudioPlayButtonProps> = ({
  icon,
  onClick,
  ...props
}) => {
  const { state, togglePlay } = useContext(ARCContext);
  let iconNode: JSX.Element;
  let label: string;
  let iconProps = { fill: 'currentColor' };

  switch (state) {
    case ARMStates.Playing:
      iconNode = <PauseIcon {...iconProps} />;
      label = 'Pause';
      break;
    case ARMStates.Idle:
    default:
      iconNode = <PlayIcon {...iconProps} />;
      label = 'Play';
      break;
  }

  return (
    <MaybeIconButton
      {...props}
      data-audio-react-play-button=""
      disabled={false} // TODO:
      icon={icon || iconNode}
      label={label}
      onClick={wrapEvent(onClick, togglePlay)}
    />
  );
};

export interface AudioPlayButtonProps extends MaybeIconButtonProps {}

////////////////////////////////////////////////////////////////////////////////
// AudioPrevButton

export const AudioPrevButton: React.FC<AudioPrevButtonProps> = ({
  icon,
  onClick,
  ...props
}) => {
  function handleClick(event: React.MouseEvent) {
    // GO BACK
  }

  return (
    <MaybeIconButton
      {...props}
      data-audio-react-prev-button=""
      icon={icon || <PrevIcon />}
      label="Previous Track"
      onClick={wrapEvent(onClick, handleClick)}
    />
  );
};

export interface AudioPrevButtonProps extends MaybeIconButtonProps {}

////////////////////////////////////////////////////////////////////////////////
// AudioProgress

export const AudioProgressRange: React.FC<AudioProgressRangeProps> = ({
  onChange,
  onKeyDown,
  onKeyUp,
  onPointerUp,
  ...props
}) => {
  const {
    send,
    context: { duration, progressValue },
    handleGroupFocus,
    handleSeekStart,
    handleSeekStop,
  } = useContext(ARCContext);

  function isSeeking(key: string) {
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageDown':
      case 'PageUp':
      case 'ArrowRight':
      case 'ArrowLeft':
      case 'Home':
      case 'End':
        return true;
      default:
        return false;
    }
  }

  return (
    <SliderInput
      {...props}
      min={0}
      max={duration}
      data-audio-react-progress-range=""
      onKeyDown={wrapEvent(onKeyDown, event => {
        if (isSeeking(event.key)) {
          handleSeekStart();
        }
      })}
      onKeyUp={wrapEvent(onKeyUp, event => {
        if (isSeeking(event.key)) {
          handleSeekStop(progressValue);
        }
      })}
      onChange={newValue => {
        onChange && onChange(newValue);
        /*
        TODO: This was patching some weird bugs, may need to test if we run into
              weirdness while seeking again
        if (audio && !audio.paused) {
          audio.pause();
        }
        */
        send({ type: ARMEvents.SetProgress, value: newValue });
      }}
      onPointerDown={() => {
        handleGroupFocus();
        handleSeekStart();
      }}
      onPointerUp={wrapEvent(onPointerUp, () => {
        handleSeekStop(progressValue);
      })}
      value={progressValue}
    >
      <SliderTrack>
        <SliderTrackHighlight />
        <SliderHandle />
      </SliderTrack>
    </SliderInput>
  );
};

// TODO: Remove Omit hack after reach is updated
export interface AudioProgressRangeProps
  extends Omit<
    SliderInputProps,
    | 'children'
    | 'defaultValue'
    | 'disabled'
    | 'getValueText'
    | 'max'
    | 'min'
    | 'name'
    | 'ref'
    | 'step'
    | 'value'
  > {}

////////////////////////////////////////////////////////////////////////////////
// AudioTimeCurrent TODO: Format options

const AudioTimeStamp: React.FC<AudioTimeStampProps> = ({
  time = 0,
  format = formatTime,
  ...props
}) => {
  return <span {...props}>{format(time)}</span>;
};

export interface AudioTimeStampProps extends Element<'span'> {
  format?(time: React.ReactText): string;
  time: React.ReactText;
}

////////////////////////////////////////////////////////////////////////////////
// AudioTimeCurrent

export const AudioTimeCurrent: React.FC<Omit<
  AudioTimeStampProps,
  'time'
>> = props => {
  const {
    context: { progressValue },
  } = useContext(ARCContext);
  return (
    <AudioTimeStamp
      {...props}
      data-audio-react-time-current=""
      time={progressValue}
    />
  );
};

////////////////////////////////////////////////////////////////////////////////
// AudioTimeDuration

export const AudioTimeDuration: React.FC<Omit<
  AudioTimeStampProps,
  'time'
>> = props => {
  const {
    context: { duration },
  } = useContext(ARCContext);
  return (
    <AudioTimeStamp
      {...props}
      data-audio-react-time-duration=""
      time={duration}
    />
  );
};

////////////////////////////////////////////////////////////////////////////////
// AudioTime

export const AudioTime: React.FC<AudioTimeProps> = ({
  format,
  separator = '/',
  ...props
}) => {
  return (
    <span {...props} data-audio-react-time="">
      <AudioTimeCurrent format={format} /> {separator}{' '}
      <AudioTimeDuration format={format} />
    </span>
  );
};

export interface AudioTimeProps extends Element<'span'> {
  format?(time: React.ReactText): string;
  separator?: string;
}

////////////////////////////////////////////////////////////////////////////////
// AudioVolumeButton

export const AudioVolumeButton: React.FC<AudioVolumeButtonProps> = ({
  children,
  onClick,
  icon,
  ...props
}) => {
  const {
    send,
    context: { volume },
  } = useContext(ARCContext);

  function handleMute() {
    send({ type: ARMEvents.ToggleMute });
  }

  return (
    <MaybeIconButton
      {...props}
      data-audio-react-volume-button=""
      childrenArgs={[volume]}
      icon={icon || volume === 0 ? <VolumeIconMute /> : <VolumeIconLoud />}
      label={volume === 0 ? 'Unmute' : 'Mute'}
      onClick={wrapEvent(onClick, handleMute)}
    />
  );
};

export interface AudioVolumeButtonProps extends MaybeIconButtonProps {
  children?: React.ReactElement | ((volume?: number) => React.ReactNode);
  icon?: React.ReactElement | ((volume?: number) => React.ReactElement);
}

////////////////////////////////////////////////////////////////////////////////
// AudioVolumeRange

export const AudioVolumeRange: React.FC<AudioVolumeRangeProps> = ({
  onChange,
  onPointerDown,
  ...props
}) => {
  const {
    context: { volume },
    handleGroupFocus,
    handleVolumeChange,
  } = useContext(ARCContext);
  return (
    <SliderInput
      {...props}
      min={0}
      max={100}
      step={1}
      onChange={value => {
        onChange && onChange(value);
        handleVolumeChange(value);
      }}
      onPointerDown={wrapEvent(onPointerDown, handleGroupFocus)}
      value={volume}
    >
      <SliderTrack>
        <SliderTrackHighlight />
        <SliderHandle />
      </SliderTrack>
    </SliderInput>
  );
};

// TODO: Remove Omit hack after reach is updated
export interface AudioVolumeRangeProps
  extends Omit<
    SliderInputProps,
    | 'children'
    | 'defaultValue'
    | 'disabled'
    | 'getValueText'
    | 'max'
    | 'min'
    | 'name'
    | 'ref'
    | 'step'
    | 'value'
  > {}

////////////////////////////////////////////////////////////////////////////////
// Button

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  props,
  ref
) {
  return (
    <button
      {...props}
      data-audio-react-button=""
      ref={ref}
      type={props.type || 'button'}
    />
  );
});

interface ButtonProps extends Element<'button'> {}

////////////////////////////////////////////////////////////////////////////////
// Icon Button

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, icon, ...props }, ref) {
    return (
      <Button ref={ref} {...props}>
        {cloneElement(icon, {
          'aria-hidden': true,
          title: '',
        })}
        <Hide>{children}</Hide>
      </Button>
    );
  }
);

interface IconButtonProps extends ButtonProps {
  icon: JSX.Element;
}

////////////////////////////////////////////////////////////////////////////////
// MaybeIconButton

/*
This component repeats a common pattern for all of our buttons.
An app may choose to use the a button as is with our default rendered elements,
which show an icon alongside a visually hidden label for assistive tech.

However, if a button is composed with children, we render a plain button and
leave it up to the app developer to decide what is rendered inside.

e.g.

<AudioVolumeButton />

vs.

<AudioVolumeButton
  icon={volume => volume === 0 ? <LowVolIcon /> : <HighVolIcon />}
/>

vs.

<AudioVolumeButton>
  <Icon />
  Toggle Mute
</AudioVolumeButton>

vs.

<AudioVolumeButton>
  {(volume) => (
    <>
      {volume === 0 ? (
        <>
          <Hide>Un-mute volume</Hide>
          <LowVolIcon />
        </>
      ) : (
        <>
          <Hide>Mute volume</Hide>
          <HighVolIcon />
        </>
      )}
    </span>
  )}
</AudioVolumeButton>

*/

export const MaybeIconButton: React.FC<MaybeIconButtonProps> = ({
  children,
  childrenArgs = [],
  icon,
  label,
  ...props
}) => {
  return children != null ? (
    <Button {...props}>
      {typeof children === 'function' ? children(...childrenArgs) : children}
    </Button>
  ) : icon ? (
    <IconButton
      {...props}
      icon={isValidElement(icon) ? icon : icon(...childrenArgs)}
    >
      {label}
    </IconButton>
  ) : null;
};

export interface MaybeIconButtonProps<A extends any[] = any[]>
  extends ButtonProps {
  children?: React.ReactElement | ((...args: A) => React.ReactNode);
  childrenArgs?: A;
  icon?: React.ReactElement | ((...args: A) => React.ReactElement);
  label?: string;
}

////////////////////////////////////////////////////////////////////////////////
// SVG

const SVG: React.FC<SVGProps> = ({
  'aria-hidden': ariaHidden,
  children,
  title,
  titleId,
  ...props
}) => {
  let _titleId = `svg-${useId()}`;
  let ariaHide = ariaHidden === true || ariaHidden === 'true';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHide}
      aria-labelledby={!ariaHide ? titleId : undefined}
      role={!ariaHide ? 'img' : undefined}
      {...props}
    >
      {title && <title id={titleId || _titleId}>{title}</title>}
      {children}
    </svg>
  );
};

interface SVGProps extends Element<'svg'> {
  title: string;
  titleId?: string;
}

////////////////////////////////////////////////////////////////////////////////
// Icons

// > Play
export const PlayIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Play',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 29 40"
      title={title}
      {...props}
    >
      <polygon points="0,40 29,20 0,0 " />
    </SVG>
  );
};

// || Pause
export const PauseIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Pause',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 32 32"
      title={title}
      {...props}
    >
      <path d="M0 0 H12 V32 H0 z M20 0 H32 V32 H20 z" />
    </SVG>
  );
};

// |>| Next
export const NextIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Next',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 32 32"
      title={title}
      {...props}
    >
      <path d="M4 4 L24 14 V4 H28 V28 H24 V18 L4 28 z " />
    </SVG>
  );
};

// |<| Prev
export const PrevIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Previous',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 32 32"
      title={title}
      {...props}
    >
      <path d="M4 4 H8 V14 L28 4 V28 L8 18 V28 H4 z " />
    </SVG>
  );
};

// Download
export const DownloadIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Download',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 32 32"
      title={title}
      {...props}
    >
      <rect x="1" y="24" width="30" height="5" />
      <polygon points="32.05 3 16.02 20 0 3 32.05 3" />
    </SVG>
  );
};

// Loading
export const LoadingIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Loading',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 32 32"
      title={title}
      {...props}
    >
      <circle cx="5.5" cy="16" r="2.5" />
      <circle cx="26.5" cy="16" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
    </SVG>
  );
};

// Volume
export const VolumeIcon: React.FC<IconProps> = ({
  size = 20,
  title = 'Volume',
  ...props
}) => {
  return (
    <SVG
      width={size}
      height={size}
      viewBox="0 0 75 75"
      title={title}
      fill="currentColor"
      stroke="currentColor"
      {...props}
    >
      {props.children}
    </SVG>
  );
};

export const VolumeIconLoud = ({ title = 'Volume Loud', ...props }) => {
  return (
    <VolumeIcon title={title} {...props}>
      <polygon
        points="39.389,13.769 22.235,28.606 6,28.606 6,47.699 21.989,47.699 39.389,62.75 39.389,13.769"
        style={{ strokeWidth: 5, strokeLinejoin: 'round' }}
      />
      <path
        d="M 48.128,49.03 C 50.057,45.934 51.19,42.291 51.19,38.377 C 51.19,34.399 50.026,30.703 48.043,27.577"
        style={{ fill: 'none', strokeWidth: 5, strokeLinecap: 'round' }}
      />
      <path
        d="M 55.082,20.537 C 58.777,25.523 60.966,31.694 60.966,38.377 C 60.966,44.998 58.815,51.115 55.178,56.076"
        style={{ fill: 'none', strokeWidth: 5, strokeLinecap: 'round' }}
      />
      <path
        d="M 61.71,62.611 C 66.977,55.945 70.128,47.531 70.128,38.378 C 70.128,29.161 66.936,20.696 61.609,14.01"
        style={{ fill: 'none', strokeWidth: 5, strokeLinecap: 'round' }}
      />
    </VolumeIcon>
  );
};

export const VolumeIconMute = ({ title = 'Volume Mute', ...props }) => {
  return (
    <VolumeIcon title={title} {...props}>
      <polygon
        points="39.389,13.769 22.235,28.606 6,28.606 6,47.699 21.989,47.699 39.389,62.75 39.389,13.769"
        style={{
          stroke: 'currentColor',
          strokeWidth: 5,
          strokeLinejoin: 'round',
        }}
      />
      <path
        d="M 48.651772,50.269646 69.395223,25.971024"
        style={{ fill: 'none', strokeWidth: 5, strokeLinecap: 'round' }}
      />
      <path
        d="M 69.395223,50.269646 48.651772,25.971024"
        style={{ fill: 'none', strokeWidth: 5, strokeLinecap: 'round' }}
      />
    </VolumeIcon>
  );
};

export interface IconProps extends Partial<SVGProps> {
  size?: number;
}

////////////////////////////////////////////////////////////////////////////////
// Utilities

function formatTime(time: React.ReactText = 0, guide = time) {
  if (typeof time === 'string') {
    time = parseFloat(time);
  }
  if (typeof guide === 'string') {
    guide = parseFloat(guide);
  }
  let secs: number | string = Math.floor(time % 60);
  let mins: number | string = Math.floor((time / 60) % 60);
  let hours: number | string = Math.floor(time / 3600);
  const gm = Math.floor((guide / 60) % 60);
  const gh = Math.floor(guide / 3600);

  // handle invalid times
  if (isNaN(time) || time === Infinity) {
    hours = '-';
    mins = '-';
    secs = '-';
  }

  hours = hours > 0 || gh > 0 ? `${hours}:` : '';
  mins = `${(hours || gm >= 10) && mins < 10 ? `0${mins}` : mins}:`;
  secs = secs < 10 ? `0${secs}` : secs;

  return hours + mins + secs;
}

function wrapEvent<E extends React.SyntheticEvent = React.SyntheticEvent>(
  theirHandler: ((event: E) => any) | undefined,
  ourHandler: (event: E) => any
): (event: E) => any {
  return event => {
    theirHandler && theirHandler(event);
    if (!event.defaultPrevented) {
      return ourHandler(event);
    }
  };
}

type Element<T extends keyof JSX.IntrinsicElements> = React.PropsWithoutRef<
  JSX.IntrinsicElements[T]
>;
