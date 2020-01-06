import { useState, useEffect } from 'react';
import { StateMachine, EventObject, interpret } from '@xstate/fsm';
import useConstant from './useConstant';

export function useMachine<
  MachineContext,
  MachineEvent extends EventObject = EventObject
>(
  stateMachine: StateMachine.Machine<MachineContext, MachineEvent, any>
): [
  StateMachine.State<MachineContext, MachineEvent, any>,
  StateMachine.Service<MachineContext, MachineEvent>['send'],
  StateMachine.Service<MachineContext, MachineEvent>
] {
  const [initialMachine] = useState(stateMachine);
  if (process.env.NODE_ENV !== 'production') {
    if (stateMachine !== initialMachine) {
      throw new Error(
        'Machine given to `useMachine` has changed between renders. This is not supported and might lead to unexpected results.\n' +
          'Please make sure that you pass the same Machine as argument each time.'
      );
    }
  }

  const service = useConstant(() => interpret(stateMachine).start());
  const [current, setCurrent] = useState(stateMachine.initialState);

  useEffect(() => {
    service.subscribe(setCurrent);
    return () => {
      service.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [current, service.send, service];
}

export default useMachine;
