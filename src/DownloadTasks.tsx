import type { Theme } from '@material-ui/core';
import { Button, CircularProgress, Drawer, Fab, Grid, List, ListItem, Toolbar, createStyles, makeStyles } from '@material-ui/core';
import { ArrowForwardIosRounded, ExpandLessRounded, ExpandMoreRounded, InsertDriveFileRounded, MoveToInboxRounded } from '@material-ui/icons';
import _ from 'lodash';
import React, { Suspense, useEffect, useState } from 'react';
import type { DownloadStats, DownloadTask } from './index.d';
import { AlignedIconColumn } from './AlignedIcon';
import { humanByte } from './humanByte';
import { futureSecondsToRelative } from './luxon';
import { useAppDispatch, useAppSelector } from './redux/hooks';
import { updateDownloadTask } from './redux/downloadTasks';
import { enqueueSnackbar } from './redux/snackbars';
import { getOneDriveDownloadUrl } from './api';
import { gaPageView, gaScreenView } from './gtag';
import { download, download2, download3, extractZip } from './download';

const useStyle = makeStyles((t: Theme) => createStyles({
    fab: {
        position: 'fixed',
        right: 30,
        bottom: 30,
        zIndex: t.zIndex.drawer + 1
    },
    drawerPaper: {
        width: '80vw',
        minWidth: '300px',
        maxWidth: '1000px'
    }
}));

const DownloadTaskStats = React.lazy(async () => import('./DownloadTaskStats'));
function DownloadTaskListItem({ task, index }: { task: DownloadTask, index: number }): JSX.Element {
    const [stats, setStats] = useState<DownloadStats[]>([]);
    const [isShowStats, setIsShowStats] = useState(false);
    const [file, setFile] = useState<FileSystemFileHandle | null>(null);
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(enqueueSnackbar({
            message: `文件 ${task.info.name} 已开始下载\n请立即点击上方弹窗的保存\n右下角按钮可管理下载任务`,
            variant: 'warning',
            autoHideDuration: 5000
        }));
    }, [dispatch, task.info.name]);

    useEffect(() => {
        void (async () => {
            try {
                setFile(await download3(
                    { info: task.info, path: task.path },
                    await getOneDriveDownloadUrl(task.path),
                    s => {
                        setStats(p => [...p, s]);
                        // 1s moving average: downloadSpeed: Math.round(stats.fetchedBytes / ((Date.now() - stats.msTimestamp) / 1000)),
                        const downloadSpeed = s.fetchedBytes;
                        const etaBytes = task.info.size - s.fetchedBytesCumulative;
                        const etaSeconds = downloadSpeed === 0 ? 0 : etaBytes / downloadSpeed;
                        dispatch(updateDownloadTask({ index, update: { downloadSpeed, etaBytes, etaSeconds } }));
                    }
                ) ?? null);
            } catch (e: unknown) {
                console.log(e);
            }
        })();
    }, [dispatch, index, task.info, task.path]);

    return <>
        <ListItem button onClick={() => { setIsShowStats(p => !p) }}>
            <Grid container spacing={1} alignItems="center" justify="space-between">
                <AlignedIconColumn><InsertDriveFileRounded /></AlignedIconColumn>
                <Grid item xs="auto" sm>{task.info.name}</Grid>
                <Grid item>{humanByte(task.downloadSpeed)}/s</Grid>
                <Grid item>剩余 {humanByte(task.etaBytes)}</Grid>
                <Grid item>ETA {futureSecondsToRelative(task.etaSeconds)}</Grid>
                <AlignedIconColumn>{isShowStats ? <ExpandLessRounded /> : <ExpandMoreRounded />}</AlignedIconColumn>
            </Grid>
        </ListItem>
        {file !== null && <Button onClick={() => { void extractZip(file) }} variant="contained" color="secondary" size="large">在线解压</Button>}
        {isShowStats ? <Suspense fallback={<CircularProgress />}><DownloadTaskStats stats={stats} /></Suspense> : null }
    </>;
}

export default function DownloadTasks(): JSX.Element {
    const style = useStyle();
    const [showDrawer, setShowDrawer] = useState(false);
    const tasks = useAppSelector(store => store.downloadTasks);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1366px)');
    }, []);

    useEffect(() => {
        if (showDrawer) gaScreenView('downloadTasksDrawer');
        else gaPageView(); // sight will focus back on <MainView> after drawer gets hided
    }, [showDrawer]);

    return <>
        <Fab className={style.fab} onClick={() => { setShowDrawer(!showDrawer) }}
            color="secondary" aria-label="管理下载任务">
            {showDrawer ? <ArrowForwardIosRounded /> : <MoveToInboxRounded />}
        </Fab>
        <Drawer classes={{ paper: style.drawerPaper }} open={showDrawer} anchor="right" variant="persistent">
            <Toolbar />
            <List>
                {_.map(tasks, (task, key) => <DownloadTaskListItem key={key} task={task} index={key} />)}
            </List>
        </Drawer>
    </>;
}
