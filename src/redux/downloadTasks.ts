import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { DownloadTask, DownloadTaskInitial, DownloadTaskUpdate } from '../index.d';

export const downloadTasksSlice = createSlice({
    name: 'downloadTask',
    initialState: [] as DownloadTask[],
    reducers: {
        addDownloadTask: (state, action: PayloadAction<DownloadTaskInitial>) => {
            state.push({
                ...action.payload,
                downloadSpeed: 0,
                etaBytes: action.payload.info.size,
                etaSeconds: 0
            });
        },
        updateDownloadTask: (state, action: PayloadAction<DownloadTaskUpdate>) => {
            state[action.payload.index] = {
                ...state[action.payload.index],
                ...action.payload.update
            };
        }
    }
});
export const { addDownloadTask, updateDownloadTask } = downloadTasksSlice.actions;
export default downloadTasksSlice.reducer;
