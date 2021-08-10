import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';
import type { OptionsObject } from 'notistack';

type SnackbarOptions = Omit<OptionsObject & { message: string, key?: number }, 'defaultValue'>;

export const snackbarsSlice = createSlice({
    name: 'snackbars',
    initialState: [] as SnackbarOptions[],
    reducers: {
        enqueueSnackbar: {
            reducer: (state, action: PayloadAction<SnackbarOptions>) => {
                state.push(action.payload);
            },
            prepare: (options: SnackbarOptions) => ({
                payload: {
                    key: _.random(0, 10000),
                    autoHideDuration: 2000,
                    ...options
                }
            })
        },
        clearSnackbar: (state, action: PayloadAction<number>) =>
            _.filter(state, i => i.key !== action.payload)
    }
});
export const { enqueueSnackbar, clearSnackbar } = snackbarsSlice.actions;
export default snackbarsSlice.reducer;
