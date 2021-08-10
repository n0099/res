import filesize from 'filesize';

export const humanByte = filesize.partial({ standard: 'iec' });
