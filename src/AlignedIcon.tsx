import type { Theme, WithStyles } from '@material-ui/core';
import { Grid, withStyles } from '@material-ui/core';
import type { ReactElement } from 'react';
import { cloneElement } from 'react';
import type { Styles } from '@material-ui/core/styles/withStyles';

export const AlignedIcon = withStyles({ icon: { verticalAlign: 'bottom' } })(
    (props: WithStyles<Styles<Theme, Record<string, unknown>, 'icon'>> & { children: ReactElement }) =>
        cloneElement(props.children, { className: props.classes.icon })
);
export const AlignedIconColumn = withStyles({ icon: { verticalAlign: 'text-bottom' } })(
    (props: WithStyles<Styles<Theme, Record<string, unknown>, 'icon'>> & { children: ReactElement, className?: string }) =>
        <Grid item className={props.className}><AlignedIcon>{props.children}</AlignedIcon></Grid>
);
