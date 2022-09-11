import type { Theme } from '@material-ui/core';
import React from 'react';
import { Avatar, Box, Button, Grid, Link, Paper, Typography, createStyles, makeStyles } from '@material-ui/core';
import { ArrowDownwardRounded, FirstPageRounded, GetAppRounded, HistoryRounded, InsertDriveFileRounded, PlayForWorkRounded, ScheduleRounded, UpdateRounded, VerifiedUserRounded } from '@material-ui/icons';
import type { FileInfo } from './index.d';
import { AlignedIcon } from './AlignedIcon';
import { humanByte } from './humanByte';
import { Link as RouterLink } from 'react-router-dom';
import { RelativeTimeWithTooltipAndIcon, TextWithToolTipAndIcon, TooltipWrapper } from './Tooltip';
import { useAppDispatch } from './redux/hooks';
import { addDownloadTask } from './redux/downloadTasks';
import { getOneDriveDownloadUrl } from './api';
import _ from 'lodash';
import { gaDownloadOnedriveStart } from './gtag';

const useStyle = makeStyles((t: Theme) => createStyles({
    container: { padding: t.spacing(2) },
    parentPathLink: {
        borderBottom: `1px dashed ${t.palette.grey[300]}`,
        marginBottom: 10,
        paddingBottom: 6
    },
    fileName: { wordBreak: 'break-word' },
    fileIcon: { width: '1.25em', height: '1.25em' },
    fileIconAvatar: { marginRight: t.spacing(1), width: '2.5em', height: '2.5em' },
    fileInfoFlex: {
        marginTop: 12,
        gap: 10
    },
    fileInfoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        rowGap: 5,
        columnGap: 10,
        whiteSpace: 'nowrap'
    },
    fileInfoHashItem: {
        display: 'block',
        textAlign: 'right',
        marginBottom: 5,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    downloadButton: {
        marginTop: t.spacing(1),
        marginRight: t.spacing(2)
    }
}));

export default React.memo(({ className, file, parentPath }:
{ className?: string, file: FileInfo, parentPath: string }): JSX.Element => {
    console.log(['FileView', className, parentPath]);
    const style = useStyle();
    const dispatch = useAppDispatch();

    return <Paper className={className}>
        <Grid container className={style.container}>
            <Grid item xs className={style.parentPathLink}>
                <Link component={RouterLink} to={parentPath} underline="none">
                    <AlignedIcon><FirstPageRounded /></AlignedIcon>上一级 {parentPath === '/' ? '/' : _.trimEnd(parentPath, '/')}
                </Link>
            </Grid>
            <Grid container item wrap="nowrap">
                <Grid item>
                    <Avatar className={style.fileIconAvatar}><InsertDriveFileRounded className={style.fileIcon} /></Avatar>
                </Grid>
                <Grid item xs>
                    <Typography className={style.fileName} variant="h5" component="p">{file.name}</Typography>
                    <Box clone color="text.secondary">
                        <TooltipWrapper title={`文件大小：${file.size} 字节`}><Typography component="span">{humanByte(file.size)}</Typography></TooltipWrapper>
                    </Box>
                </Grid>
            </Grid>
            <Box clone color="text.secondary">
                <Grid container item justify="space-between" className={style.fileInfoFlex}>
                    <Grid item xs sm="auto" className={style.fileInfoGrid}>
                        <RelativeTimeWithTooltipAndIcon icon={<UpdateRounded />} timestamp={file.modificationTime} description="修改时间" />
                        <RelativeTimeWithTooltipAndIcon icon={<HistoryRounded />} timestamp={file.creationTime} description="创建时间" />
                        <TextWithToolTipAndIcon icon={<ArrowDownwardRounded />} text={String(file.downloadCount)} title="下载次数" />
                        <RelativeTimeWithTooltipAndIcon icon={<ScheduleRounded />} timestamp={file.lastDownloadTime} description="最后下载时间" />
                    </Grid>
                    <Grid item xs>
                        <div className={style.fileInfoHashItem}><TextWithToolTipAndIcon icon={<VerifiedUserRounded />} text={file.md5} title="MD5" /></div>
                        <div className={style.fileInfoHashItem}><TextWithToolTipAndIcon icon={<VerifiedUserRounded />} text={file.sha1} title="SHA1" /></div>
                    </Grid>
                </Grid>
            </Box>
            <Grid item xs={12}>
                {/* <Button className={style.downloadButton} startIcon={<PlayForWorkRounded />}
                    onClick={() => {
                        dispatch(addDownloadTask({ info: file, path: parentPath + file.name }));
                    }} variant="contained" color="secondary" size="large">网页内下载</Button> */}
                <Button className={style.downloadButton} startIcon={<GetAppRounded />}
                    onClick={async () => {
                        window.open(await getOneDriveDownloadUrl(parentPath + file.name));
                        gaDownloadOnedriveStart(parentPath + file.name);
                    }} variant="contained" color="primary" size="large">手动下载世纪互联</Button>
                {file.chaoxingDownloadUrl !== null && <Button className={style.downloadButton} startIcon={<GetAppRounded />}
                    href={file.chaoxingDownloadUrl} variant="contained" color="primary" size="large">手动下载超星网盘</Button>}
            </Grid>
        </Grid>
    </Paper>;
}, (prevProps, nextProps) =>
    prevProps.file === nextProps.file
    && prevProps.className === nextProps.className);
