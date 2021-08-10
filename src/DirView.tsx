import type { Theme } from '@material-ui/core';
import { Box, Grid, Hidden, List, ListItem, Paper, createStyles, makeStyles } from '@material-ui/core';
import { TooltipWrapper } from './Tooltip';
import React from 'react';
import { FolderOpenRounded, InsertDriveFileRounded, KeyboardCapslockRounded } from '@material-ui/icons';
import _ from 'lodash';
import type { DirInfo, FileInfo, SubDirInfo } from './index.d';
import { AlignedIcon, AlignedIconColumn } from './AlignedIcon';
import { timestampToLocaleDateTime, timestampToRelative } from './luxon';
import { Link as RouterLink } from 'react-router-dom';
import { humanByte } from './humanByte';

const useStyle = makeStyles((t: Theme) => createStyles({
    item: { flexWrap: 'wrap' },
    itemName: { wordBreak: 'break-word' },
    itemTextSecondary: {
        marginTop: 6,
        marginBottom: -8
    },
    iconColumn: { marginRight: t.spacing(1) }
}));

export default React.memo(({ className, dir, path, parentPath }:
{ className?: string, dir: DirInfo, path: string, parentPath: string | null }): JSX.Element => {
    console.log(['DirView', className, path, parentPath]);
    const style = useStyle();

    return <Paper className={className}>
        <List component="nav">
            {parentPath !== null && (
                <ListItem button component={RouterLink} to={parentPath}>
                    <Grid container alignItems="center">
                        <Grid item xs>
                            <span><AlignedIcon><KeyboardCapslockRounded /></AlignedIcon>上一级 {parentPath}</span>
                        </Grid>
                        <Grid item xs={2}>修改时间</Grid>
                        <Grid item xs={1}></Grid>
                        <Grid item xs={1}>大小</Grid>
                    </Grid>
                </ListItem>)}
            {_.map(dir.firstLevelSubDirs, (subDir: SubDirInfo) =>
                <ListItem button key={subDir.name} className={style.item} component={RouterLink} to={path + subDir.name}>
                    <Grid container alignItems="center">
                        <AlignedIconColumn className={style.iconColumn}><FolderOpenRounded /></AlignedIconColumn>
                        <Grid item xs className={style.itemName}>{subDir.name}</Grid>
                        <Hidden xsDown>
                            <TooltipWrapper title={<span>一级子目录数量：{subDir.subDirsCount}<br />子文件数量：{subDir.subFilesCount}</span>}>
                                <Grid item xs={false} sm={1}>{subDir.subDirsCount + subDir.subFilesCount}</Grid>
                            </TooltipWrapper>
                            <TooltipWrapper title={`子文件总大小：${subDir.subFilesSize} 字节`}>
                                <Grid item xs={false} sm={1}>{humanByte(subDir.subFilesSize)}</Grid>
                            </TooltipWrapper>
                        </Hidden>
                    </Grid>
                    <Hidden smUp>
                        <Box clone className={style.itemTextSecondary} fontSize="body2.fontSize" color="text.secondary">
                            <Grid container justify="space-between">
                                <Grid item>{humanByte(subDir.subFilesSize)}</Grid>
                                <Grid item>
                                    {`${subDir.subDirsCount}个一级子目录+${subDir.subFilesCount}个子文件=${subDir.subDirsCount + subDir.subFilesCount}个项`}
                                </Grid>
                            </Grid>
                        </Box>
                    </Hidden>
                </ListItem>)}
            {_.map(dir.subFiles, (file: FileInfo) =>
                <ListItem button key={file.name} className={style.item} component={RouterLink} to={path + file.name}>
                    <Grid container alignItems="center">
                        <AlignedIconColumn className={style.iconColumn}><InsertDriveFileRounded /></AlignedIconColumn>
                        <Grid item xs className={style.itemName}>{file.name}</Grid>
                        <Hidden xsDown>
                            <TooltipWrapper title={`修改时间：${timestampToLocaleDateTime(file.modificationTime)}`}>
                                <Grid item xs={2}>{timestampToRelative(file.modificationTime)}</Grid>
                            </TooltipWrapper>
                            <TooltipWrapper title="下载次数">
                                <Grid item xs={1}>{file.downloadCount}</Grid>
                            </TooltipWrapper>
                            <TooltipWrapper title={`文件大小：${file.size} 字节`}>
                                <Grid item xs={1}>{humanByte(file.size)}</Grid>
                            </TooltipWrapper>
                        </Hidden>
                    </Grid>
                    <Hidden smUp>
                        <Box clone className={style.itemTextSecondary} fontSize="body2.fontSize" color="text.secondary">
                            <Grid container justify="space-between">
                                <Grid item>{humanByte(file.size)}</Grid>
                                <Grid item>{file.downloadCount}次下载</Grid>
                                <Grid item>修改时间：{timestampToRelative(file.modificationTime)}</Grid>
                            </Grid>
                        </Box>
                    </Hidden>
                </ListItem>)}
        </List>
    </Paper>;
}, (prevProps, nextProps) =>
    prevProps.dir === nextProps.dir
    && prevProps.className === nextProps.className);
