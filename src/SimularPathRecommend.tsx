import { Grid, LinearProgress, List, ListItem, ListItemText, ListSubheader, Typography } from '@material-ui/core';
import { FolderOpenRounded, InsertDriveFileRounded } from '@material-ui/icons';
import _ from 'lodash';
import type { SimularPathRecommends } from './index.d';
import { AlignedIconColumn } from './AlignedIcon';
import { Link as RouterLink } from 'react-router-dom';
import type { ApiError } from './api';

export default function SimularPathRecommend({ error, recommends, showItemsNum = Infinity }:
{ error?: ApiError, recommends: SimularPathRecommends, showItemsNum?: number }): JSX.Element {
    return <List component="nav" aria-labelledby="simular-path-recommend-subheader"
        subheader={<ListSubheader disableSticky component="div" id="simular-path-recommend-subheader">相似路径推荐</ListSubheader>}>
        {error === undefined && _.isEmpty(recommends) && <LinearProgress color="secondary" />}
        {error !== undefined && <ListItem component={Typography}>加载相似路径推荐时失败：{error.error}</ListItem>}
        {_.map(_.take(recommends, showItemsNum), recommend =>
            <ListItem button key={recommend.path} component={RouterLink} to={recommend.path}>
                {recommend.type === 'dir' && (
                    <Grid container spacing={1} alignItems="center">
                        <AlignedIconColumn><FolderOpenRounded /></AlignedIconColumn>
                        <Grid item xs>
                            <ListItemText primary={recommend.path} />
                        </Grid>
                    </Grid>)}
                {recommend.type === 'file' && (
                    <Grid container spacing={1} alignItems="center">
                        <AlignedIconColumn><InsertDriveFileRounded /></AlignedIconColumn>
                        <Grid item xs>
                            <ListItemText primary={recommend.path.substr(recommend.path.lastIndexOf('/') + 1)}
                                secondary={recommend.path.substr(0, recommend.path.lastIndexOf('/'))} />
                        </Grid>
                    </Grid>)}
            </ListItem>)}
    </List>;
}
