import { configureStore } from '@reduxjs/toolkit';
import snackbars from './snackbars';
import downloadTasks from './downloadTasks';

export const store = configureStore({ reducer: { snackbars, downloadTasks } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
