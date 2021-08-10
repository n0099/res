import { useState } from 'react';
import { Box, Chip, IconButton, Paper, createStyles, makeStyles } from '@material-ui/core';
import { ExpandLessRounded, ExpandMoreRounded } from '@material-ui/icons';
import { getFullPathTiers, getFullPathTiersPath } from '.';
import _ from 'lodash';
import classnames from 'classnames';

const useStyle = makeStyles(() => createStyles({
    hidden: { display: 'none' }
}));

export default function PathFullTiers({ path }: { path: string }): JSX.Element {
    const style = useStyle();
    const [isShowing, setIsShowing] = useState(false);
    const fullPathTiers = getFullPathTiers(path);
    const fullPathTiersPath = getFullPathTiersPath(path);

    return <>
        <Box clone p={1}>
            <Paper className={classnames({ [style.hidden]: !isShowing })}>
                {_.map(fullPathTiers, i => <Chip label={i} />)}
            </Paper>
        </Box>
        <Box textAlign="center">
            <Box clone p={0} width="3em">
                <IconButton onClick={() => { setIsShowing(p => !p) }}>
                    {isShowing ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                </IconButton>
            </Box>
        </Box>
    </>;
}
