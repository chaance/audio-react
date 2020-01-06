import React, { forwardRef, cloneElement } from 'react';
import VH from '@reach/visually-hidden';
import { Element } from '../../lib/types';

export interface IconButtonProps extends Element<'button'> {
  icon: JSX.Element;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, icon, ...props }, ref) => {
    return (
      <button ref={ref} {...props} type={props.type || 'button'}>
        {cloneElement(icon, {
          'aria-hidden': true,
          title: '',
        })}
        <VH>{children}</VH>
      </button>
    );
  }
);

export default IconButton;
