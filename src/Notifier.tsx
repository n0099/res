import { useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from './redux/hooks';
import _ from 'lodash';
import { clearSnackbar } from './redux/snackbars';

export default function Notifier(): null {
    const dispatch = useAppDispatch();
    const snackbar = useAppSelector(store => store.snackbars);
    const { enqueueSnackbar } = useSnackbar();
    const displayedRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        _.each(snackbar, ({ message, key, onExit, ...options }) => {
            const displayed = displayedRef.current;
            if (key !== undefined && displayed.has(key)) return;
            // https://github.com/reduxjs/redux/issues/1248
            enqueueSnackbar(<span>{message.split('\n').map((i, k) => <span key={k}>{i}<br /></span>)}</span>, {
                key,
                onExit: onExit ?? ((_n, k) => {
                    dispatch(clearSnackbar(Number(k)));
                    displayed.delete(Number(k));
                }),
                ...options
            });
            displayed.add(Number(key));
        });
    }, [snackbar, enqueueSnackbar, dispatch]);

    return null;
}
