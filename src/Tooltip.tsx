import { Tooltip as MuiTooltip, Typography } from '@material-ui/core';
import type { ReactElement, ReactNode } from 'react';
import { AlignedIcon } from './AlignedIcon';
import { timestampToLocaleDateTime, timestampToRelative } from './luxon';

const Tooltip = ({ title, children }: { title: NonNullable<ReactNode>, children: ReactElement }): JSX.Element =>
    <MuiTooltip interactive enterTouchDelay={100} title={title}>{children}</MuiTooltip>;
export const TooltipWrapper = ({ title, children }: { title: NonNullable<ReactNode>, children: ReactElement }): JSX.Element =>
    <Tooltip title={title}>{children}</Tooltip>;
export const TextWithToolTipAndIcon = ({ icon, text, title, className }:
{ icon: ReactElement, text: string, title: NonNullable<ReactNode>, className?: string }): JSX.Element =>
    <Tooltip title={title}>
        <Typography className={className} component="span">
            <AlignedIcon>{icon}</AlignedIcon>{text}
        </Typography>
    </Tooltip>;
export const RelativeTimeWithTooltipAndIcon = ({ description, timestamp, icon }:
{ description: string, timestamp: number, icon: ReactElement }): JSX.Element =>
    <TextWithToolTipAndIcon icon={icon} text={timestampToRelative(timestamp)} title={`${description}：${timestampToLocaleDateTime(timestamp)}`} />;
