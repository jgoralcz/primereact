import * as React from 'react';
import ReactDOM from 'react-dom';
import { useMountEffect, useUnmountEffect, useUpdateEffect } from '../hooks/Hooks';
import { DomHandler } from '../utils/Utils';
import { PortalBase } from './PortalBase';
import { PrimeReactContext } from '../api/context';

export const Portal = React.memo((inProps) => {
    const props = PortalBase.getProps(inProps);
    const { appendTo: _appendTo } = React.useContext(PrimeReactContext);

    const [mountedState, setMountedState] = React.useState(props.visible && DomHandler.hasDOM());

    useMountEffect(() => {
        if (DomHandler.hasDOM() && !mountedState) {
            setMountedState(true);
            props.onMounted && props.onMounted();
        }
    });

    useUpdateEffect(() => {
        props.onMounted && props.onMounted();
    }, [mountedState]);

    useUnmountEffect(() => {
        props.onUnmounted && props.onUnmounted();
    });

    const element = props.element || props.children;

    if (element && mountedState) {
        const appendTo = props.appendTo || _appendTo || document.body;

        return appendTo === 'self' ? element : ReactDOM.createPortal(element, appendTo);
    }

    return null;
});

Portal.displayName = 'Portal';
