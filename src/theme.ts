export const AppColors = {
    primary: 'blue',
    secondary: 'gray',
    success: 'green',
    danger: 'red',
    warning: 'yellow',
    info: 'blue',
    neutral: 'gray',
    dimmed: 'dimmed',
};

export const DarkThemePalette = [
    '#f0f6fc', // Text Primary
    '#c9d1d9', // Text Secondary
    '#8b949e', // Text Muted
    '#484f58', // Disabled / Borders
    '#30363d', // Borders
    '#21262d', // Borders Strong / Surface Light
    '#161b22', // Surface Light
    '#0d1117', // Surface Default
    '#010409', // Canvas Default
    '#000000', // Canvas Dark
];

export const getStatusColor = (
    enabled: boolean,
    loading: boolean,
    error: boolean,
    isThresholdExceeded: boolean,
    isWarningExceeded: boolean
): string => {
    if (!enabled) return AppColors.secondary;
    if (loading) return AppColors.secondary;
    if (error) return AppColors.danger;
    if (isThresholdExceeded) return AppColors.danger;
    if (isWarningExceeded) return AppColors.warning;
    return AppColors.success;
};
