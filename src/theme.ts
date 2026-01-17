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
    error: string | null | undefined,
    currentMB: number,
    threshold: number
): string => {
    if (!enabled) return AppColors.neutral;
    if (loading) return AppColors.neutral;
    if (error) return AppColors.danger;
    if (currentMB > threshold) return AppColors.danger;
    if (currentMB > threshold * 0.8) return AppColors.warning;
    return AppColors.success;
};

// Helper to generate shades from a hex color
export function shadeColor(color: string, percent: number) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;

    return (
        "#" +
        (
            0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)
        )
            .toString(16)
            .slice(1)
    );
}

export function generatePalette(base: string) {
    return [
        shadeColor(base, 0.9), // 0
        shadeColor(base, 0.75), // 1
        shadeColor(base, 0.6), // 2
        shadeColor(base, 0.45), // 3
        shadeColor(base, 0.3), // 4
        shadeColor(base, 0.15), // 5
        base, // 6 (Primary)
        shadeColor(base, -0.2), // 7
        shadeColor(base, -0.4), // 8
        shadeColor(base, -0.6), // 9
    ];
}
